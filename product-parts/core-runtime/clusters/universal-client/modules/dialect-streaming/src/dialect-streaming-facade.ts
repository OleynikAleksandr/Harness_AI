// Consolidated SSE + dialect streaming for the universal client. Merges the
// three ported reference readers (open-router-sse-reader, glm-native-sse-parser,
// local-models-sse-reader) into one OpenAI-shape chat.completions stream parser
// that degrades by a DialectProfile. Contract: docs/architecture/UniversalClient.md
// sections 3.3 / 3.4. Types only + pure parsing; the agent loop (client-core)
// drives it.

import type {
  ClientToolCall,
  DialectProfile,
  ThinkingForm,
} from "../../client-contract/src/client-contract-facade.js";

const DATA_LINE_PREFIX = "data:";
const FRAME_BOUNDARY = "\n\n";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const readNonNegative = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;

const extractDataPayload = (frame: string): string | null => {
  const dataLines = frame
    .split("\n")
    .filter((line) => line.startsWith(DATA_LINE_PREFIX))
    .map((line) => line.slice(DATA_LINE_PREFIX.length).trimStart());
  return dataLines.length > 0 ? dataLines.join("\n") : null;
};

// One SSE `data:` payload generator over any byte source (fetch Response.body
// is an AsyncIterable in Node 18+). Normalizes CRLF, splits on the blank-line
// frame boundary, and flushes a trailing frame.
export async function* readSseDataFrames(
  body: AsyncIterable<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/gu, "\n");
    let boundary = buffer.indexOf(FRAME_BOUNDARY);
    while (boundary >= 0) {
      const payload = extractDataPayload(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + FRAME_BOUNDARY.length);
      if (payload) {
        yield payload;
      }
      boundary = buffer.indexOf(FRAME_BOUNDARY);
    }
  }
  const tail = extractDataPayload(buffer);
  if (tail) {
    yield tail;
  }
}

export interface StreamUsage {
  readonly cachedTokens?: number;
  readonly completionTokens: number;
  readonly promptTokens: number;
  readonly reasoningTokens?: number;
  readonly totalTokens: number;
}

export interface ToolCallDelta {
  readonly argumentsDelta?: string;
  readonly id?: string;
  readonly index: number;
  readonly name?: string;
}

export interface ParsedStreamDelta {
  readonly content?: string;
  readonly finishReason?: string;
  readonly model?: string;
  // Raw OpenRouter structured reasoning blocks, only for the
  // reasoning_details dialect; merged by index in the accumulator.
  readonly reasoningDetails?: readonly Record<string, unknown>[];
  readonly thinking?: string;
  readonly toolCallDeltas?: readonly ToolCallDelta[];
  readonly usage?: StreamUsage;
}

const parseUsage = (value: unknown): StreamUsage | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const promptTokens = readNonNegative(value.prompt_tokens);
  const completionTokens = readNonNegative(value.completion_tokens);
  const totalTokens = readNonNegative(value.total_tokens);
  if (
    promptTokens === undefined ||
    completionTokens === undefined ||
    totalTokens === undefined
  ) {
    return undefined;
  }
  const promptDetails = isRecord(value.prompt_tokens_details)
    ? value.prompt_tokens_details
    : undefined;
  const completionDetails = isRecord(value.completion_tokens_details)
    ? value.completion_tokens_details
    : undefined;
  const cachedTokens = readNonNegative(promptDetails?.cached_tokens);
  const reasoningTokens = readNonNegative(completionDetails?.reasoning_tokens);
  return {
    completionTokens,
    promptTokens,
    totalTokens,
    ...(cachedTokens === undefined ? {} : { cachedTokens }),
    ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
  };
};

const parseToolCallDeltas = (value: unknown): readonly ToolCallDelta[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const deltas: ToolCallDelta[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const index = readNonNegative(item.index);
    if (index === undefined) {
      continue;
    }
    const fn = isRecord(item.function) ? item.function : undefined;
    deltas.push({
      index,
      ...(readNonEmptyString(item.id) ? { id: String(item.id) } : {}),
      ...(readNonEmptyString(fn?.name) ? { name: String(fn?.name) } : {}),
      ...(typeof fn?.arguments === "string"
        ? { argumentsDelta: fn.arguments }
        : {}),
    });
  }
  return deltas;
};

