import type { ActiveSession } from "../session/types.js";
import type { ClaudeStreamMessage } from "../types.js";

export interface ClaudeSdkUsageSnapshot {
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly contextWindow: number | null;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readTokenCount = (
  usage: Record<string, unknown>,
  key: string
): number => {
  const value = usage[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const readAssistantMessageId = (
  message: ClaudeStreamMessage
): string | null => {
  const nested = isRecord(message.message) ? message.message : null;
  const id = nested?.id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
};

const readAssistantUsage = (
  message: ClaudeStreamMessage
): Record<string, unknown> | null => {
  const nested = isRecord(message.message)
    ? (message.message as Record<string, unknown>)
    : null;
  const usage = nested?.usage;
  return isRecord(usage) ? usage : null;
};

const readResultContextWindow = (
  message: ClaudeStreamMessage
): number | null => {
  let modelUsage: Record<string, unknown> | null = null;
  if (isRecord(message.modelUsage)) {
    modelUsage = message.modelUsage;
  } else if (isRecord(message.model_usage)) {
    modelUsage = message.model_usage;
  }
  if (!modelUsage) {
    return null;
  }
  for (const entry of Object.values(modelUsage)) {
    if (isRecord(entry) && typeof entry.contextWindow === "number") {
      return entry.contextWindow;
    }
  }
  return null;
};

export class ClaudeSdkUsageTracker {
  private readonly lastMessageIdBySession = new WeakMap<
    ActiveSession,
    string
  >();

  recordMessage(session: ActiveSession, message: ClaudeStreamMessage): void {
    if (message.type === "assistant") {
      this.recordAssistantMessage(session, message);
      return;
    }
    if (message.type === "result") {
      this.recordResultMessage(session, message);
    }
  }

  private recordAssistantMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    const usage = readAssistantUsage(message);
    if (!usage) {
      return;
    }
    const messageId = readAssistantMessageId(message);
    if (messageId && this.lastMessageIdBySession.get(session) === messageId) {
      return;
    }
    if (messageId) {
      this.lastMessageIdBySession.set(session, messageId);
    }
    session.sdkUsage = {
      cacheCreationInputTokens: readTokenCount(
        usage,
        "cache_creation_input_tokens"
      ),
      cacheReadInputTokens: readTokenCount(usage, "cache_read_input_tokens"),
      contextWindow: session.sdkUsage?.contextWindow ?? null,
      inputTokens: readTokenCount(usage, "input_tokens"),
      outputTokens: readTokenCount(usage, "output_tokens"),
    };
  }

  private recordResultMessage(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): void {
    const contextWindow = readResultContextWindow(message);
    if (contextWindow === null || !session.sdkUsage) {
      return;
    }
    session.sdkUsage = { ...session.sdkUsage, contextWindow };
  }
}
