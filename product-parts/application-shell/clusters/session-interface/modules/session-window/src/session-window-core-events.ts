import type { SessionCoreEvent } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type {
  SessionMessage,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
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

export function applyCoreEvent(params: {
  event: SessionCoreEvent;
  setMessagesBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionMessage[]>>
  >;
  setRunningSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setTelemetryBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionTelemetry>>
  >;
}) {
  const {
    event,
    setMessagesBySession,
    setRunningSessionId,
    setTelemetryBySession,
  } = params;
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
  if (event.type === "session:error") {
    appendAssistantNotice(
      event.payload.sessionId,
      `Provider setup needed: ${event.payload.error}`,
      setMessagesBySession
    );
    return;
  }
  if (event.type === "session:turn-state") {
    setRunningSessionId((current) => {
      if (event.payload.state === "running") {
        return event.payload.sessionId;
      }
      if (current === event.payload.sessionId) {
        return null;
      }
      return current;
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