// Reasoning field name varies by dialect; the core normalizes all onto one
// internal thinking channel. `think_tags` is handled at content level by the
// ThinkTagSplitter, not here.
const extractThinking = (
  delta: Record<string, unknown>,
  form: ThinkingForm
): string | undefined => {
  if (form === "reasoning_content") {
    return readNonEmptyString(delta.reasoning_content);
  }
  if (form === "reasoning" || form === "reasoning_details") {
    return (
      readNonEmptyString(delta.reasoning) ??
      readNonEmptyString(delta.reasoning_content)
    );
  }
  return undefined;
};

const parseReasoningDetails = (
  value: unknown
): readonly Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

// Parse one OpenAI-shape chat.completions SSE payload into a normalized delta.
// Returns null for `[DONE]`, blanks, and unparseable frames (tolerant).
export const parseChatCompletionChunk = (
  data: string,
  dialect: DialectProfile
): ParsedStreamDelta | null => {
  const trimmed = data.trim();
  if (trimmed.length === 0 || trimmed === "[DONE]") {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
  const firstChoice = choices.find(isRecord);
  const delta = isRecord(firstChoice?.delta) ? firstChoice.delta : undefined;
  const content = delta ? readNonEmptyString(delta.content) : undefined;
  const thinking = delta
    ? extractThinking(delta, dialect.thinkingForm)
    : undefined;
  const reasoningDetails =
    delta && dialect.thinkingForm === "reasoning_details"
      ? parseReasoningDetails(delta.reasoning_details)
      : [];
  const toolCallDeltas = parseToolCallDeltas(delta?.tool_calls);
  const usage = parseUsage(parsed.usage);
  const model = readNonEmptyString(parsed.model);
  const finishReason = firstChoice
    ? readNonEmptyString(firstChoice.finish_reason)
    : undefined;
  if (
    !(
      content ||
      thinking ||
      reasoningDetails.length > 0 ||
      toolCallDeltas.length > 0 ||
      usage ||
      finishReason
    )
  ) {
    return null;
  }
  return {
    ...(content ? { content } : {}),
    ...(finishReason ? { finishReason } : {}),
    ...(model ? { model } : {}),
    ...(reasoningDetails.length > 0 ? { reasoningDetails } : {}),
    ...(thinking ? { thinking } : {}),
    ...(toolCallDeltas.length > 0 ? { toolCallDeltas } : {}),
    ...(usage ? { usage } : {}),
  };
};

interface MutableToolCall {
  arguments: string;
  id?: string;
  name?: string;
}

export interface StreamAccumulator {
  finishReason?: string;
  model?: string;
  readonly reasoningDetailsByIndex: Map<number, Record<string, unknown>>;
  readonly textParts: string[];
  readonly toolCallsByIndex: Map<number, MutableToolCall>;
  usage?: StreamUsage;
}

export const createStreamAccumulator = (): StreamAccumulator => ({
  reasoningDetailsByIndex: new Map(),
  textParts: [],
  toolCallsByIndex: new Map(),
});

// Streamed reasoning blocks split their text across chunks: string payload
// fields concatenate, every other field keeps the latest value.
const REASONING_DETAIL_TEXT_FIELDS: readonly string[] = [
  "data",
  "summary",
  "text",
];

const mergeReasoningDetail = (
  current: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> => {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (
      REASONING_DETAIL_TEXT_FIELDS.includes(key) &&
      typeof value === "string"
    ) {
      const previous = merged[key];
      merged[key] = (typeof previous === "string" ? previous : "") + value;
    } else if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
};

// Fold a parsed delta into the accumulator (tool-call args concatenated by
// index; id/name arrive on the first delta for that index).
export const applyStreamDelta = (
  accumulator: StreamAccumulator,
  delta: ParsedStreamDelta
): void => {
  if (delta.content) {
    accumulator.textParts.push(delta.content);
  }
  if (delta.model) {
    accumulator.model = delta.model;
  }
  if (delta.usage) {
    accumulator.usage = delta.usage;
  }
  if (delta.finishReason) {
    accumulator.finishReason = delta.finishReason;
  }
  for (const call of delta.toolCallDeltas ?? []) {
    const current = accumulator.toolCallsByIndex.get(call.index) ?? {
      arguments: "",
    };
    accumulator.toolCallsByIndex.set(call.index, {
      arguments: current.arguments + (call.argumentsDelta ?? ""),
      id: call.id ?? current.id,
      name: call.name ?? current.name,
    });
  }
  for (const detail of delta.reasoningDetails ?? []) {
    const index = readNonNegative(detail.index) ?? 0;
    const current = accumulator.reasoningDetailsByIndex.get(index);
    accumulator.reasoningDetailsByIndex.set(
      index,
      current ? mergeReasoningDetail(current, detail) : { ...detail }
    );
  }
};

// Ordered reasoning blocks for the final assistant message; undefined keeps
// the message shape unchanged for dialects without reasoning_details.
export const materializeReasoningDetails = (
  accumulator: StreamAccumulator
): readonly Readonly<Record<string, unknown>>[] | undefined => {
  if (accumulator.reasoningDetailsByIndex.size === 0) {
    return undefined;
  }
  return Array.from(accumulator.reasoningDetailsByIndex.entries())
    .sort(([left], [right]) => left - right)
    .map(([, detail]) => detail);
};

// Sorted, named-only tool calls in the client contract shape.
export const materializeToolCalls = (
  accumulator: StreamAccumulator
): readonly ClientToolCall[] =>
  Array.from(accumulator.toolCallsByIndex.entries())
    .sort(([left], [right]) => left - right)
    .map(([index, call]) => ({
      argumentsJson: call.arguments,
      id: call.id ?? `call_${index}`,
      name: call.name ?? "",
    }))
    .filter((call) => call.name.length > 0);

const THINKING_FLUSH_MIN_CHARS = 900;
const THINKING_BOUNDARY_MIN_CHARS = 360;
const THINKING_BOUNDARY_REGEX = /(?:\n\n|[.!?。！？…]\s*)$/u;

export interface ReasoningFlusher {
  readonly flush: () => void;
  readonly push: (chunk: string) => void;
}

// Reasoning streams as hundreds of tiny deltas; emitting one thinking event per
// delta renders "letter per line". Buffer and flush only on a size/sentence
// boundary (ported from local-models), plus an explicit flush when content
// starts or the stream ends.
export const createReasoningFlusher = (
  onThinking: (chunk: string) => void
): ReasoningFlusher => {
  let pending = "";
  const flush = (): void => {
    if (pending.length > 0) {
      onThinking(pending);
      pending = "";
    }
  };
  return {
    flush,
    push(chunk: string): void {
      pending += chunk;
      const ready =
        pending.length >= THINKING_FLUSH_MIN_CHARS ||
        (pending.length >= THINKING_BOUNDARY_MIN_CHARS &&
          THINKING_BOUNDARY_REGEX.test(pending.trimEnd()));
      if (ready) {
        flush();
      }
    },
  };
};

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

export interface ThinkTagSplit {
  readonly output: string;
  readonly thinking: string;
}

// Stateful splitter for raw `<think>...</think>` tags in content (some local
// templates), used when the dialect thinkingForm is `think_tags`. Tracks an
// open think block across chunks.
export const createThinkTagSplitter = (): {
  push: (content: string) => ThinkTagSplit;
} => {
  let insideThink = false;
  return {
    push(content: string): ThinkTagSplit {
      let output = "";
      let thinking = "";
      let rest = content;
      while (rest.length > 0) {
        if (insideThink) {
          const close = rest.indexOf(THINK_CLOSE);
          if (close < 0) {
            thinking += rest;
            rest = "";
          } else {
            thinking += rest.slice(0, close);
            rest = rest.slice(close + THINK_CLOSE.length);
            insideThink = false;
          }
        } else {
          const open = rest.indexOf(THINK_OPEN);
          if (open < 0) {
            output += rest;
            rest = "";
          } else {
            output += rest.slice(0, open);
            rest = rest.slice(open + THINK_OPEN.length);
            insideThink = true;
          }
        }
      }
      return { output, thinking };
    },
  };
};
