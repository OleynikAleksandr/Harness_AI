import type {
  CoreSessionMessage,
  SessionCoreEvent,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import type {
  CoreSession,
  CoreSessionActionResult,
  ProviderRuntimeBinding,
  RollbackCoreSessionRequest,
} from "./session-request-handler-types.js";

export function isPositiveTurnCount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function rollbackSessionMessages(
  messages: readonly CoreSessionMessage[],
  numTurns: number
): CoreSessionMessage[] {
  let remainingTurns = numTurns;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "user") {
      continue;
    }
    remainingTurns -= 1;
    if (remainingTurns === 0) {
      return messages.slice(0, index);
    }
  }
  return [];
}

export interface SessionRollbackDependencies {
  bindProviderSession(session: CoreSession): Promise<void>;
  getMessages(sessionId: string): CoreSessionMessage[];
  getRuntimeBinding(sessionId: string): ProviderRuntimeBinding | undefined;
  getSession(sessionId: string): CoreSession | undefined;
  getTelemetryStatus(sessionId: string): string | undefined;
  publishError(sessionId: string, error: string): void;
  publishEvent(event: SessionCoreEvent): void;
  publishTurnState(sessionId: string, state: "idle" | "running"): void;
  setMessages(sessionId: string, messages: CoreSessionMessage[]): void;
  stringifyError(error: unknown): string;
}

export class SessionRollback {
  private readonly deps: SessionRollbackDependencies;

  constructor(deps: SessionRollbackDependencies) {
    this.deps = deps;
  }

  async rollback(
    request: RollbackCoreSessionRequest
  ): Promise<CoreSessionActionResult> {
    const session = this.deps.getSession(request.sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const error = this.validate(session, request.numTurns);
    if (error) {
      return { error, ok: false };
    }
    const binding = await this.resolveBinding(session);
    if (!binding?.adapter.rollbackSessionTurns) {
      return { error: "Codex rollback binding is unavailable", ok: false };
    }
    try {
      await binding.adapter.rollbackSessionTurns(
        binding.providerSessionId,
        request.numTurns
      );
    } catch (caught) {
      const message = this.deps.stringifyError(caught);
      this.deps.publishError(session.id, message);
      return { error: message, ok: false };
    }
    const messages = rollbackSessionMessages(
      this.deps.getMessages(session.id),
      request.numTurns
    );
    this.deps.setMessages(session.id, messages);
    this.deps.publishEvent({
      payload: { messages, sessionId: session.id },
      timestamp: new Date().toISOString(),
      type: "session:messages-replaced",
    });
    this.deps.publishTurnState(session.id, "idle");
    return { ok: true, session };
  }

  private async resolveBinding(
    session: CoreSession
  ): Promise<ProviderRuntimeBinding | undefined> {
    let binding = this.deps.getRuntimeBinding(session.id);
    if (!binding) {
      await this.deps.bindProviderSession(session);
      binding = this.deps.getRuntimeBinding(session.id);
    }
    return binding;
  }

  private validate(session: CoreSession, numTurns: number): string | null {
    if (session.providerId !== "codex") {
      return "Rollback is only available for Codex sessions";
    }
    if (!isPositiveTurnCount(numTurns)) {
      return "Rollback turn count must be a positive integer";
    }
    if (this.deps.getTelemetryStatus(session.id) === "running") {
      return "Cannot rollback while a turn is running";
    }
    return null;
  }
}
