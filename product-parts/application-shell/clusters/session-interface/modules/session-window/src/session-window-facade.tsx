import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import {
  type SessionMessage,
  type SessionTelemetry,
  sessionSnapshotProjectorFacade,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { LocalizationRuntimePayload } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { BrowserLocalizationProvider } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ProviderSettingsUiFacade } from "../../../../settings-surface/modules/provider-settings-ui/src/settings-surface-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import { ProviderPicker, resolveProviderModel } from "./provider-picker.js";
import {
  DialogPanel,
  ReferenceInputPanel,
  ReferenceStatusPanel,
  SessionIdPanel,
} from "./reference-session-panels.js";
import { SessionProfileStep } from "./session-profile-step.js";
import {
  appendAssistantNotice,
  applyCoreEvent,
  isProviderStatusEvent,
  noop,
} from "./session-window-core-events.js";
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
  const [profileStepProvider, setProfileStepProvider] =
    useState<ProviderDescriptor | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSnapshot, setSettingsSnapshot] =
    useState<HarnessSettings | null>(null);
  const [localizationPayload, setLocalizationPayload] =
    useState<LocalizationRuntimePayload | null>(null);
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

  const refreshLocalizationPayload = useCallback(async () => {
    const payload = await window.harnessCore?.getLocalizationRuntimePayload();
    if (payload) {
      setLocalizationPayload(payload);
    }
  }, []);

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
        refreshLocalizationPayload().catch(noop);
        refreshSessions(workspace.id, detachedMode?.sessionId).catch(noop);
      })
      .catch(noop);
    return window.harnessCore?.onEvent((event) => {
      if (isProviderStatusEvent(event)) {
        if (event.payload.workspaceId !== activeWorkspaceId) {
          return;
        }
        setProviderOptions((current) =>
          current.map((provider) =>
            provider.id === event.payload.providerId
              ? {
                  ...provider,
                  readinessMessage: event.payload.readinessMessage,
                  readinessStatus: event.payload.readinessStatus,
                }
              : provider
          )
        );
        return;
      }
      applyCoreEvent({
        event,
        setMessagesBySession,
        setRunningSessionId,
        setTelemetryBySession,
      });
    });
  }, [
    detachedMode,
    activeWorkspaceId,
    initialSnapshot.workspace,
    refreshLocalizationPayload,
    refreshSessions,
    refreshSettingsSnapshot,
  ]);

  function openProviderPicker() {
    setIsProviderPickerOpen(true);
    refreshSettingsSnapshot().catch(noop);
    // Re-query the live Core catalog so the card reflects provider updates
    // (renames, Restart Core) instead of the list cached at startup.
    window.harnessCore?.listProviders().then(setProviderOptions).catch(noop);
  }

  function closeSettings() {
    setIsSettingsOpen(false);
    refreshSettingsSnapshot().catch(noop);
    refreshLocalizationPayload().catch(noop);
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

  async function stopActiveTurn(sessionId: string) {
    await window.harnessCore?.stopTurn(sessionId);
  }

  async function rollbackActiveSessionTurns(sessionId: string) {
    setRollbackSessionId(sessionId);
    try {
      const result = await window.harnessCore?.rollbackSessionTurns({
        preserveFirstUserTurns: 2,
        sessionId,
      });
      if (!result) {
        appendAssistantNotice(
          sessionId,
          "Core runtime bridge is unavailable.",
          setMessagesBySession
        );
      } else if (result.ok) {
        await hydrateSession(sessionId);
        appendAssistantNotice(
          sessionId,
          "Rolled back Codex turns to the first 2-turn anchor.",
          setMessagesBySession
        );
      } else {
        appendAssistantNotice(sessionId, result.error, setMessagesBySession);
      }
    } catch (error) {
      appendAssistantNotice(
        sessionId,
        error instanceof Error ? error.message : String(error),
        setMessagesBySession
      );
    } finally {
      setRollbackSessionId((current) =>
        current === sessionId ? null : current
      );
    }
  }

  function chooseProviderForNewSession(provider: ProviderDescriptor) {
    if (provider.readinessStatus !== "ready") {
      return;
    }
    // Wizard step 2: the profile choice is mandatory by flow structure; Core
    // still guarantees the Native fallback when no selection arrives.
    setIsProviderPickerOpen(false);
    setProfileStepProvider(provider);
  }

  async function createSession(
    provider: ProviderDescriptor,
    profileId: string
  ): Promise<string | null> {
    const snapshot =
      settingsSnapshot ?? (await refreshSettingsSnapshot(activeWorkspace.path));
    const model = resolveProviderModel(provider, snapshot);
    const result = await window.harnessCore?.createSession({
      model,
      nextSessionMode:
        profileId === "native"
          ? { invocationMode: "native", requestMode: "raw" }
          : {
              invocationMode: "managed",
              managedProfileId: profileId,
              managedProfileSelection: "user",
              requestMode: "raw",
            },
      providerId: provider.id,
      providerName: provider.name,
      title: `${provider.name} session`,
      workspaceId: activeWorkspace.id,
      workspacePath: activeWorkspace.path,
    });
    if (!result) {
      return "Core runtime bridge is unavailable.";
    }
    if (!result.ok) {
      return result.error;
    }
    const session = result.session;
    setSessions((current) => [session, ...current]);
    setMessagesBySession((current) => ({
      ...current,
      [session.id]: [],
    }));
    setActiveSessionId(session.id);
    setProfileStepProvider(null);
    return null;
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
    await refreshLocalizationPayload();
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
    await refreshLocalizationPayload();
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
  const shellClassName = detachedMode
    ? "harness-app-shell harness-app-shell--detached"
    : "harness-app-shell";
  return (
    <BrowserLocalizationProvider payload={localizationPayload}>
      <div className={shellClassName}>
        {detachedMode ? null : (
          <SessionSidebarFacade
            activeSessionId={activeSession?.id ?? ""}
            isWorkspaceMenuOpen={isWorkspaceMenuOpen}
            onAddWorkspace={addWorkspace}
            onCreateSession={openProviderPicker}
            onDeleteSession={deleteSession}
            onDetachSession={detachSession}
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
              providerId={activeSession.providerId}
              providerName={activeSession.providerName}
            />
            <ReferenceInputPanel
              disabled={runningSessionId === activeSession.id}
              onStop={() => stopActiveTurn(activeSession.id)}
              onSubmit={appendUserMessage}
              session={activeSession}
            />
            <ReferenceStatusPanel
              messages={messages}
              onRollbackTurns={() =>
                rollbackActiveSessionTurns(activeSession.id)
              }
              rollbackPending={rollbackSessionId === activeSession.id}
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

        {profileStepProvider ? (
          <SessionProfileStep
            onBack={() => {
              setProfileStepProvider(null);
              openProviderPicker();
            }}
            onClose={() => setProfileStepProvider(null)}
            onStart={(profileId) =>
              createSession(profileStepProvider, profileId)
            }
            provider={profileStepProvider}
          />
        ) : null}
        {isProviderPickerOpen ? (
          <ProviderPicker
            onClose={() => setIsProviderPickerOpen(false)}
            onSelect={chooseProviderForNewSession}
            providers={providerOptions}
            settings={settingsSnapshot}
          />
        ) : null}

        <ProviderSettingsUiFacade
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          onLocalizationRuntimeRefresh={refreshLocalizationPayload}
        />
      </div>
    </BrowserLocalizationProvider>
  );
}
