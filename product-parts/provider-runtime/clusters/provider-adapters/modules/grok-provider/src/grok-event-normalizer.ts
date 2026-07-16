import crypto from "node:crypto";
import type {
  GrokAcpNotification,
  GrokProviderEvent,
} from "./grok-acp-contracts.js";
import { isRecord } from "./grok-acp-contracts.js";

type MessageRole = "assistant" | "thinking";

export class GrokEventNormalizer {
  normalizeNotification(
    notification: GrokAcpNotification
  ): readonly GrokProviderEvent[] {
    if (
      notification.method !== "session/update" &&
      notification.method !== "_x.ai/session/update" &&
      notification.method !== "_x.ai/session_notification"
    ) {
      return [
        createEvent("grok_acp_event", {
          method: notification.method,
          raw: notification.params,
        }),
      ];
    }
    const params = unwrapNotificationParams(notification.params);
    const update = isRecord(params?.update) ? params.update : null;
    if (!update) {
      return [createEvent("grok_acp_event", { raw: notification.params })];
    }
    return this.#normalizeUpdate(update);
  }

  turnStarted(providerSessionId: string): GrokProviderEvent {
    return createEvent("turn_started", { providerSessionId });
  }

  normalizePromptResult(
    providerSessionId: string,
    result: unknown
  ): GrokProviderEvent {
    const meta =
      isRecord(result) && isRecord(result._meta) ? result._meta : null;
    const tokenUsage = readPromptTokenUsage(meta);
    return createEvent("turn_completed", {
      providerSessionId,
      raw: result,
      ...(tokenUsage ? { tokenUsage, usage: tokenUsage } : {}),
    });
  }

  normalizePromptFailure(
    providerSessionId: string,
    error: unknown
  ): GrokProviderEvent {
    return createEvent("turn_failed", {
      message: error instanceof Error ? error.message : String(error),
      providerSessionId,
    });
  }

  #normalizeUpdate(
    update: Record<string, unknown>
  ): readonly GrokProviderEvent[] {
    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        return messageEvents(update, "assistant");
      case "agent_thought_chunk":
        return messageEvents(update, "thinking");
      case "tool_call":
        return [streamEvent("tool_call", readToolUpdate(update))];
      case "tool_call_update":
        return [streamEvent("tool_result", readToolUpdate(update))];
      case "plan":
        return [
          streamEvent("plan", {
            entries: Array.isArray(update.entries) ? update.entries : [],
            raw: update,
          }),
        ];
      case "usage_update":
        return [streamEvent("token_usage", readUsageUpdate(update))];
      case "model_changed":
        return [
          streamEvent("model_changed", {
            model: readString(update.model_id),
            raw: update,
            reasoningEffort: readString(update.reasoning_effort),
          }),
        ];
      case "auto_recovery_exhausted":
        return [failureEvent(update, "Grok recovery exhausted.")];
      case "retry_state":
        return update.type === "failed"
          ? [failureEvent(update, "Grok retry failed.")]
          : [streamEvent("retry_state", { raw: update })];
      default:
        return [
          streamEvent(String(update.sessionUpdate ?? "session_update"), {
            raw: update,
          }),
        ];
    }
  }
}

function unwrapNotificationParams(
  value: unknown
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.method === "string" &&
    isRecord(value.params) &&
    isRecord(value.params.update)
  ) {
    return value.params;
  }
  return value;
}

function messageEvents(
  update: Record<string, unknown>,
  role: MessageRole
): readonly GrokProviderEvent[] {
  const content = isRecord(update.content) ? update.content : null;
  const text = readRawString(content?.text);
  if (!text) {
    return [];
  }
  return [
    createEvent(role, {
      content: text,
      ...(role === "assistant" ? { tag: "live" } : { tag: "thinking" }),
      text,
    }),
  ];
}

function readToolUpdate(
  update: Record<string, unknown>
): Record<string, unknown> {
  return {
    raw: update,
    status: readString(update.status),
    toolCallId: readString(update.toolCallId),
    toolKind: readString(update.kind),
    toolName: readString(update.title),
  };
}

function readUsageUpdate(
  update: Record<string, unknown>
): Record<string, unknown> {
  const used = readNumber(update.used);
  const limit = readNumber(update.size);
  const cached = readNumber(update.cachedReadTokens);
  const tokenUsage =
    used !== null && limit !== null && limit > 0
      ? { cached, limit, used }
      : null;
  return {
    raw: update,
    ...(tokenUsage
      ? {
          contextUsage: tokenUsage.used / tokenUsage.limit,
          tokenUsage,
          usage: tokenUsage,
        }
      : {}),
  };
}

function readPromptTokenUsage(
  meta: Record<string, unknown> | null
): Record<string, number | null> | null {
  if (!meta) {
    return null;
  }
  const used = readNumber(meta.totalTokens);
  if (used === null) {
    return null;
  }
  return {
    cached: readNumber(meta.cachedReadTokens),
    limit: 0,
    used,
  };
}

function failureEvent(
  update: Record<string, unknown>,
  fallback: string
): GrokProviderEvent {
  return createEvent("turn_failed", {
    message: readString(update.error) ?? readString(update.message) ?? fallback,
    raw: update,
  });
}

function streamEvent(
  kind: string,
  payload: Readonly<Record<string, unknown>>
): GrokProviderEvent {
  return createEvent("stream_event", {
    data: { kind, provider: "grok", ...payload },
  });
}

function createEvent(
  type: string,
  payload: Readonly<Record<string, unknown>> = {}
): GrokProviderEvent {
  const timestamp = new Date().toISOString();
  return {
    provider: "grok",
    timestamp,
    type,
    uuid: `${crypto.randomUUID()}::${type}`,
    ...payload,
  };
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRawString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
