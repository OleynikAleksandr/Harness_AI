import type { ProviderSubagentStatusEvent } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { collectSessionTreeIds } from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  CoreSessionActionResult,
  ProviderRuntimeBinding,
} from "./session-request-handler-types.js";

interface TurnStopDeps {
  deleteBinding(sessionId: string): void;
  getBinding(sessionId: string): ProviderRuntimeBinding | undefined;
  getSession(sessionId: string): CoreSession | undefined;
  interruptSubagentChild(
    childSessionId: string,
    event: ProviderSubagentStatusEvent
  ): void;
  listSessions(): CoreSession[];
  publishIdle(sessionId: string): void;
}

// Core-owned turn stop, matching the reference: close the provider session
// (which interrupts the in-flight turn — Claude `interrupt`, Kimi `cancel`),
// invalidate the runtime binding, and flip turn-state to idle. The persisted
// `providerSessionId` stays on the session so the next message resumes it.
export class SessionTurnStop {
  private readonly deps: TurnStopDeps;

  constructor(deps: TurnStopDeps) {
    this.deps = deps;
  }

  stop(sessionId: string): CoreSessionActionResult {
    const session = this.deps.getSession(sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const binding = this.deps.getBinding(sessionId);
    if (binding) {
      binding.unsubscribe();
      Promise.resolve(
        binding.adapter.closeSession(binding.providerSessionId)
      ).catch(() => undefined);
      this.deps.deleteBinding(sessionId);
    }
    this.interruptRunningChildren(sessionId);
    this.deps.publishIdle(sessionId);
    return { ok: true, session };
  }

  // Stopping a turn unsubscribes before the provider can deliver terminal
  // subagent events (proven live on Kimi: swarm cards stayed `running`
  // forever), so Core settles every still-running child in the stopped
  // session's tree as `interrupted` through the normal subagent lifecycle —
  // parent call snapshots recompute with the same rules as live events.
  private interruptRunningChildren(rootSessionId: string): void {
    const sessions = new Map(
      this.deps.listSessions().map((session) => [session.id, session])
    );
    const timestamp = new Date().toISOString();
    for (const sessionId of collectSessionTreeIds(sessions, rootSessionId)) {
      const session = sessions.get(sessionId);
      if (
        session?.sessionKind !== "subagent" ||
        !session.providerSessionId ||
        (session.subagentStatus !== "running" &&
          session.subagentStatus !== "pending")
      ) {
        continue;
      }
      this.deps.interruptSubagentChild(session.id, {
        providerSessionId: session.providerSessionId,
        status: "interrupted",
        timestamp,
        type: "subagent_status",
      });
    }
  }
}
