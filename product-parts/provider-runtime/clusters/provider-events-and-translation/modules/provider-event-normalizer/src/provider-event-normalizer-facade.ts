import { randomUUID } from "node:crypto";

export type NormalizedProviderEvent =
  | {
      content: string;
      role: "assistant";
      tag?: string;
      timestamp: string;
      type: "dialog_message";
      uuid: string;
    }
  | {
      message?: string;
      timestamp: string;
      type: "stream_error" | "turn_completed" | "turn_failed" | "turn_started";
      uuid: string;
    }
  | {
      data: Record<string, unknown>;
      timestamp: string;
      type: "stream_event" | "system";
      uuid: string;
    };

export class ProviderEventNormalizerFacade {
  normalizeCodexNotification(
    method: string,
    params: unknown
  ): NormalizedProviderEvent[] {
    if (method === "turn/started") {
      return [event("turn_started")];
    }
    if (method === "turn/completed") {
      return [this.normalizeCodexTurnCompleted(params)];
    }
    if (method === "error") {
      return [event("stream_error", readErrorMessage(params))];
    }
    if (method === "item/completed") {
      return this.normalizeCodexCompletedItem(params);
    }
    if (method === "thread/tokenUsage/updated") {
      return this.normalizeCodexTokenUsage(params);
    }
    return [];
  }

  private normalizeCodexTurnCompleted(params: unknown): NormalizedProviderEvent {
    const turn = isRecord(params) && isRecord(params.turn) ? params.turn : null;
    const error = isRecord(turn?.error) ? turn.error : null;
    const status = readString(turn?.status);
    if (status === "failed" || error) {
      return event("turn_failed", readString(error?.message) ?? "Codex turn failed");
    }
    return event("turn_completed");
  }

  private normalizeCodexCompletedItem(params: unknown): NormalizedProviderEvent[] {
    if (!isRecord(params) || !isRecord(params.item)) {
      return [];
    }
    const item = params.item;
    const itemType = readString(item.type);
    if (itemType === "agentMessage") {
      const text = readString(item.text);
      return text ? [dialogMessage(text, readString(item.id), undefined)] : [];
    }
    if (itemType === "reasoning") {
      const blocks = readStringArray(item.summary).length
        ? readStringArray(item.summary)
        : readStringArray(item.content);
      return blocks.map((block) => dialogMessage(block, null, "thinking"));
    }
    return [];
  }

  private normalizeCodexTokenUsage(params: unknown): NormalizedProviderEvent[] {
    if (!isRecord(params) || !isRecord(params.tokenUsage)) {
      return [];
    }
    return [
      {
        data: { kind: "token_usage", tokenUsage: params.tokenUsage },
        timestamp: nowIso(),
        type: "stream_event",
        uuid: `${randomUUID()}::token_usage`
      }
    ];
  }
}

function dialogMessage(
  content: string,
  id: string | null,
  tag: string | undefined
): NormalizedProviderEvent {
  return {
    content: content.trim(),
    role: "assistant",
    ...(tag ? { tag } : {}),
    timestamp: nowIso(),
    type: "dialog_message",
    uuid: id ?? randomUUID()
  };
}

function event(
  type: "stream_error" | "turn_completed" | "turn_failed" | "turn_started",
  message?: string
): NormalizedProviderEvent {
  return {
    ...(message ? { message } : {}),
    timestamp: nowIso(),
    type,
    uuid: randomUUID()
  };
}

function readErrorMessage(value: unknown): string {
  const error = isRecord(value) && isRecord(value.error) ? value.error : null;
  return readString(error?.message) ?? "Codex app-server error";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

export const providerEventNormalizerFacade =
  new ProviderEventNormalizerFacade();
