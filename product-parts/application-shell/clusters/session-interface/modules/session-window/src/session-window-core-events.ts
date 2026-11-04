import type {
  CoreSubagentCall,
  SessionCoreEvent,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type {
  SessionMessage,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import {
  appendSessionMessageToState,
  applySessionTranslationPatchToState,
} from "./translated-text-reveal.js";

export function isProviderStatusEvent(
  event: unknown
): event is ProviderStatusEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { type?: unknown }).type === "provider:status"
  );
}

/**
 * Project workflow events (`workflow:status`, `workflow:autopilot`,
 * `workflow:mode-choice`) belong to the project workflow UI, which
 * subscribes to them itself; the session state ignores them.
 */
export function isProjectWorkflowEvent(
  event: unknown
): event is
  | WorkflowAutopilotEvent
  | WorkflowModeChoiceEvent
  | WorkflowStatusEvent {
  const type =
    typeof event === "object" && event !== null
      ? (event as { type?: unknown }).type
      : undefined;
  return (
    type === "workflow:status" ||
    type === "workflow:autopilot" ||
    type === "workflow:mode-choice"
  );
}

export function applyCoreEvent(params: {
  event: SessionCoreEvent;
  setMessagesBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionMessage[]>>
  >;
  setRunningSessionIds: React.Dispatch<
    React.SetStateAction<ReadonlySet<string>>
  >;
  setSubagentCallsBySession?: React.Dispatch<
    React.SetStateAction<Record<string, CoreSubagentCall[]>>
  >;
  setTelemetryBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionTelemetry>>
  >;
}) {
  const {
    event,
    setMessagesBySession,
    setRunningSessionIds,
    setSubagentCallsBySession,
    setTelemetryBySession,
  } = params;
  if (event.type === "session:subagent-call") {
    setSubagentCallsBySession?.((current) =>
      upsertSubagentCallToState(current, event.payload)
    );
    return;
  }
  if (event.type === "session:message") {
    setMessagesBySession((current) =>
      appendSessionMessageToState(current, event.payload)
    );
    return;
  }
  if (event.type === "session:message_translation") {
    setMessagesBySession((current) =>
      applySessionTranslationPatchToState(current, event.payload)
    );
    return;
  }
  if (event.type === "session:messages-replaced") {
    setMessagesBySession((current) => ({
      ...current,
      [event.payload.sessionId]: event.payload.messages,
    }));
    return;
  }
  if (event.type === "session:error") {
    appendAssistantNotice(
      event.payload.sessionId,
      `Provider setup needed: ${event.payload.error}`,
      setMessagesBySession
    );
    return;
  }
  if (event.type === "session:turn-state") {
    setRunningSessionIds((current) => {
      const next = new Set(current);
      if (event.payload.state === "running") {
        next.add(event.payload.sessionId);
      } else {
        next.delete(event.payload.sessionId);
      }
      return next;
    });
    return;
  }
  if (event.type === "session:telemetry") {
    setTelemetryBySession((current) => ({
      ...current,
      [event.payload.sessionId]: event.payload.telemetry,
    }));
  }
}

export function upsertSubagentCallToState(
  current: Record<string, CoreSubagentCall[]>,
  call: CoreSubagentCall
): Record<string, CoreSubagentCall[]> {
  const calls = current[call.sessionId] ?? [];
  const existingIndex = calls.findIndex(
    (candidate) => candidate.id === call.id
  );
  const nextCalls = [...calls];
  if (existingIndex === -1) {
    nextCalls.push(call);
  } else {
    nextCalls[existingIndex] = call;
  }
  return { ...current, [call.sessionId]: nextCalls };
}

export function appendAssistantNotice(
  sessionId: string,
  text: string,
  setMessagesBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionMessage[]>>
  >
) {
  const timestamp = new Date().toISOString();
  setMessagesBySession((current) => ({
    ...current,
    [sessionId]: [
      ...(current[sessionId] ?? []),
      {
        id: `notice-${timestamp}`,
        role: "assistant",
        text,
        timestamp,
      },
    ],
  }));
}

export function noop() {
  return undefined;
}

// Applies a Core provider readiness update to the provider picker options.
export function withProviderStatus(
  providers: ProviderDescriptor[],
  payload: ProviderStatusEvent["payload"]
): ProviderDescriptor[] {
  return providers.map((provider) =>
    provider.id === payload.providerId
      ? {
          ...provider,
          readinessMessage: payload.readinessMessage,
          readinessStatus: payload.readinessStatus,
        }
      : provider
  );
}

// Merges replayed history with live-appended `session:turn-state` events:
// duplicates collapse and the result stays chronological for `deriveTurnTiming`.
export function mergeTurnEvents(
  existing: readonly SessionCoreEvent[] | undefined,
  incoming: readonly SessionCoreEvent[]
): SessionCoreEvent[] {
  const merged = [...(existing ?? [])];
  const seen = new Set(merged.map(turnEventKey));
  for (const event of incoming) {
    const key = turnEventKey(event);
    if (event.type === "session:turn-state" && !seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
  }
  return merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function turnEventKey(event: SessionCoreEvent): string {
  return event.type === "session:turn-state"
    ? `${event.payload.sessionId}|${event.payload.state}|${event.timestamp}`
    : `${event.type}|${event.timestamp}`;
}
