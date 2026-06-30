import { useEffect, useState } from "react";
import { coalesceLiveAssistantMessages } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/live-assistant-message-coalescer.js";
import type { CoreSessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type {
  SessionMessage,
  SessionMessageTranslationPatch,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";

type MessagesBySession = Record<string, SessionMessage[]>;

export function appendSessionMessageToState(
  current: MessagesBySession,
  message: CoreSessionMessage
): MessagesBySession {
  return {
    ...current,
    [message.sessionId]: coalesceLiveAssistantMessages(
      appendUniqueMessage(current[message.sessionId] ?? [], {
        id: message.id,
        ...(message.localizedContent
          ? { localizedContent: message.localizedContent }
          : {}),
        role: message.role,
        ...(message.tag ? { tag: message.tag } : {}),
        text: message.text,
        timestamp: message.timestamp,
        ...(message.translationState
          ? { translationState: message.translationState }
          : {}),
      })
    ),
  };
}

export function applySessionTranslationPatchToState(
  current: MessagesBySession,
  patch: SessionMessageTranslationPatch
): MessagesBySession {
  return {
    ...current,
    [patch.sessionId]: (current[patch.sessionId] ?? []).map((message) =>
      message.id === patch.messageId
        ? withLocalizedContent(message, patch.localizedContent)
        : message
    ),
  };
}

export function mergeThinkingMessagesForDisplay(
  messages: readonly SessionMessage[]
): SessionMessage[] {
  const merged: SessionMessage[] = [];
  for (const message of messages) {
    const previous = merged.at(-1);
    if (
      !(previous && isThinkingMessage(previous) && isThinkingMessage(message))
    ) {
      merged.push(message);
      continue;
    }
    merged[merged.length - 1] = mergeThinkingPair(previous, message);
  }
  return merged;
}

export function resolveTranslatedDisplayText(
  message: SessionMessage,
  isThinking: boolean
): string {
  if (message.localizedContent?.trim()) {
    return message.localizedContent;
  }
  return isThinking && message.translationState === "pending"
    ? ""
    : message.text;
}

export function useTranslatedTextReveal(
  text: string,
  enabled: boolean
): string {
  const [visibleLength, setVisibleLength] = useState(text.length);
  useEffect(() => {
    if (!(enabled && text)) {
      setVisibleLength(text.length);
      return undefined;
    }
    setVisibleLength(0);
    const step = Math.max(4, Math.ceil(text.length / 24));
    const timer = window.setInterval(() => {
      setVisibleLength((current) => {
        const next = Math.min(text.length, current + step);
        if (next === text.length) {
          window.clearInterval(timer);
        }
        return next;
      });
    }, 18);
    return () => window.clearInterval(timer);
  }, [enabled, text]);
  return text.slice(0, visibleLength);
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

function withLocalizedContent(
  message: SessionMessage,
  localizedContent: string
): SessionMessage {
  const { translationState: _pending, ...rest } = message;
  return { ...rest, localizedContent };
}

function mergeThinkingPair(
  previous: SessionMessage,
  next: SessionMessage
): SessionMessage {
  const localizedContent = joinOptionalText(
    resolveTranslatedDisplayText(previous, true),
    resolveTranslatedDisplayText(next, true)
  );
  const translationState =
    previous.translationState ?? next.translationState ?? undefined;
  return {
    ...previous,
    ...(localizedContent ? { localizedContent } : {}),
    text: joinOptionalText(previous.text, next.text),
    timestamp: next.timestamp,
    ...(translationState ? { translationState } : {}),
  };
}

function joinOptionalText(left: string, right: string): string {
  if (!(left && right)) {
    return left || right;
  }
  return `${left}\n${right}`;
}

function isThinkingMessage(message: SessionMessage): boolean {
  return (
    message.role === "thinking" ||
    (message.role === "assistant" && message.tag === "thinking")
  );
}
