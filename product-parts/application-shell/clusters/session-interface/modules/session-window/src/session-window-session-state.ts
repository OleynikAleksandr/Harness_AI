import { useCallback, useState } from "react";
import type { SessionCoreEvent } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type {
  SessionMessage,
  SessionSnapshot,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import {
  appendAssistantNotice,
  applyCoreEvent,
} from "./session-window-core-events.js";
import type { DetachedSessionMode } from "./session-window-routing.js";

export function useSessionWindowSessionState(options: {
  detachedMode: DetachedSessionMode | null;
  initialSnapshot: SessionSnapshot;
}) {
  const { detachedMode, initialSnapshot } = options;
  const [sessions, setSessions] = useState<CoreSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState(
    detachedMode?.sessionId ?? ""
  );
  const [messagesBySession, setMessagesBySession] = useState<
    Record<string, SessionMessage[]>
  >({
    [initialSnapshot.activeSessionId]: initialSnapshot.messages,
  });
  const [telemetryBySession, setTelemetryBySession] = useState<
    Record<string, SessionTelemetry>
  >({
    [initialSnapshot.activeSessionId]: initialSnapshot.telemetry,
  });
  const [rollbackSessionId, setRollbackSessionId] = useState<string | null>(
    null
  );
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ??
    (detachedMode ? undefined : sessions[0]);
  const activeSessionDataId = activeSession?.id ?? activeSessionId;
  const messages = activeSession
    ? (messagesBySession[activeSessionDataId] ?? [])
    : [];
  const telemetry =
    telemetryBySession[activeSessionDataId] ?? initialSnapshot.telemetry;

  const applyEvent = useCallback((event: SessionCoreEvent) => {
    applyCoreEvent({
      event,
      setMessagesBySession,
      setRunningSessionId,
      setTelemetryBySession,
    });
  }, []);

  const hydrateSession = useCallback(
    async (sessionId: string) => {
      const events = await window.harnessCore?.getSessionEvents(sessionId);
      for (const event of events ?? []) {
        applyEvent(event);
      }
    },
    [applyEvent]
  );

  const refreshSessions = useCallback(
    async (workspaceId: string, preferredSessionId?: string) => {
      const loaded = await window.harnessCore?.listSessions(workspaceId);
      const nextSessions = loaded ?? [];
      setSessions(nextSessions);
      let nextActiveSessionId = nextSessions[0]?.id ?? "";
      if (
        preferredSessionId &&
        nextSessions.some((item) => item.id === preferredSessionId)
      ) {
        nextActiveSessionId = preferredSessionId;
      }
      setActiveSessionId(nextActiveSessionId);
      if (nextActiveSessionId) {
        await hydrateSession(nextActiveSessionId);
      }
    },
    [hydrateSession]
  );

  const addSession = useCallback((session: CoreSession) => {
    setSessions((current) => [session, ...current]);
    setMessagesBySession((current) => ({
      ...current,
      [session.id]: [],
    }));
    setActiveSessionId(session.id);
  }, []);

  const selectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      await hydrateSession(sessionId);
    },
    [hydrateSession]
  );

  const appendNotice = useCallback((sessionId: string, text: string) => {
    appendAssistantNotice(sessionId, text, setMessagesBySession);
  }, []);

  return {
    activeSession,
    activeSessionId,
    addSession,
    appendNotice,
    applyEvent,
    hydrateSession,
    messages,
    refreshSessions,
    rollbackSessionId,
    runningSessionId,
    selectSession,
    sessions,
    setRollbackSessionId,
    telemetry,
  };
}
