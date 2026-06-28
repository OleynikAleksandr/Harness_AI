export type SessionReasoningDisplayRole = "assistant" | "thinking";

export interface SessionReasoningDisplayMessage {
  id: string;
  role: SessionReasoningDisplayRole;
  tag?: string;
  text: string;
  timestamp: string;
}

const THINKING_TAG_REGEX = /<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/giu;

export class SessionReasoningDisplayFacade {
  projectProviderEvent(event: unknown): SessionReasoningDisplayMessage[] {
    if (!isRecord(event)) {
      return [];
    }
    const timestamp = readString(event.timestamp) ?? new Date().toISOString();
    const baseId = readString(event.uuid) ?? createId("provider-message");
    const type = readString(event.type);
    if (type === "stream_event") {
      return this.projectRecord(event.data ?? event.payload, baseId, timestamp);
    }
    const reasoningTexts = readReasoningTexts(event);
    if (reasoningTexts.length > 0) {
      return reasoningTexts.map((text, index) =>
        displayMessage(
          `${baseId}::thinking::${index}`,
          "thinking",
          text,
          timestamp,
          "thinking"
        )
      );
    }
    const text = readDisplayText(event);
    if (!text) {
      return [];
    }
    const tag = readString(event.tag);
    if (isThinkingEvent(event)) {
      return [displayMessage(baseId, "thinking", text, timestamp, "thinking")];
    }
    if (type === "assistant" || type === "dialog_message") {
      return splitTaggedReasoning(text, baseId, timestamp, tag ?? undefined);
    }
    return [];
  }

  private projectRecord(
    value: unknown,
    baseId: string,
    timestamp: string
  ): SessionReasoningDisplayMessage[] {
    if (!isRecord(value)) {
      return [];
    }
    const messages = readReasoningTexts(value).map((text, index) =>
      displayMessage(
        `${baseId}::thinking::${index}`,
        "thinking",
        text,
        timestamp,
        "thinking"
      )
    );
    const content = readRawString(value.content);
    if (content) {
      messages.push(
        ...splitTaggedReasoning(content, `${baseId}::content`, timestamp)
      );
    }
    return messages;
  }
}

function splitTaggedReasoning(
  text: string,
  baseId: string,
  timestamp: string,
  tag?: string
): SessionReasoningDisplayMessage[] {
  const messages: SessionReasoningDisplayMessage[] = [];
  let cursor = 0;
  let index = 0;
  THINKING_TAG_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = THINKING_TAG_REGEX.exec(text);
  while (match) {
    pushText(
      messages,
      `${baseId}::assistant::${index}`,
      "assistant",
      text.slice(cursor, match.index),
      timestamp,
      tag
    );
    pushText(
      messages,
      `${baseId}::thinking::${index}`,
      "thinking",
      match[2] ?? "",
      timestamp,
      "thinking"
    );
    cursor = match.index + match[0].length;
    index += 1;
    match = THINKING_TAG_REGEX.exec(text);
  }
  pushText(
    messages,
    `${baseId}::assistant::${index}`,
    "assistant",
    text.slice(cursor),
    timestamp,
    tag
  );
  return messages.length > 0
    ? messages
    : [displayMessage(baseId, "assistant", text, timestamp, tag)];
}

function pushText(
  messages: SessionReasoningDisplayMessage[],
  id: string,
  role: SessionReasoningDisplayRole,
  text: string,
  timestamp: string,
  tag?: string
): void {
  const message = displayMessage(id, role, text, timestamp, tag);
  if (message.text) {
    messages.push(message);
  }
}

function displayMessage(
  id: string,
  role: SessionReasoningDisplayRole,
  text: string,
  timestamp: string,
  tag?: string
): SessionReasoningDisplayMessage {
  const displayText = tag === "live" ? text : text.trim();
  return {
    id,
    role,
    ...(tag ? { tag } : {}),
    text: displayText.trim().length > 0 ? displayText : "",
    timestamp,
  };
}

function isThinkingEvent(event: Record<string, unknown>): boolean {
  return (
    readString(event.type) === "thinking" ||
    readString(event.role) === "thinking" ||
    readString(event.tag) === "thinking"
  );
}

function readReasoningTexts(value: Record<string, unknown>): string[] {
  return [
    ...readTextArray(value.summary),
    ...readTextArray(value.reasoning),
    ...readTextArray(value.reasoning_content),
    ...readTextArray(value.thinking),
    ...readTextArray(value.thinking_content),
  ];
}

function readDisplayText(value: Record<string, unknown>): string | null {
  return (
    readRawString(value.content) ??
    readRawString(value.text) ??
    readRawString(value.message)
  );
}

function readTextArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [item.trim()];
    }
    if (isRecord(item)) {
      const text = readDisplayText(item);
      return text ? [text] : [];
    }
    return [];
  });
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readRawString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export const sessionReasoningDisplayFacade =
  new SessionReasoningDisplayFacade();
