import crypto from "node:crypto";

interface CodexAgentMessageState {
  readonly assistantTextByItemId: Map<string, string>;
  structuredOutputExpected: boolean;
}

export type CodexAgentMessageEvent =
  | {
      readonly content: string;
      readonly role: "assistant";
      readonly tag?: "commentary";
      readonly timestamp: string;
      readonly type: "dialog_message";
      readonly uuid: string;
    }
  | {
      readonly output: Readonly<Record<string, unknown>>;
      readonly phase: "commentary" | "final_answer";
      readonly provider: "codex";
      readonly threadId: string;
      readonly timestamp: string;
      readonly type: "structured_output";
      readonly uuid: string;
    };

export function projectCompletedCodexAgentMessage(
  threadId: string,
  item: Readonly<Record<string, unknown>>,
  state: CodexAgentMessageState
): CodexAgentMessageEvent | null {
  const itemId = asString(item.id);
  const phase = asString(item.phase);
  const text =
    asText(item.text) ??
    (itemId ? (state.assistantTextByItemId.get(itemId) ?? null) : null);
  if (itemId) {
    state.assistantTextByItemId.delete(itemId);
  }
  if (text === null) {
    return null;
  }
  const content = text.trim();
  if (!content) {
    return null;
  }
  if (phase === "commentary") {
    if (state.structuredOutputExpected) {
      const output = parseStructuredObject(content);
      if (output) {
        return buildStructuredOutput(threadId, itemId, output, "commentary");
      }
    }
    return buildDialogMessage(content, itemId, "commentary");
  }
  if (!(phase === "final_answer" || phase === null)) {
    return null;
  }
  if (state.structuredOutputExpected) {
    state.structuredOutputExpected = false;
    const output = parseStructuredObject(content);
    if (output) {
      return buildStructuredOutput(threadId, itemId, output, "final_answer");
    }
  }
  return buildDialogMessage(content, itemId);
}

function buildStructuredOutput(
  threadId: string,
  itemId: string | null,
  output: Readonly<Record<string, unknown>>,
  phase: "commentary" | "final_answer"
): CodexAgentMessageEvent {
  return {
    output,
    phase,
    provider: "codex",
    threadId,
    timestamp: new Date().toISOString(),
    type: "structured_output",
    uuid: `${itemId ?? crypto.randomUUID()}::structured_output`,
  };
}

function buildDialogMessage(
  content: string,
  itemId: string | null,
  tag?: "commentary"
): CodexAgentMessageEvent {
  return {
    content,
    role: "assistant",
    ...(tag ? { tag } : {}),
    timestamp: new Date().toISOString(),
    type: "dialog_message",
    uuid: itemId ?? crypto.randomUUID(),
  };
}

function parseStructuredObject(
  content: string
): Readonly<Record<string, unknown>> | null {
  try {
    const output: unknown = JSON.parse(content);
    return isRecord(output) ? output : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
