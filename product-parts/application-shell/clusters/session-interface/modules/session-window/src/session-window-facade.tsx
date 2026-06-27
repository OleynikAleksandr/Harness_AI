import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { ProviderSettingsUiFacade } from "../../../../settings-surface/modules/provider-settings-ui/src/settings-surface-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import {
  DialogPanel,
  ReferenceInputPanel,
  ReferenceStatusPanel,
  SessionIdPanel,
} from "./reference-session-panels.js";
import "./session-window.css";

export function SessionWindowFacade() {
  const initialSnapshot = useMemo(
    () => sessionSnapshotProjectorFacade.getSnapshot(),
    []
  );
  const [providerOptions, setProviderOptions] = useState<ProviderDescriptor[]>(
    []
  );
  const [sessions, setSessions] = useState<CoreSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeSessionDataId = activeSession?.id ?? activeSessionId;
  const messages = activeSession
    ? (messagesBySession[activeSessionDataId] ?? [])
    : [];
  const telemetry =
    telemetryBySession[activeSessionDataId] ?? initialSnapshot.telemetry;

  const refreshSettingsSnapshot = useCallback(async () => {
    const snapshot = await window.harnessCore?.getSettings();
    if (snapshot) {
      setSettingsSnapshot(snapshot);
    }
    return snapshot ?? null;
  }, []);

  useEffect(() => {
    window.harnessCore?.listProviders().then(setProviderOptions).catch(noop);
    refreshSettingsSnapshot().catch(noop);
    return window.harnessCore?.onEvent((event) => {
      applyCoreEvent({
        event,
        setMessagesBySession,
        setRunningSessionId,
        setTelemetryBySession,
      });
    });
  }, [refreshSettingsSnapshot]);

  function openProviderPicker() {
    setIsProviderPickerOpen(true);
    refreshSettingsSnapshot().catch(noop);
  }

  function closeSettings() {
    setIsSettingsOpen(false);
    refreshSettingsSnapshot().catch(noop);
  }

  async function appendUserMessage(text: string) {
    const sessionId = activeSessionId;
    const result = await window.harnessCore?.sendMessage({ sessionId, text });
    if (!result) {
      appendAssistantNotice(
        sessionId,
        "Core runtime bridge is unavailable.",
        setMessagesBySession
      );
      return;
    }
    if (!result.ok) {
      appendAssistantNotice(sessionId, result.error, setMessagesBySession);
    }
  }

  async function createSession(provider: ProviderDescriptor) {
    const snapshot = settingsSnapshot ?? (await refreshSettingsSnapshot());
    const model = getProviderModel(provider.id, snapshot);
    const result = await window.harnessCore?.createSession({
      model,
      providerId: provider.id,
      providerName: provider.name,
      title: `${provider.name} session`,
      workspaceId: initialSnapshot.workspace.id,
      workspacePath: initialSnapshot.workspace.path,
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
    setTelemetryBySession((current) => ({
      ...current,
      [session.id]: {
        provider: provider.name,
        model,
        status: "idle",
        contextWindow: "Core session ready",
        limitState: "Provider adapter pending",
      },
    }));
    setActiveSessionId(session.id);
    setIsProviderPickerOpen(false);
  }

  return (
    <div className="harness-app-shell">
      <SessionSidebarFacade
        activeSessionId={activeSession?.id ?? ""}
        onCreateSession={openProviderPicker}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSession={setActiveSessionId}
        sessions={sessions}
        workspace={initialSnapshot.workspace}
      />

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
        workspacePath={initialSnapshot.workspace.path}
      />
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
    setTelemetryBySession((current) => ({
      ...current,
      [event.payload.sessionId]: {
        ...(current[event.payload.sessionId] ??
          sessionSnapshotProjectorFacade.getSnapshot().telemetry),
        status: event.payload.state,
        contextWindow:
          event.payload.state === "running"
            ? "Core dispatch in progress"
            : "Core dispatch idle",
      },
    }));
    return;
  }
  if (event.type === "session:provider-binding") {
    let limitState = "Provider binding pending";
    if (event.payload.status === "ready") {
      limitState = "Provider ready";
    }
    if (event.payload.status === "failed") {
      limitState = "Provider adapter pending";
    }
    setTelemetryBySession((current) => ({
      ...current,
      [event.payload.sessionId]: {
        ...(current[event.payload.sessionId] ??
          sessionSnapshotProjectorFacade.getSnapshot().telemetry),
        limitState,
      },
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
    [message.sessionId]: [
      ...(current[message.sessionId] ?? []),
      {
        id: message.id,
        role: message.role,
        text: message.text,
        timestamp: message.timestamp,
      },
    ],
  }));
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

function ProviderPicker({
  onClose,
  onSelect,
  providers,
  settings,
}: {
  onClose: () => void;
  onSelect: (provider: ProviderDescriptor) => void;
  providers: ProviderDescriptor[];
  settings: HarnessSettings | null;
}) {
  return (
    <div className="provider-picker-backdrop">
      <section aria-label="Choose provider" className="provider-picker-card">
        <header className="provider-picker-header">
          <div>
            <p className="session-kicker">New session</p>
            <h2>Choose provider</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </header>

        <div className="provider-grid">
          {providers.map((provider) => {
            const model = getProviderModel(provider.id, settings);
            return (
              <button
                className="provider-card"
                key={provider.id}
                onClick={() => onSelect(provider)}
                type="button"
              >
                <strong>{provider.name}</strong>
                <span>{model}</span>
                <small>{provider.status}</small>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getProviderModel(
  providerId: ProviderDescriptor["id"],
  settings: HarnessSettings | null | undefined
): string {
  if (!settings) {
    return "cli-default";
  }
  switch (providerId) {
    case "claude":
      return settings.providers.claude.defaultModel;
    case "codex":
      return settings.providers.codex.defaultModel;
    case "kimi":
      return settings.providers.kimi.defaultModel;
    case "glm-native":
      return settings.providers.glmNative.defaultModel;
    case "glm-opencode":
      return settings.providers.glmOpenCode.defaultModel;
    case "openrouter":
      return settings.providers.openRouter.defaultModel;
    case "local-models":
      return settings.providers.localModels.defaultModel;
    default:
      return "cli-default";
  }
}

function noop() {
  return undefined;
}
