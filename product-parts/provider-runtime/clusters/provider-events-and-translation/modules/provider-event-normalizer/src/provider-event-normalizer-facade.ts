import { randomUUID } from "node:crypto";

export type NormalizedProviderEvent =
  | {
      content: string;
      role: "assistant" | "thinking";
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
  private readonly emittedSummaryIndexesByItem = new Map<string, Set<number>>();
  private readonly reasoningTextByItem = new Map<string, string>();
  private readonly summaryPartsByItem = new Map<string, string[]>();

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
    if (method === "item/reasoning/summaryPartAdded") {
      return this.normalizeCodexReasoningSummaryPartAdded(params);
    }
    if (method === "item/reasoning/summaryTextDelta") {
      this.appendCodexReasoningSummaryDelta(params);
      return [];
    }
    if (method === "item/reasoning/textDelta") {
      this.appendCodexReasoningTextDelta(params);
      return [];
    }
    if (method === "thread/tokenUsage/updated") {
      return this.normalizeCodexTokenUsage(params);
    }
    return [];
  }

  private normalizeCodexTurnCompleted(
    params: unknown
  ): NormalizedProviderEvent {
    const turn = isRecord(params) && isRecord(params.turn) ? params.turn : null;
    const error = isRecord(turn?.error) ? turn.error : null;
    const status = readString(turn?.status);
    if (status === "failed" || error) {
      return event(
        "turn_failed",
        readString(error?.message) ?? "Codex turn failed"
      );
    }
    return event("turn_completed");
  }

  private normalizeCodexCompletedItem(
    params: unknown
  ): NormalizedProviderEvent[] {
    if (!(isRecord(params) && isRecord(params.item))) {
      return [];
    }
    const item = params.item;
    const itemType = readString(item.type);
    if (itemType === "agentMessage") {
      const text = readString(item.text);
      return text ? [dialogMessage(text, readString(item.id), undefined)] : [];
    }
    if (itemType === "reasoning") {
      return this.normalizeCodexCompletedReasoning(params, item);
    }
    return [];
  }

  private normalizeCodexCompletedReasoning(
    params: Record<string, unknown>,
    item: Record<string, unknown>
  ): NormalizedProviderEvent[] {
    const itemId = readString(item.id);
    const itemKey = itemId ? codexItemKey(params, itemId) : null;
    const fallback = itemKey ? this.reasoningTextByItem.get(itemKey) : null;
    const resolvedBlocks = itemKey
      ? this.flushRemainingReasoningBlocks({
          fallback,
          finalContentBlocks: readStringArray(item.content),
          finalSummaryBlocks: readStringArray(item.summary),
          itemId: itemId ?? "reasoning",
          itemKey,
        })
      : resolveReasoningBlocks(readStringArray(item.summary), fallback).map(
          (content, index) => ({ content, index })
        );
    if (itemKey) {
      this.emittedSummaryIndexesByItem.delete(itemKey);
      this.reasoningTextByItem.delete(itemKey);
      this.summaryPartsByItem.delete(itemKey);
    }
    return resolvedBlocks.map((block) =>
      dialogMessage(
        block.content,
        itemId ? `${itemId}::summary-block::${block.index}` : null,
        "thinking"
      )
    );
  }

  private normalizeCodexReasoningSummaryPartAdded(
    params: unknown
  ): NormalizedProviderEvent[] {
    if (!isRecord(params)) {
      return [];
    }
    const itemId = readString(params.itemId);
    const summaryIndex = readNumber(params.summaryIndex);
    if (!(itemId && summaryIndex !== null)) {
      return [];
    }
    return this.flushAccumulatedBeforeIndex(
      codexItemKey(params, itemId),
      summaryIndex
    ).map((block) =>
      dialogMessage(
        block.content,
        `${itemId}::summary-block::${block.index}`,
        "thinking"
      )
    );
  }

  private appendCodexReasoningSummaryDelta(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const itemId = readString(params.itemId);
    const summaryIndex = readNumber(params.summaryIndex);
    const delta = readText(params.delta);
    if (!(itemId && summaryIndex !== null && delta !== null)) {
      return;
    }
    const key = codexItemKey(params, itemId);
    const parts = this.summaryPartsByItem.get(key) ?? [];
    ensureSummarySlot(parts, summaryIndex);
    parts[summaryIndex] = `${parts[summaryIndex] ?? ""}${delta}`;
    this.summaryPartsByItem.set(key, parts);
  }

  private appendCodexReasoningTextDelta(params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    const itemId = readString(params.itemId);
    const delta = readText(params.delta);
    if (!(itemId && delta !== null)) {
      return;
    }
    const key = codexItemKey(params, itemId);
    this.reasoningTextByItem.set(
      key,
      `${this.reasoningTextByItem.get(key) ?? ""}${delta}`
    );
  }

  private normalizeCodexTokenUsage(params: unknown): NormalizedProviderEvent[] {
    if (!(isRecord(params) && isRecord(params.tokenUsage))) {
      return [];
    }
    return [
      {
        data: { kind: "token_usage", tokenUsage: params.tokenUsage },
        timestamp: nowIso(),
        type: "stream_event",
        uuid: `${randomUUID()}::token_usage`,
      },
    ];
  }

  private flushAccumulatedBeforeIndex(
    itemKey: string,
    summaryIndex: number
  ): { content: string; index: number }[] {
    const parts = this.summaryPartsByItem.get(itemKey) ?? [];
    const emitted = this.emittedSummaryIndexesByItem.get(itemKey) ?? new Set();
    const blocks: { content: string; index: number }[] = [];
    ensureSummarySlot(parts, summaryIndex);
    for (let index = 0; index < summaryIndex; index += 1) {
      const content = parts[index]?.trim();
      if (!(content && !emitted.has(index))) {
        continue;
      }
      emitted.add(index);
      blocks.push({ content, index });
    }
    this.summaryPartsByItem.set(itemKey, parts);
    this.emittedSummaryIndexesByItem.set(itemKey, emitted);
    return blocks;
  }

  private flushRemainingReasoningBlocks(options: {
    readonly fallback: string | null | undefined;
    readonly finalContentBlocks: readonly string[];
    readonly finalSummaryBlocks: readonly string[];
    readonly itemId: string;
    readonly itemKey: string;
  }): { content: string; index: number }[] {
    const finalSummary = this.flushFinalBlocks(
      options.itemKey,
      options.finalSummaryBlocks
    );
    if (finalSummary.length > 0) {
      return finalSummary;
    }
    const parts = this.summaryPartsByItem.get(options.itemKey);
    if (parts?.length) {
      const accumulated = this.flushAccumulatedBeforeIndex(
        options.itemKey,
        parts.length
      );
      if (accumulated.length > 0) {
        return accumulated;
      }
    }
    const finalContent = this.flushFinalBlocks(
      options.itemKey,
      options.finalContentBlocks
    );
    if (finalContent.length > 0) {
      return finalContent;
    }
    return this.flushFallbackBlock(options.itemKey, options.fallback);
  }

  private flushFinalBlocks(
    itemKey: string,
    blocks: readonly string[]
  ): { content: string; index: number }[] {
    const emitted = this.emittedSummaryIndexesByItem.get(itemKey) ?? new Set();
    const flushed = blocks.flatMap((block, index) => {
      const content = block.trim();
      if (!(content && !emitted.has(index))) {
        return [];
      }
      emitted.add(index);
      return [{ content, index }];
    });
    this.emittedSummaryIndexesByItem.set(itemKey, emitted);
    return flushed;
  }

  private flushFallbackBlock(
    itemKey: string,
    fallback: string | null | undefined
  ): { content: string; index: number }[] {
    const content = fallback?.trim();
    const emitted = this.emittedSummaryIndexesByItem.get(itemKey) ?? new Set();
    if (!(content && !emitted.has(0))) {
      return [];
    }
    emitted.add(0);
    this.emittedSummaryIndexesByItem.set(itemKey, emitted);
    return [{ content, index: 0 }];
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
    uuid: id ?? randomUUID(),
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
    uuid: randomUUID(),
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

function readText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveReasoningBlocks(
  blocks: string[],
  fallback: string | null | undefined
): string[] {
  if (blocks.length > 0) {
    return blocks;
  }
  return fallback ? [fallback] : [];
}

function ensureSummarySlot(parts: string[], summaryIndex: number): void {
  while (parts.length <= summaryIndex) {
    parts.push("");
  }
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function codexItemKey(params: Record<string, unknown>, itemId: string): string {
  return `${readString(params.threadId) ?? "thread"}::${itemId}`;
}

export const providerEventNormalizerFacade =
  new ProviderEventNormalizerFacade();
