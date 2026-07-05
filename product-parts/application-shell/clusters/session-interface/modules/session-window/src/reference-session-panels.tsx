import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type {
  SessionMessage,
  SessionTelemetry,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { resolveCodexReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useSessionDialogAutoscroll } from "./session-dialog-autoscroll.js";
import { SessionInputTextarea } from "./session-input-textarea.js";
import {
  mergeThinkingMessagesForDisplay,
  resolveTranslatedDisplayText,
  useTranslatedTextReveal,
} from "./translated-text-reveal.js";

export function SessionIdPanel({
  session,
  telemetry,
}: {
  session: CoreSession | undefined;
  telemetry: SessionTelemetry;
}) {
  const { t } = useBrowserLocalization();
  const idLabel = resolveIdLabel(session, telemetry, t);
  return (
    <section
      aria-label={t("ui_labels", "session.identifier", "Session identifier")}
      className="session-panel session-id-bar"
    >
      <div className="session-id-bar__identity">
        <span className="session-id-bar__id">{idLabel}</span>
        <SessionProfileChip session={session} />
      </div>
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
  providerId,
  providerName,
}: {
  messages: SessionMessage[];
  providerId: string | undefined;
  providerName: string | undefined;
}) {
  const { t } = useBrowserLocalization();
  const displayMessages = useMemo(
    () => mergeThinkingMessagesForDisplay(messages),
    [messages]
  );
  const { onScroll, scrollContainerRef } =
    useSessionDialogAutoscroll(displayMessages);
  return (
    <section
      aria-label={t("ui_labels", "session.transcript", "Transcript")}
      className="session-dialog session-panel"
    >
      <div
        className="session-dialog__scroll"
        onScroll={onScroll}
        ref={scrollContainerRef}
      >
        {displayMessages.length === 0 ? (
          <p className="session-dialog__empty">
            {t(
              "messages_for_the_user",
              "session.noMessages",
              "No messages yet."
            )}
          </p>
        ) : (
          displayMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              providerId={providerId}
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
  onStop,
  onSubmit,
  session,
}: {
  disabled: boolean;
  onStop?: () => void;
  onSubmit: (text: string) => void | Promise<void>;
  session: CoreSession | undefined;
}) {
  const { t } = useBrowserLocalization();
  const [draft, setDraft] = useState("");
  const canSubmit = draft.trim().length > 0 && !disabled;
  const waitCopy = disabled
    ? t(
        "messages_for_the_user",
        "session.input.wait",
        "Agent is working... Please wait."
      )
    : null;
  const showStop = disabled && Boolean(onStop);
  const submit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit(draft.trim());
    setDraft("");
  };
  return (
    <form
      aria-label={t("ui_labels", "session.input", "Message input")}
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
            waitCopy ??
            t(
              "ui_helper_text",
              "session.input.placeholder",
              "Type your request or drag files with Shift held..."
            )
          }
          value={draft}
          waitCopy={draft.length === 0 ? waitCopy : null}
        />
        <div className="session-input__action">
          {showStop ? (
            <button
              aria-label={t(
                "ui_labels",
                "session.input.stop",
                "Stop current turn"
              )}
              className="session-input__action-button session-input__action-button--stop"
              onClick={() => onStop?.()}
              title={t("ui_labels", "session.input.stop", "Stop current turn")}
              type="button"
            >
              <span
                aria-hidden="true"
                className="session-input__action-icon session-input__action-icon--stop"
              />
            </button>
          ) : (
            <button
              aria-label={t("ui_labels", "session.input.send", "Send message")}
              className="session-input__action-button"
              disabled={!canSubmit}
              type="submit"
            >
              <span
                aria-hidden="true"
                className="session-input__action-icon session-input__action-icon--play"
              >
                ▶
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="session-input__footer">
        <span
          className="session-input__hint"
          style={disabled ? { visibility: "hidden" } : undefined}
        >
          {t(
            "ui_helper_text",
            "session.input.hint",
            "Press Enter to send, Shift+Enter for a new line"
          )}
        </span>
        <div className="session-input__footer-right">
          <ElapsedTotal createdAt={session?.createdAt} />
        </div>
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
  const { t } = useBrowserLocalization();
  const reasoning = resolveReasoningLabel(session, settings);
  return (
    <section className="session-status session-panel">
      <span className="session-status-chip session-status-chip--label">
        {t("ui_labels", "session.status.model", "Model:")}
      </span>
      <span className="session-status-button">{telemetry.model}</span>
      {reasoning ? (
        <span className="session-status-button session-status-button--compact">
          {reasoning}
        </span>
      ) : null}
      <span className="session-status-chip session-status-chip--limits">
        <span>{t("ui_labels", "session.status.tokens", "Tokens:")}</span>
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

// Applied session profile chip, driven strictly by the Core-owned applied
// profile snapshot; sessions persisted before profiles (no snapshot) show a
// legacy marker.
function SessionProfileChip({ session }: { session: CoreSession | undefined }) {
  if (!session) {
    return null;
  }
  const applied = session.appliedProfile;
  return (
    <span
      className={`session-profile-chip session-profile-chip--${applied?.kind ?? "legacy"}`}
      title={
        applied
          ? `Session profile: ${applied.profileName}`
          : "Created before session profiles"
      }
    >
      {applied?.profileName ?? "Legacy"}
    </span>
  );
}

function resolveIdLabel(
  session: CoreSession | undefined,
  telemetry: SessionTelemetry,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  if (telemetry.providerSessionId) {
    return `ID: ${shortenId(telemetry.providerSessionId)}-...`;
  }
  return session
    ? t("messages_for_the_user", "session.id.pending", "ID: pending...")
    : t("messages_for_the_user", "session.id.unavailable", "ID: unavailable");
}

function MessageBubble({
  message,
  providerId,
  providerName,
}: {
  message: SessionMessage;
  providerId: string | undefined;
  providerName: string | undefined;
}) {
  const { t } = useBrowserLocalization();
  const isThinking = isThinkingMessage(message);
  const displayText = resolveTranslatedDisplayText(message, isThinking);
  const revealedText = useTranslatedTextReveal(
    displayText,
    Boolean(message.localizedContent)
  );
  const tint = resolveProviderTint(providerId);
  return (
    <article className={resolveBubbleClassName(message, isThinking, tint)}>
      <header
        className={
          isThinking
            ? "session-dialog__message-header session-dialog__message-header--thinking"
            : "session-dialog__message-header"
        }
      >
        <span className="session-dialog__role">
          {resolveMessageRoleLabel(message.role, isThinking, providerName, t)}
        </span>
        <span className="session-dialog__timestamp">
          {formatMessageTime(message.timestamp)}
        </span>
      </header>
      <div
        className={
          isThinking
            ? "session-dialog__content session-dialog__content--thinking"
            : "session-dialog__content"
        }
      >
        {revealedText}
      </div>
    </article>
  );
}

function isThinkingMessage(message: SessionMessage): boolean {
  return (
    message.role === "thinking" ||
    (message.role === "assistant" && message.tag === "thinking")
  );
}

function resolveProviderTint(
  providerId: string | undefined
): "claude" | "codex" | "kimi" | null {
  if (providerId === "claude" || providerId === "codex") {
    return providerId;
  }
  // The visible Kimi is the universal-client `kimi-client` endpoint (the ACP
  // `kimi` id left with the kimi-provider retirement, 2026-07-05); its live
  // sessions keep the Kimi tint.
  if (providerId === "kimi-client") {
    return "kimi";
  }
  return null;
}

function resolveBubbleClassName(
  message: SessionMessage,
  isThinking: boolean,
  tint: "claude" | "codex" | "kimi" | null
): string {
  const base = "session-dialog__message";
  if (isThinking) {
    return tint
      ? `${base} session-dialog__message--assistant-thinking session-dialog__message--assistant-${tint}`
      : `${base} session-dialog__message--thinking`;
  }
  if (message.role === "assistant") {
    return tint
      ? `${base} session-dialog__message--assistant session-dialog__message--assistant-${tint}`
      : `${base} session-dialog__message--assistant`;
  }
  return `${base} session-dialog__message--${message.role}`;
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
  isThinking: boolean,
  providerName: string | undefined,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  if (isThinking) {
    return t("ui_labels", "session.role.thinking", "Thinking");
  }
  if (role === "assistant") {
    return (
      providerName ?? t("ui_labels", "session.role.assistant", "Assistant")
    );
  }
  return role === "system"
    ? t("ui_labels", "session.role.system", "System")
    : t("ui_labels", "session.role.user", "User");
}

function resolveReasoningLabel(
  session: CoreSession | undefined,
  settings: HarnessSettings | null
): string | null {
  if (!(session && settings)) {
    return null;
  }
  if (session.providerId === "codex") {
    const effort = resolveCodexReasoningEffort(
      session.model,
      settings.providers.codex.reasoningByModel[session.model]
    );
    return effort ? `(${effort})` : null;
  }
  if (session.providerId === "claude") {
    return settings.providers.claude.thinking.enabled
      ? `(${settings.providers.claude.thinkingByModel[session.model] ?? settings.providers.claude.thinking.effort})`
      : "(off)";
  }
  if (session.providerId === "openrouter-client") {
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
