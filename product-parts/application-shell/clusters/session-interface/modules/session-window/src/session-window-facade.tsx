import { FileText, FolderPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InputControlsFacade } from "../../input-controls/src/input-controls-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import { SessionTelemetryFacade } from "../../session-telemetry/src/session-telemetry-facade.js";
import {
  type SessionMessage,
  type SessionTelemetry,
  sessionSnapshotProjectorFacade
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { CoreSessionMessage, SessionCoreEvent } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import { settingsStoreFacade } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { ProviderDescriptor } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import "./session-window.css";

export function SessionWindowFacade() {
  const initialSnapshot = useMemo(
    () => sessionSnapshotProjectorFacade.getSnapshot(),
    []
  );
  const [providerOptions, setProviderOptions] = useState<ProviderDescriptor[]>([]);
  const [sessions, setSessions] = useState(initialSnapshot.sessions.slice(0, 0));
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isProviderPickerOpen, setIsProviderPickerOpen] = useState(false);
  const [messagesBySession, setMessagesBySession] = useState<
    Record<string, SessionMessage[]>
  >({
    [initialSnapshot.activeSessionId]: initialSnapshot.messages
  });
  const [telemetryBySession, setTelemetryBySession] = useState<
    Record<string, SessionTelemetry>
  >({
    [initialSnapshot.activeSessionId]: initialSnapshot.telemetry
  });
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const messages = activeSession ? messagesBySession[activeSessionId] ?? [] : [];
  const telemetry =
    telemetryBySession[activeSessionId] ?? initialSnapshot.telemetry;

  useEffect(
    () => {
      void window.harnessCore?.listProviders().then(setProviderOptions);
      return window.harnessCore?.onEvent((event) => {
        applyCoreEvent({
          event,
          setMessagesBySession,
          setRunningSessionId,
          setTelemetryBySession
        });
      });
    },
    []
  );

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
    const model = settingsStoreFacade.getProviderModel(provider.id).selectedModel;
    const result = await window.harnessCore?.createSession({
      model,
      providerId: provider.id,
      providerName: provider.name,
      title: `${provider.name} session`,
      workspaceId: initialSnapshot.workspace.id,
      workspacePath: initialSnapshot.workspace.path
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
      [session.id]: []
    }));
    setTelemetryBySession((current) => ({
      ...current,
      [session.id]: {
        provider: provider.name,
        model,
        status: "idle",
        contextWindow: "Core session ready",
        limitState: "Provider adapter pending"
      }
    }));
    setActiveSessionId(session.id);
    setIsProviderPickerOpen(false);
  }

  return (
    <div className="harness-app-shell">
      <SessionSidebarFacade
        activeSessionId={activeSessionId}
        onCreateSession={() => setIsProviderPickerOpen(true)}
        onSelectSession={setActiveSessionId}
        sessions={sessions}
        workspace={initialSnapshot.workspace}
      />

      <main className="session-main">
        <header className="session-header">
          <div>
            <p className="session-kicker">Harness AI</p>
            <h1>{activeSession?.title ?? "Start a session"}</h1>
          </div>
          <a
            className="file-link-button"
            href="vscode://file//Users/oleksandroliinyk/VSCODE/harness-ai/README.md:1:1"
            rel="noreferrer"
            target="_blank"
            title="Open workspace"
          >
            <FileText size={16} aria-hidden="true" />
            <span>Workspace</span>
          </a>
        </header>

        <SessionTelemetryFacade telemetry={telemetry} />

        <section className="message-stream" aria-label="Transcript">
          {activeSession ? (
            messages.map((message) => (
              <article className={`message-row ${message.role}`} key={message.id}>
                <div className="message-meta">{message.role}</div>
                <p>{message.text}</p>
              </article>
            ))
          ) : (
            <EmptySessionStart onStart={() => setIsProviderPickerOpen(true)} />
          )}
        </section>

        <InputControlsFacade
          disabled={!activeSession || runningSessionId === activeSessionId}
          onSubmit={appendUserMessage}
        />
      </main>

      {isProviderPickerOpen ? (
        <ProviderPicker
          onClose={() => setIsProviderPickerOpen(false)}
          onSelect={createSession}
          providers={providerOptions}
        />
      ) : null}
    </div>
  );
}

function EmptySessionStart({ onStart }: { onStart: () => void }) {
  return (
    <div className="empty-session">
      <p className="session-kicker">No active session</p>
      <h2>Choose a provider to start</h2>
      <button className="start-session-button" onClick={onStart} type="button">
        <FolderPlus size={16} aria-hidden="true" />
        <span>Start session</span>
      </button>
    </div>
  );
}

function applyCoreEvent(params: {
  event: SessionCoreEvent;
  setMessagesBySession: React.Dispatch<React.SetStateAction<Record<string, SessionMessage[]>>>;
  setRunningSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setTelemetryBySession: React.Dispatch<React.SetStateAction<Record<string, SessionTelemetry>>>;
}) {
  const { event, setMessagesBySession, setRunningSessionId, setTelemetryBySession } =
    params;
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
    setRunningSessionId((current) =>
      event.payload.state === "running"
        ? event.payload.sessionId
        : current === event.payload.sessionId
          ? null
          : current
    );
    setTelemetryBySession((current) => ({
      ...current,
      [event.payload.sessionId]: {
        ...(current[event.payload.sessionId] ?? sessionSnapshotProjectorFacade.getSnapshot().telemetry),
        status: event.payload.state,
        contextWindow:
          event.payload.state === "running"
            ? "Core dispatch in progress"
            : "Core dispatch idle"
      }
    }));
    return;
  }
  if (event.type === "session:provider-binding") {
    setTelemetryBySession((current) => ({
      ...current,
      [event.payload.sessionId]: {
        ...(current[event.payload.sessionId] ?? sessionSnapshotProjectorFacade.getSnapshot().telemetry),
        limitState:
          event.payload.status === "ready"
            ? "Provider ready"
            : event.payload.status === "failed"
              ? "Provider adapter pending"
              : "Provider binding pending"
      }
    }));
  }
}

function appendSessionMessage(
  message: CoreSessionMessage,
  setMessagesBySession: React.Dispatch<React.SetStateAction<Record<string, SessionMessage[]>>>
) {
  const role = message.role === "user" ? "user" : "assistant";
  setMessagesBySession((current) => ({
    ...current,
    [message.sessionId]: [
      ...(current[message.sessionId] ?? []),
      {
        id: message.id,
        role,
        text: message.text,
        timestamp: message.timestamp
      }
    ]
  }));
}

function appendAssistantNotice(
  sessionId: string,
  text: string,
  setMessagesBySession: React.Dispatch<React.SetStateAction<Record<string, SessionMessage[]>>>
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
        timestamp
      }
    ]
  }));
}

function ProviderPicker({
  onClose,
  onSelect,
  providers
}: {
  onClose: () => void;
  onSelect: (provider: ProviderDescriptor) => void;
  providers: ProviderDescriptor[];
}) {
  return (
    <div className="provider-picker-backdrop">
      <section className="provider-picker-card" aria-label="Choose provider">
        <header className="provider-picker-header">
          <div>
            <p className="session-kicker">New session</p>
            <h2>Choose provider</h2>
          </div>
          <button className="icon-button" onClick={onClose} type="button" title="Close">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="provider-grid">
          {providers.map((provider) => {
            const model = settingsStoreFacade.getProviderModel(
              provider.id
            ).selectedModel;
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
