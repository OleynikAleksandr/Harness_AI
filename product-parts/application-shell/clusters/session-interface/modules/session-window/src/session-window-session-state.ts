import { useCallback, useRef, useState } from "react";
import type {
  CoreSubagentCall,
  SessionCoreEvent,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
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
  activeWorkspaceId: string;
  detachedMode: DetachedSessionMode | null;
  initialSnapshot: SessionSnapshot;
}) {
  const { activeWorkspaceId, detachedMode, initialSnapshot } = options;
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
  const [subagentCallsBySession, setSubagentCallsBySession] = useState<
    Record<string, CoreSubagentCall[]>
  >({});
  const [rollbackSessionId, setRollbackSessionId] = useState<string | null>(
    null
  );
  const [runningSessionIds, setRunningSessionIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const sessionListWorkspaceIdRef = useRef(activeWorkspaceId);
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ??
    (detachedMode ? undefined : sessions[0]);
  const activeSessionDataId = activeSession?.id ?? activeSessionId;
  const messages = activeSession
    ? (messagesBySession[activeSessionDataId] ?? [])
    : [];
  const telemetry =
    telemetryBySession[activeSessionDataId] ?? initialSnapshot.telemetry;
  const subagentCalls = subagentCallsBySession[activeSessionDataId] ?? [];
  const runningSessionId = runningSessionIds.has(activeSessionDataId)
    ? activeSessionDataId
    : null;

  const applyEvent = useCallback((event: SessionCoreEvent) => {
    applyCoreEvent({
      event,
      setMessagesBySession,
      setRunningSessionIds,
      setSubagentCallsBySession,
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
      sessionListWorkspaceIdRef.current = workspaceId;
      const loaded = await listWorkspaceSessions(workspaceId);
      if (sessionListWorkspaceIdRef.current !== workspaceId) {
        return;
      }
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

  const refreshSessionList = useCallback(async (workspaceId: string) => {
    const loaded = await listWorkspaceSessions(workspaceId);
    if (sessionListWorkspaceIdRef.current !== workspaceId) {
      return;
    }
    setSessions(loaded ?? []);
  }, []);

  const addSession = useCallback((session: CoreSession) => {
    setSessions((current) => [
      session,
      ...current.filter((candidate) => candidate.id !== session.id),
    ]);
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

  const renameSession = useCallback(
    async (sessionId: string, title: string): Promise<string | null> => {
      const result = await window.harnessCore?.renameSession({
        sessionId,
        title,
      });
      if (!result) {
        return "Core runtime bridge is unavailable.";
      }
      if (!result.ok) {
        return result.error;
      }
      await refreshSessionList(activeWorkspaceId);
      return null;
    },
    [activeWorkspaceId, refreshSessionList]
  );

  const regenerateSessionTitle = useCallback(
    async (sessionId: string): Promise<string | null> => {
      const result = await window.harnessCore?.regenerateSessionTitle({
        sessionId,
      });
      if (!result) {
        return "Core runtime bridge is unavailable.";
      }
      if (!result.ok) {
        return result.error;
      }
      await refreshSessionList(activeWorkspaceId);
      return null;
    },
    [activeWorkspaceId, refreshSessionList]
  );

  return {
    activeSession,
    activeSessionId,
    addSession,
    appendNotice,
    applyEvent,
    hydrateSession,
    messages,
    regenerateSessionTitle,
    refreshSessionList,
    refreshSessions,
    renameSession,
    rollbackSessionId,
    runningSessionId,
    selectSession,
    sessions,
    setRollbackSessionId,
    subagentCalls,
    telemetry,
  };
}

/**
 * The Core session list of one workspace. Without a project (`""`) there is
 * nothing to list: Core would answer every session for an empty id.
 */
async function listWorkspaceSessions(workspaceId: string) {
  return workspaceId
    ? await window.harnessCore?.listSessions(workspaceId)
    : undefined;
}
