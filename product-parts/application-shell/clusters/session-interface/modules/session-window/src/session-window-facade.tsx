import { FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { InputControlsFacade } from "../../input-controls/src/input-controls-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import { SessionTelemetryFacade } from "../../session-telemetry/src/session-telemetry-facade.js";
import {
  type SessionMessage,
  type SessionTelemetry,
  sessionSnapshotProjectorFacade
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { settingsStoreFacade } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  type ProviderDescriptor,
  providerRegistryFacade
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import "./session-window.css";

interface SessionProviderSelection {
  model: string;
  providerId: ProviderDescriptor["id"];
  providerName: string;
}

export function SessionWindowFacade() {
  const initialSnapshot = useMemo(
    () => sessionSnapshotProjectorFacade.getSnapshot(),
    []
  );
  const providerOptions = useMemo(
    () => providerRegistryFacade.listProviders(),
    []
  );
  const [sessions, setSessions] = useState(initialSnapshot.sessions);
  const [activeSessionId, setActiveSessionId] = useState(
    initialSnapshot.activeSessionId
  );
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
  const [providerBySession, setProviderBySession] = useState<
    Record<string, SessionProviderSelection>
  >({});
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const messages = messagesBySession[activeSessionId] ?? [];
  const telemetry =
    telemetryBySession[activeSessionId] ?? initialSnapshot.telemetry;

  async function appendUserMessage(text: string) {
    const sessionId = activeSessionId;
    const provider = providerBySession[sessionId];
    const timestamp = new Date().toISOString();
    const userMessage: SessionMessage = {
      id: `local-${timestamp}`,
      role: "user",
      text,
      timestamp
    };
    const assistantMessage: SessionMessage = {
      id: `local-reply-${timestamp}`,
      role: "assistant",
      text: "Provider is thinking...",
      timestamp
    };
    setMessagesBySession((current) => ({
      ...current,
      [sessionId]: [
        ...(current[sessionId] ?? []),
        userMessage,
        assistantMessage
      ]
    }));
    setRunningSessionId(sessionId);
    setTelemetryBySession((current) => ({
      ...current,
      [sessionId]: {
        ...telemetry,
        status: "running",
        contextWindow: "Provider turn in progress"
      }
    }));

    const result = await runProviderTurn(provider, text);
    setMessagesBySession((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).map((message) =>
        message.id === assistantMessage.id
          ? { ...message, text: result.text }
          : message
      )
    }));
    setTelemetryBySession((current) => ({
      ...current,
      [sessionId]: {
        ...(current[sessionId] ?? telemetry),
        status: "idle",
        contextWindow: result.ok ? "Latest turn completed" : "Provider setup needed",
        limitState: result.ok ? "Ready" : "Needs settings"
      }
    }));
    setRunningSessionId((current) => (current === sessionId ? null : current));
  }

  function createSession(provider: ProviderDescriptor) {
    const model = settingsStoreFacade.getProviderModel(provider.id).selectedModel;
    const timestamp = new Date().toISOString();
    const session = {
      id: `session-${provider.id}-${Date.now()}`,
      title: `${provider.name} session`,
      workspaceId: initialSnapshot.workspace.id,
      updatedAt: timestamp
    };
    const startupMessage: SessionMessage = {
      id: `provider-${provider.id}-${Date.now()}`,
      role: "assistant",
      text: `${provider.name} session started with settings model ${model}. Provider execution is not connected yet.`,
      timestamp
    };
    setSessions((current) => [session, ...current]);
    setMessagesBySession((current) => ({
      ...current,
      [session.id]: [startupMessage]
    }));
    setTelemetryBySession((current) => ({
      ...current,
      [session.id]: {
        provider: provider.name,
        model,
        status: "idle",
        contextWindow: "Pending first provider turn",
        limitState: provider.status === "available" ? "Ready" : "Needs settings"
      }
    }));
    setProviderBySession((current) => ({
      ...current,
      [session.id]: {
        model,
        providerId: provider.id,
        providerName: provider.name
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
            <h1>{activeSession?.title ?? "Session"}</h1>
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
          {messages.map((message) => (
            <article className={`message-row ${message.role}`} key={message.id}>
              <div className="message-meta">{message.role}</div>
              <p>{message.text}</p>
            </article>
          ))}
        </section>

        <InputControlsFacade
          disabled={runningSessionId === activeSessionId}
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

async function runProviderTurn(
  provider: SessionProviderSelection | undefined,
  prompt: string
): Promise<HarnessProviderTurnResponse> {
  if (!provider) {
    return {
      ok: false,
      text: "Provider setup needed: create a provider session first."
    };
  }
  if (!window.harnessProviders) {
    return {
      ok: false,
      text: "Provider setup needed: Electron provider bridge is unavailable."
    };
  }
  try {
    return await window.harnessProviders.runTurn({
      model: provider.model,
      prompt,
      providerId: provider.providerId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      text: `Provider setup needed: ${provider.providerName} call failed: ${message}`
    };
  }
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
