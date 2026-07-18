import { useCallback, useEffect, useMemo, useState } from "react";
import type { SessionCoreEvent } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import { sessionSnapshotProjectorFacade } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { deriveTurnTiming } from "../../../../../../core-runtime/clusters/session-runtime/modules/turn-timing/src/turn-timing-facade.js";
import type { LocalizationRuntimePayload } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { BrowserLocalizationProvider } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ProviderSettingsUiFacade } from "../../../../settings-surface/modules/provider-settings-ui/src/settings-surface-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import {
  ActiveGrokInteractionPanel,
  useGrokInteractionState,
} from "./grok-interaction-panel.js";
import { ProviderPicker, resolveProviderModel } from "./provider-picker.js";
import {
  DialogPanel,
  ReferenceInputPanel,
  ReferenceStatusPanel,
  SessionIdPanel,
  SubagentSessionHeader,
} from "./reference-session-panels.js";
import { SessionProfileStep } from "./session-profile-step.js";
import { isProviderStatusEvent, noop } from "./session-window-core-events.js";
import { resolveDetachedSessionMode } from "./session-window-routing.js";
import { useSessionWindowSessionState } from "./session-window-session-state.js";
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
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [profileStepProvider, setProfileStepProvider] =
    useState<ProviderDescriptor | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSnapshot, setSettingsSnapshot] =
    useState<HarnessSettings | null>(null);
  const [localizationPayload, setLocalizationPayload] =
    useState<LocalizationRuntimePayload | null>(null);
  const [turnEventsBySession, setTurnEventsBySession] = useState<
    Record<string, SessionCoreEvent[]>
  >({});
  const grokInteractions = useGrokInteractionState();
  const {
    activeSession,
    activeSessionId,
    addSession: addSessionToState,
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
  } = useSessionWindowSessionState({
    activeWorkspaceId,
    detachedMode,
    initialSnapshot,
  });
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    initialSnapshot.workspace;
  const activeTimingSessionId = activeSession?.id ?? "";
  const turnTiming = useMemo(
    () =>
      deriveTurnTiming(
        turnEventsBySession[activeTimingSessionId] ?? [],
        activeTimingSessionId
      ),
    [turnEventsBySession, activeTimingSessionId]
  );
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
      grokInteractions.applyEvent(event);
      applyEvent(event);
      if (event.type === "session:turn-state") {
        setTurnEventsBySession((current) => ({
          ...current,
          [event.payload.sessionId]: mergeTurnEvents(
            current[event.payload.sessionId],
            [event]
          ),
        }));
      }
      if (
        event.type === "session:created" ||
        event.type === "session:updated"
      ) {
        refreshSessionList(activeWorkspaceId).catch(noop);
      }
    });
  }, [
    detachedMode,
    activeWorkspaceId,
    applyEvent,
    initialSnapshot.workspace,
    refreshLocalizationPayload,
    refreshSessionList,
    refreshSessions,
    refreshSettingsSnapshot,
    grokInteractions.applyEvent,
  ]);

  // Replays the persisted Core turn-state log into the journal on session
  // switch; merging keeps events already appended live.
  useEffect(() => {
    if (!activeTimingSessionId) {
      return;
    }
    window.harnessCore
      ?.getSessionEvents(activeTimingSessionId)
      .then((events) => {
        setTurnEventsBySession((current) => ({
          ...current,
          [activeTimingSessionId]: mergeTurnEvents(
            current[activeTimingSessionId],
            events ?? []
          ),
        }));
      })
      .catch(noop);
  }, [activeTimingSessionId]);

  function openProviderPicker() {
    setIsProviderPickerOpen(true);
    refreshSettingsSnapshot().catch(noop);
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
      appendNotice(activeSessionId, "Core runtime bridge is unavailable.");
      return;
    }
    if (!result.ok) {
      appendNotice(activeSessionId, result.error);
    }
  }

  async function stopActiveTurn(sessionId: string) {
    await window.harnessCore?.stopTurn(sessionId);
  }

  async function rollbackActiveSessionTurns(
    sessionId: string,
    preserveFirstUserTurns: number
  ) {
    setRollbackSessionId(sessionId);
    try {
      const result = await window.harnessCore?.rollbackSessionTurns({
        preserveFirstUserTurns,
        sessionId,
      });
      if (!result) {
        appendNotice(sessionId, "Core runtime bridge is unavailable.");
      } else if (result.ok) {
        await hydrateSession(sessionId);
        appendNotice(
          sessionId,
          `Rolled back ${activeSession?.providerName ?? "provider"} turns to the first ${preserveFirstUserTurns}-turn anchor.`
        );
      } else {
        appendNotice(sessionId, result.error);
      }
    } catch (error) {
      appendNotice(
        sessionId,
        error instanceof Error ? error.message : String(error)
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
    addSessionToState(session);
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
  const parentSession = activeSession?.parentSessionId
    ? sessions.find((session) => session.id === activeSession.parentSessionId)
    : undefined;
  const isSubagentSession = activeSession?.sessionKind === "subagent";
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
            onRegenerateSessionTitle={regenerateSessionTitle}
            onRenameSession={renameSession}
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
          <main
            className={
              isSubagentSession
                ? "session-reference-shell session-reference-shell--subagent"
                : "session-reference-shell"
            }
          >
            <SessionIdPanel session={activeSession} telemetry={telemetry} />
            {isSubagentSession ? (
              <SubagentSessionHeader
                onOpenParent={selectSession}
                parentSession={parentSession}
                session={activeSession}
              />
            ) : null}
            <DialogPanel
              messages={messages}
              providerId={activeSession.providerId}
              providerName={activeSession.providerName}
              sessions={sessions}
              subagentCalls={subagentCalls}
              workspaceRoot={activeWorkspace?.path}
            />
            {isSubagentSession ? null : (
              <ReferenceInputPanel
                disabled={runningSessionId === activeSession.id}
                onStop={() => stopActiveTurn(activeSession.id)}
                onSubmit={appendUserMessage}
                timing={{
                  activeMs: turnTiming.activeMs,
                  runningSince:
                    runningSessionId === activeSession.id
                      ? turnTiming.runningSince
                      : null,
                }}
              />
            )}
            <ReferenceStatusPanel
              onRollbackTurns={(preserveFirstUserTurns) =>
                rollbackActiveSessionTurns(
                  activeSession.id,
                  preserveFirstUserTurns
                )
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
        <ActiveGrokInteractionPanel
          sessionId={activeSession?.id}
          state={grokInteractions}
        />
      </div>
    </BrowserLocalizationProvider>
  );
}

// Merges replayed history with live-appended `session:turn-state` events:
// duplicates collapse and the result stays chronological for `deriveTurnTiming`.
function mergeTurnEvents(
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
