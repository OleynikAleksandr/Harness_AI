import { useCallback, useEffect, useMemo, useState } from "react";
import { coalesceLiveAssistantMessages } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/live-assistant-message-coalescer.js";
import type {
  CoreSessionMessage,
  SessionCoreEvent,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import {
  type SessionMessage,
  type SessionTelemetry,
  sessionSnapshotProjectorFacade,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { ProviderSettingsUiFacade } from "../../../../settings-surface/modules/provider-settings-ui/src/settings-surface-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import { NextSessionModePanel } from "./next-session-mode-panel.js";
import { getProviderModel, ProviderPicker } from "./provider-picker.js";
import {
  DialogPanel,
  ReferenceInputPanel,
  ReferenceStatusPanel,
  SessionIdPanel,
} from "./reference-session-panels.js";
import { resolveDetachedSessionMode } from "./session-window-routing.js";
import "./session-window.css";

export function SessionWindowFacade() {
  const initialSnapshot = useMemo(
    () => sessionSnapshotProjectorFacade.getSnapshot(),
    []
  );
  const detachedMode = useMemo(resolveDetachedSessionMode, []);
  const [providerOptions, setProviderOptions] = useState<ProviderDescriptor[]>(
    []
  );
  const [workspaces, setWorkspaces] = useState<HarnessWorkspace[]>([
    initialSnapshot.workspace,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    detachedMode?.workspaceId ?? initialSnapshot.workspace.id
  );
  const [sessions, setSessions] = useState<CoreSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState(
    detachedMode?.sessionId ?? ""
  );
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNextSessionModeOpen, setIsNextSessionModeOpen] = useState(false);
  const [settingsSnapshot, setSettingsSnapshot] =
    useState<HarnessSettings | null>(null);
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
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    initialSnapshot.workspace;
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ??
    (detachedMode ? undefined : sessions[0]);
  const activeSessionDataId = activeSession?.id ?? activeSessionId;
  const messages = activeSession
    ? (messagesBySession[activeSessionDataId] ?? [])
    : [];
  const telemetry =
    telemetryBySession[activeSessionDataId] ?? initialSnapshot.telemetry;

  const refreshSettingsSnapshot = useCallback(
    async (workspacePath?: string) => {
      const snapshot = await window.harnessCore?.getSettings(workspacePath);
      if (snapshot) {
        setSettingsSnapshot(snapshot);
      }
      return snapshot ?? null;
    },
    []
  );

  const hydrateSession = useCallback(async (sessionId: string) => {
    const events = await window.harnessCore?.getSessionEvents(sessionId);
    for (const event of events ?? []) {
      applyCoreEvent({
        event,
        setMessagesBySession,
        setRunningSessionId,
        setTelemetryBySession,
      });
    }
  }, []);

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

  useEffect(() => {
    window.harnessCore?.listProviders().then(setProviderOptions).catch(noop);
    window.harnessCore
      ?.listWorkspaces()
      .then((snapshot) => {
        setWorkspaces(snapshot.workspaces);
        const workspaceId =
          detachedMode?.workspaceId ?? snapshot.activeWorkspaceId;
        const workspace =
          snapshot.workspaces.find((item) => item.id === workspaceId) ??
          snapshot.workspaces[0] ??
          initialSnapshot.workspace;
        setActiveWorkspaceId(workspace.id);
        refreshSettingsSnapshot(workspace.path).catch(noop);
        refreshSessions(workspace.id, detachedMode?.sessionId).catch(noop);
      })
      .catch(noop);
    return window.harnessCore?.onEvent((event) => {
      applyCoreEvent({
        event,
        setMessagesBySession,
        setRunningSessionId,
        setTelemetryBySession,
      });
    });
  }, [
    detachedMode,
    initialSnapshot.workspace,
    refreshSessions,
    refreshSettingsSnapshot,
  ]);

  function openProviderPicker() {
    setIsProviderPickerOpen(true);
    refreshSettingsSnapshot().catch(noop);
  }

  function closeSettings() {
    setIsSettingsOpen(false);
    refreshSettingsSnapshot().catch(noop);
  }

  async function appendUserMessage(text: string) {
    const result = await window.harnessCore?.sendMessage({
      sessionId: activeSessionId,
      text,
    });
    if (!result) {
      appendAssistantNotice(
        activeSessionId,
        "Core runtime bridge is unavailable.",
        setMessagesBySession
      );
      return;
    }
    if (!result.ok) {
      appendAssistantNotice(
        activeSessionId,
        result.error,
        setMessagesBySession
      );
    }
  }

  async function createSession(provider: ProviderDescriptor) {
    const snapshot =
      settingsSnapshot ?? (await refreshSettingsSnapshot(activeWorkspace.path));
    const model = getProviderModel(provider.id, snapshot);
    const result = await window.harnessCore?.createSession({
      model,
      nextSessionMode: { invocationMode: "native", requestMode: "raw" },
      providerId: provider.id,
      providerName: provider.name,
      title: `${provider.name} session`,
      workspaceId: activeWorkspace.id,
      workspacePath: activeWorkspace.path,
    });
    if (!result) {
      return;
    }
    if (!result.ok) {
      return;
    }
    const session = result.session;
    setSessions((current) => [session, ...current]);
    setMessagesBySession((current) => ({
      ...current,
      [session.id]: [],
    }));
    setActiveSessionId(session.id);
    setIsProviderPickerOpen(false);
  }

  async function selectWorkspace(workspaceId: string) {
    if (detachedMode) {
      return;
    }
    const result = await window.harnessCore?.selectWorkspace(workspaceId);
    if (!result?.ok) {
      return;
    }
    setActiveWorkspaceId(result.workspace.id);
    setIsWorkspaceMenuOpen(false);
    await refreshSettingsSnapshot(result.workspace.path);
    await refreshSessions(result.workspace.id);
  }

  async function addWorkspace() {
    if (detachedMode) {
      return;
    }
    const result = await window.harnessCore?.pickWorkspaceFolder();
    if (!result?.ok) {
      return;
    }
    const snapshot = await window.harnessCore?.listWorkspaces();
    if (snapshot) {
      setWorkspaces(snapshot.workspaces);
    }
    setActiveWorkspaceId(result.workspace.id);
    setIsWorkspaceMenuOpen(false);
    await refreshSettingsSnapshot(result.workspace.path);
    await refreshSessions(result.workspace.id);
  }

  async function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    await hydrateSession(sessionId);
  }

  async function detachSession(sessionId: string) {
    await window.harnessShell?.detachSession({
      sessionId,
      workspaceId: activeWorkspace.id,
    });
  }
  async function deleteSession(sessionId: string) {
    if ((await window.harnessCore?.deleteSession(sessionId))?.ok) {
      await refreshSessions(activeWorkspace.id);
    }
  }
  return (
    <div
      className={
        detachedMode
          ? "harness-app-shell harness-app-shell--detached"
          : "harness-app-shell"
      }
    >
      {detachedMode ? null : (
        <SessionSidebarFacade
          activeSessionId={activeSession?.id ?? ""}
          isWorkspaceMenuOpen={isWorkspaceMenuOpen}
          onAddWorkspace={addWorkspace}
          onCreateSession={openProviderPicker}
          onDeleteSession={deleteSession}
          onDetachSession={detachSession}
          onOpenNextSessionMode={() => setIsNextSessionModeOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSelectSession={selectSession}
          onSelectWorkspace={selectWorkspace}
          onToggleWorkspaceMenu={() =>
            setIsWorkspaceMenuOpen((current) => !current)
          }
          sessions={sessions}
          workspace={activeWorkspace}
          workspaces={workspaces}
        />
      )}

      {activeSession ? (
        <main className="session-reference-shell">
          <SessionIdPanel session={activeSession} telemetry={telemetry} />
          <DialogPanel
            messages={messages}
            providerName={activeSession.providerName}
          />
          <ReferenceInputPanel
            disabled={runningSessionId === activeSession.id}
            onSubmit={appendUserMessage}
            session={activeSession}
          />
          <ReferenceStatusPanel
            session={activeSession}
            settings={settingsSnapshot}
            telemetry={telemetry}
          />
        </main>
      ) : (
        <main
          aria-label="Session workspace"
          className="session-empty-workspace"
        />
      )}

      {isProviderPickerOpen ? (
        <ProviderPicker
          onClose={() => setIsProviderPickerOpen(false)}
          onSelect={createSession}
          providers={providerOptions}
          settings={settingsSnapshot}
        />
      ) : null}

      <ProviderSettingsUiFacade
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        workspacePath={activeWorkspace.path}
      />

      {isNextSessionModeOpen ? (
        <NextSessionModePanel onClose={() => setIsNextSessionModeOpen(false)} />
      ) : null}
    </div>
  );
}

function applyCoreEvent(params: {
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
    appendSessionMessage(event.payload, setMessagesBySession);
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

function appendSessionMessage(
  message: CoreSessionMessage,
  setMessagesBySession: React.Dispatch<
    React.SetStateAction<Record<string, SessionMessage[]>>
  >
) {
  setMessagesBySession((current) => ({
    ...current,
    [message.sessionId]: coalesceLiveAssistantMessages(
      appendUniqueMessage(current[message.sessionId] ?? [], {
        id: message.id,
        role: message.role,
        ...(message.tag ? { tag: message.tag } : {}),
        text: message.text,
        timestamp: message.timestamp,
      })
    ),
  }));
}

function appendUniqueMessage(
  messages: SessionMessage[],
  message: SessionMessage
): SessionMessage[] {
  const existingIndex = messages.findIndex((item) => item.id === message.id);
  if (existingIndex === -1) {
    return [...messages, message];
  }
  return messages.map((item, index) =>
    index === existingIndex ? message : item
  );
}

function appendAssistantNotice(
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

function noop() {
  return undefined;
}
