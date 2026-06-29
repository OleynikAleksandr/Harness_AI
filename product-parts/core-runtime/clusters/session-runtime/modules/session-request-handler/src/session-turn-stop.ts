import type {
  CoreSession,
  CoreSessionActionResult,
  ProviderRuntimeBinding,
} from "./session-request-handler-types.js";

interface TurnStopDeps {
  deleteBinding(sessionId: string): void;
  getBinding(sessionId: string): ProviderRuntimeBinding | undefined;
  getSession(sessionId: string): CoreSession | undefined;
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
    this.deps.publishIdle(sessionId);
    return { ok: true, session };
  }
}
