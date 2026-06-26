import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { InputControlsFacade } from "../../input-controls/src/input-controls-facade.js";
import { SessionSidebarFacade } from "../../session-sidebar/src/session-sidebar-facade.js";
import {
  type SessionMessage,
  sessionSnapshotProjectorFacade
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import "./session-window.css";

export function SessionWindowFacade() {
  const initialSnapshot = useMemo(
    () => sessionSnapshotProjectorFacade.getSnapshot(),
    []
  );
  const [messages, setMessages] = useState(initialSnapshot.messages);

  function appendUserMessage(text: string) {
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
      text: "Provider execution is not connected yet. This UI slice is ready for the next Core/provider wiring step.",
      timestamp
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
  }

  return (
    <div className="harness-app-shell">
      <SessionSidebarFacade
        activeSessionId={initialSnapshot.activeSessionId}
        sessions={initialSnapshot.sessions}
        workspace={initialSnapshot.workspace}
      />

      <main className="session-main">
        <header className="session-header">
          <div>
            <p className="session-kicker">Harness AI</p>
            <h1>{initialSnapshot.sessions[0]?.title ?? "Session"}</h1>
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

        <section className="telemetry-strip" aria-label="Session telemetry">
          <TelemetryItem label="Provider" value={initialSnapshot.telemetry.provider} />
          <TelemetryItem label="Model" value={initialSnapshot.telemetry.model} />
          <TelemetryItem label="Context" value={initialSnapshot.telemetry.contextWindow} />
          <TelemetryItem label="Limits" value={initialSnapshot.telemetry.limitState} />
        </section>

        <section className="message-stream" aria-label="Transcript">
          {messages.map((message) => (
            <article className={`message-row ${message.role}`} key={message.id}>
              <div className="message-meta">{message.role}</div>
              <p>{message.text}</p>
            </article>
          ))}
        </section>

        <InputControlsFacade onSubmit={appendUserMessage} />
      </main>
    </div>
  );
}

function TelemetryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="telemetry-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
