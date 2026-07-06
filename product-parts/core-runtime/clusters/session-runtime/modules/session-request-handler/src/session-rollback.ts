import type { ProviderUsageTelemetry } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
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
  getEvents(sessionId: string): SessionCoreEvent[];
  getMessages(sessionId: string): CoreSessionMessage[];
  getRuntimeBinding(sessionId: string): ProviderRuntimeBinding | undefined;
  getSession(sessionId: string): CoreSession | undefined;
  getTelemetryStatus(sessionId: string): string | undefined;
  publishError(sessionId: string, error: string): void;
  publishEvent(event: SessionCoreEvent): void;
  publishTurnState(sessionId: string, state: "idle" | "running"): void;
  restoreTelemetry(sessionId: string, telemetry: ProviderUsageTelemetry): void;
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
    const error = this.validate(session);
    if (error) {
      return { error, ok: false };
    }
    const projection = this.resolveProjection(session.id, request);
    if (!projection.ok) {
      return { error: projection.error, ok: false };
    }
    const binding = await this.resolveBinding(session);
    if (!binding?.adapter.rollbackSessionTurns) {
      return { error: "Codex rollback binding is unavailable", ok: false };
    }
    try {
      await binding.adapter.rollbackSessionTurns(
        binding.providerSessionId,
        projection.numTurns
      );
    } catch (caught) {
      const message = this.deps.stringifyError(caught);
      this.deps.publishError(session.id, message);
      return { error: message, ok: false };
    }
    const now = new Date().toISOString();
    this.deps.setMessages(session.id, projection.messages);
    this.deps.publishEvent({
      payload: { messages: projection.messages, sessionId: session.id },
      timestamp: now,
      type: "session:messages-replaced",
    });
    if (projection.telemetry) {
      this.deps.restoreTelemetry(session.id, {
        ...projection.telemetry,
        status: "idle",
        updatedAt: now,
      });
    }
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

  private resolveProjection(
    sessionId: string,
    request: RollbackCoreSessionRequest
  ):
    | {
        messages: CoreSessionMessage[];
        numTurns: number;
        ok: true;
        telemetry: ProviderUsageTelemetry | null;
      }
    | { error: string; ok: false } {
    const events = this.deps.getEvents(sessionId);
    const currentMessages =
      readCurrentMessagesFromEvents(events) || this.deps.getMessages(sessionId);
    const numTurns = resolveRollbackTurnCount(currentMessages, request);
    if (!isPositiveTurnCount(numTurns)) {
      return {
        error: "Rollback turn count must be a positive integer",
        ok: false,
      };
    }
    const messages = rollbackSessionMessages(currentMessages, numTurns);
    return {
      messages,
      numTurns,
      ok: true,
      telemetry: readAnchorTelemetrySnapshot(events, currentMessages, messages),
    };
  }

  private validate(session: CoreSession): string | null {
    if (!isCodexFamilyProvider(session.providerId)) {
      return "Rollback is only available for Codex-family sessions";
    }
    if (this.deps.getTelemetryStatus(session.id) === "running") {
      return "Cannot rollback while a turn is running";
    }
    return null;
  }
}

function isCodexFamilyProvider(providerId: string): boolean {
  return providerId === "codex" || providerId === "codex-uc";
}

function resolveRollbackTurnCount(
  messages: readonly CoreSessionMessage[],
  request: RollbackCoreSessionRequest
): number {
  if (request.numTurns !== undefined) {
    return request.numTurns;
  }
  if (request.preserveFirstUserTurns === undefined) {
    return 0;
  }
  const preservedTurns = request.preserveFirstUserTurns ?? 0;
  if (!Number.isSafeInteger(preservedTurns) || preservedTurns < 0) {
    return 0;
  }
  return countUserTurns(messages) - preservedTurns;
}

function countUserTurns(messages: readonly CoreSessionMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

function readCurrentMessagesFromEvents(
  events: readonly SessionCoreEvent[]
): CoreSessionMessage[] | null {
  if (events.length === 0) {
    return null;
  }
  let messages: CoreSessionMessage[] = [];
  for (const event of events) {
    if (event.type === "session:message") {
      messages = [...messages, event.payload];
    } else if (event.type === "session:messages-replaced") {
      messages = [...event.payload.messages];
    }
  }
  return messages;
}

function readAnchorTelemetrySnapshot(
  events: readonly SessionCoreEvent[],
  currentMessages: readonly CoreSessionMessage[],
  messages: readonly CoreSessionMessage[]
): ProviderUsageTelemetry | null {
  const droppedMessage = currentMessages[messages.length];
  const beforeTimestamp = droppedMessage?.timestamp;
  let telemetry: ProviderUsageTelemetry | null = null;
  for (const event of events) {
    if (event.type !== "session:telemetry") {
      continue;
    }
    if (beforeTimestamp && event.timestamp >= beforeTimestamp) {
      break;
    }
    telemetry = event.payload.telemetry;
  }
  return telemetry;
}
