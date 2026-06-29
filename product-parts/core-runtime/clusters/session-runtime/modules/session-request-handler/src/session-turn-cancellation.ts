import type {
  CoreSession,
  CoreSessionActionResult,
  ProviderRuntimeBinding,
} from "./session-request-handler-types.js";

const TERMINAL_TURN_EVENTS = new Set([
  "turn_completed",
  "turn_failed",
  "stream_error",
]);

interface TurnCancellationDeps {
  getBinding(sessionId: string): ProviderRuntimeBinding | undefined;
  getSession(sessionId: string): CoreSession | undefined;
  publishIdle(sessionId: string): void;
  refreshUsageLimits(sessionId: string): void;
}

// Core-owned turn cancellation. Stop unlocks the input immediately and the
// session's late provider output is dropped until the next user message; the
// optional adapter `interruptTurn` hook stops the underlying process/transport.
export class SessionTurnCancellation {
  private readonly cancelled = new Set<string>();
  private readonly deps: TurnCancellationDeps;

  constructor(deps: TurnCancellationDeps) {
    this.deps = deps;
  }

  clear(sessionId: string): void {
    this.cancelled.delete(sessionId);
  }

  stop(sessionId: string): CoreSessionActionResult {
    const session = this.deps.getSession(sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    this.cancelled.add(sessionId);
    const binding = this.deps.getBinding(sessionId);
    Promise.resolve(
      binding?.adapter.interruptTurn?.(binding.providerSessionId)
    ).catch(() => undefined);
    this.deps.publishIdle(sessionId);
    return { ok: true, session };
  }

  // True when the event belongs to a cancelled turn and must be dropped. Clears
  // the flag on the turn's terminal event so the next turn streams normally.
  consume(sessionId: string, eventType: string): boolean {
    if (!this.cancelled.has(sessionId)) {
      return false;
    }
    if (TERMINAL_TURN_EVENTS.has(eventType)) {
      this.cancelled.delete(sessionId);
      this.deps.refreshUsageLimits(sessionId);
    }
    return true;
  }
}
