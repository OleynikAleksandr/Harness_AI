import { type CSSProperties, useEffect, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type {
  SessionMessage,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { SessionInputTextarea } from "./session-input-textarea.js";

export function SessionIdPanel({
  session,
  telemetry,
}: {
  session: CoreSession | undefined;
  telemetry: SessionTelemetry;
}) {
  const idLabel = resolveIdLabel(session, telemetry);
  return (
    <section
      aria-label="Session identifier"
      className="session-panel session-id-bar"
    >
      <span className="session-id-bar__id">{idLabel}</span>
      <div className="session-id-bar__limits">
        {telemetry.limitRows.map((row) => (
          <LimitRow key={row.label} row={row} />
        ))}
      </div>
    </section>
  );
}

export function DialogPanel({
  messages,
  providerName,
}: {
  messages: SessionMessage[];
  providerName: string | undefined;
}) {
  return (
    <section aria-label="Transcript" className="session-dialog session-panel">
      <div className="session-dialog__scroll">
        {messages.length === 0 ? (
          <p className="session-dialog__empty">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              providerName={providerName}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function ReferenceInputPanel({
  disabled,
  onSubmit,
  session,
}: {
  disabled: boolean;
  onSubmit: (text: string) => void | Promise<void>;
  session: CoreSession | undefined;
}) {
  const [draft, setDraft] = useState("");
  const canSubmit = draft.trim().length > 0 && !disabled;
  const waitCopy = disabled ? "Agent is working… Please wait." : null;
  const submit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit(draft.trim());
    setDraft("");
  };
  return (
    <form
      aria-label="Message input"
      className={
        waitCopy
          ? "session-input session-input--wait-copy session-panel"
          : "session-input session-panel"
      }
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="session-input__row">
        <SessionInputTextarea
          disabled={disabled}
          onSubmit={submit}
          onValueChange={setDraft}
          placeholder={
            waitCopy ?? "Type your request or drag files with Shift held..."
          }
          value={draft}
          waitCopy={draft.length === 0 ? waitCopy : null}
        />
        <button
          aria-label="Send message"
          className="session-input__send"
          disabled={!canSubmit}
          type="submit"
        >
          ▶
        </button>
      </div>
      <div className="session-input__footer">
        <span>Press Enter to send, Shift+Enter for a new line</span>
        <ElapsedTotal createdAt={session?.createdAt} />
      </div>
    </form>
  );
}

export function ReferenceStatusPanel({
  session,
  settings,
  telemetry,
}: {
  session: CoreSession | undefined;
  settings: HarnessSettings | null;
  telemetry: SessionTelemetry;
}) {
  const reasoning = resolveReasoningLabel(session, settings);
  return (
    <section className="session-status session-panel">
      <span className="session-status-chip session-status-chip--label">
        Модель:
      </span>
      <span className="session-status-button">{telemetry.model}</span>
      {reasoning ? (
        <span className="session-status-button session-status-button--compact">
          {reasoning}
        </span>
      ) : null}
      <span className="session-status-chip session-status-chip--limits">
        <span>Токены:</span>
        <strong title={telemetry.tokenDisplay.title}>
          {telemetry.tokenDisplay.value}
        </strong>
      </span>
    </section>
  );
}

function LimitRow({ row }: { row: SessionTelemetry["limitRows"][number] }) {
  return (
    <div className="session-id-bar__limit-row" title={row.resetLabel ?? ""}>
      <span className="session-id-bar__limit-label">{row.text}</span>
      <span
        className="session-id-bar__limit-bar"
        style={
          row.percentUsed === null
            ? undefined
            : ({
                "--limit-fill": `${row.percentUsed}%`,
              } as CSSProperties)
        }
      />
    </div>
  );
}

function resolveIdLabel(
  session: CoreSession | undefined,
  telemetry: SessionTelemetry
): string {
  if (telemetry.providerSessionId) {
    return `ID: ${shortenId(telemetry.providerSessionId)}-...`;
  }
  return session ? "ID: pending..." : "ID: unavailable";
}

function MessageBubble({
  message,
  providerName,
}: {
  message: SessionMessage;
  providerName: string | undefined;
}) {
  return (
    <article className={`session-message session-message--${message.role}`}>
      <header className="session-message__header">
        <span className="session-message__role">
          {resolveMessageRoleLabel(message.role, providerName)}
        </span>
        <span className="session-message__time">
          {formatMessageTime(message.timestamp)}
        </span>
      </header>
      <div className="session-message__content">{message.text}</div>
    </article>
  );
}

function ElapsedTotal({ createdAt }: { createdAt: string | undefined }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="session-input__total">
      total: {formatElapsed(createdAt, now)}
    </span>
  );
}

function resolveMessageRoleLabel(
  role: SessionMessage["role"],
  providerName: string | undefined
): string {
  if (role === "assistant") {
    return providerName ?? "Assistant";
  }
  if (role === "thinking") {
    return "Thinking";
  }
  return role === "system" ? "System" : "User";
}

function resolveReasoningLabel(
  session: CoreSession | undefined,
  settings: HarnessSettings | null
): string | null {
  if (!(session && settings)) {
    return null;
  }
  if (session.providerId === "codex") {
    return `(${settings.providers.codex.reasoningByModel[session.model] ?? "medium"})`;
  }
  if (session.providerId === "claude") {
    return settings.providers.claude.thinking.enabled
      ? `(${settings.providers.claude.thinking.effort})`
      : "(off)";
  }
  if (session.providerId === "openrouter") {
    return settings.providers.openRouter.endpointTag
      ? `(${settings.providers.openRouter.endpointTag})`
      : null;
  }
  return null;
}

function shortenId(id: string): string {
  return `${id.slice(0, 8)}...`;
}

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatElapsed(createdAt: string | undefined, now: number): string {
  if (!createdAt) {
    return "00h 00m 00s";
  }
  const startedAt = Date.parse(createdAt);
  if (!Number.isFinite(startedAt)) {
    return "00h 00m 00s";
  }
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
    2,
    "0"
  )}m ${String(seconds).padStart(2, "0")}s`;
}
