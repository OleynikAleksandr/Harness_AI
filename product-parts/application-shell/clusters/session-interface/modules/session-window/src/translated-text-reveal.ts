import { useEffect, useRef, useState } from "react";
import { coalesceLiveAssistantMessages } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/live-assistant-message-coalescer.js";
import type { CoreSessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type {
  SessionMessage,
  SessionMessageTranslationPatch,
} from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";

type MessagesBySession = Record<string, SessionMessage[]>;
const REVEAL_TOKEN_PATTERN = /\S+\s*|\s+/gu;
const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}_]/u;
const TARGET_REVEAL_TICKS = 90;
const THINKING_TRANSLATION_REVEAL_INTERVAL_MS = 18;

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
    [patch.sessionId]: (current[patch.sessionId] ?? []).map((message) => {
      if (message.id !== patch.messageId) {
        return message;
      }
      // A patch without `localizedContent` means Core settled a failed
      // translation: stop waiting and show the source text.
      return patch.localizedContent
        ? withLocalizedContent(message, patch.localizedContent)
        : withSourceText(message);
    }),
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
  const [visibleText, setVisibleText] = useState(text);
  const initializedRef = useRef(false);
  const visibleTextRef = useRef(text);

  useEffect(() => {
    const commitVisibleText = (nextText: string) => {
      visibleTextRef.current = nextText;
      setVisibleText(nextText);
    };
    if (!(enabled && text)) {
      initializedRef.current = true;
      commitVisibleText(text);
      return;
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
      commitVisibleText(text);
      return;
    }

    const tokens = splitTranslatedTextRevealTokens(text);
    const initialText = resolveTranslatedTextRevealPrefixText(
      text,
      visibleTextRef.current
    );
    let visibleTokenCount = splitTranslatedTextRevealTokens(initialText).length;
    const step = resolveTranslatedTextRevealBatchSize(tokens.length);
    commitVisibleText(
      buildTranslatedTextRevealFrame(tokens, visibleTokenCount)
    );
    if (visibleTokenCount >= tokens.length) {
      commitVisibleText(text);
      return;
    }

    const timer = window.setInterval(() => {
      visibleTokenCount = Math.min(tokens.length, visibleTokenCount + step);
      commitVisibleText(
        buildTranslatedTextRevealFrame(tokens, visibleTokenCount)
      );
      if (visibleTokenCount >= tokens.length) {
        window.clearInterval(timer);
      }
    }, THINKING_TRANSLATION_REVEAL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, text]);
  return visibleText;
}

function splitTranslatedTextRevealTokens(text: string): readonly string[] {
  return text.match(REVEAL_TOKEN_PATTERN) ?? [];
}

function resolveTranslatedTextRevealBatchSize(tokenCount: number): number {
  return Math.max(1, Math.ceil(tokenCount / TARGET_REVEAL_TICKS));
}

function buildTranslatedTextRevealFrame(
  tokens: readonly string[],
  visibleTokenCount: number
): string {
  return tokens.slice(0, Math.max(0, visibleTokenCount)).join("");
}

function resolveTranslatedTextRevealPrefixText(
  text: string,
  currentText: string
): string {
  if (!(text && currentText)) {
    return "";
  }
  if (text.startsWith(currentText)) {
    return currentText;
  }
  const maxLength = Math.min(text.length, currentText.length);
  let prefixLength = 0;
  while (
    prefixLength < maxLength &&
    text[prefixLength] === currentText[prefixLength]
  ) {
    prefixLength += 1;
  }
  return prefixLength > 0 ? trimToRevealBoundary(text, prefixLength) : "";
}

function trimToRevealBoundary(text: string, prefixLength: number): string {
  if (prefixLength >= text.length) {
    return text;
  }
  const previous = text[prefixLength - 1];
  const next = text[prefixLength];
  if (!(isWordCharacter(previous) && isWordCharacter(next))) {
    return text.slice(0, prefixLength);
  }
  let boundary = prefixLength;
  while (boundary > 0 && isWordCharacter(text[boundary - 1])) {
    boundary -= 1;
  }
  return text.slice(0, boundary);
}

function isWordCharacter(value: string | undefined): boolean {
  return Boolean(value && WORD_CHARACTER_PATTERN.test(value));
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
    index === existingIndex ? mergeRepeatedMessage(item, message) : item
  );
}

function mergeRepeatedMessage(
  previous: SessionMessage,
  next: SessionMessage
): SessionMessage {
  if (
    isThinkingMessage(previous) &&
    isThinkingMessage(next) &&
    previous.localizedContent?.trim() &&
    !next.localizedContent?.trim() &&
    next.translationState === "pending" &&
    next.text.startsWith(previous.text)
  ) {
    return { ...next, localizedContent: previous.localizedContent };
  }
  return next;
}

function withSourceText(message: SessionMessage): SessionMessage {
  const {
    localizedContent: _localized,
    translationState: _pending,
    ...rest
  } = message;
  return rest;
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
