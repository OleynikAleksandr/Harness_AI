import { useMemo } from "react";
import type { SessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useSessionDialogAutoscroll } from "./session-dialog-autoscroll.js";
import {
  mergeThinkingMessagesForDisplay,
  resolveTranslatedDisplayText,
  useTranslatedTextReveal,
} from "./translated-text-reveal.js";

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
  if (providerId === "claude") {
    return providerId;
  }
  if (providerId === "codex") {
    return "codex";
  }
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
