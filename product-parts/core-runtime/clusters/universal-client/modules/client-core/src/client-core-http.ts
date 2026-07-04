// One model call for the agent loop: build the OpenAI-shape chat.completions
// request from history + tools + dialect, POST it, stream the response through
// dialect-streaming, and return the assembled content + tool calls. Retries
// 429/5xx/network with backoff + Retry-After; never retries auth or context
// overflow. Contract: docs/architecture/UniversalClient.md sections 3.1 / 3.3.

import type {
  ClientErrorReason,
  ClientMessage,
  ClientToolCall,
  DialectProfile,
  ToolDescriptor,
} from "../../client-contract/src/client-contract-facade.js";
import {
  applyStreamDelta,
  createReasoningFlusher,
  createStreamAccumulator,
  materializeToolCalls,
  parseChatCompletionChunk,
  readSseDataFrames,
  type StreamUsage,
} from "../../dialect-streaming/src/dialect-streaming-facade.js";

const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 2000;
const TRAILING_SLASH_PATTERN = /\/$/u;
const CONTEXT_ERROR_PATTERN = /context|token/iu;
const RESERVED_EXTRA_BODY_KEYS = new Set([
  "messages",
  "model",
  "parallel_tool_calls",
  "stream",
  "stream_options",
  "tool_choice",
  "tools",
]);

// A typed loop error carrying the normalized reason (mapped to turn_failed).
// retryAfterMs is set from a Retry-After header on retryable responses.
export class ClientTurnError extends Error {
  readonly reason: ClientErrorReason;
  retryAfterMs?: number;
  constructor(reason: ClientErrorReason, message: string) {
    super(message);
    this.name = "ClientTurnError";
    this.reason = reason;
  }
}

export interface ModelCallResult {
  readonly content: string;
  readonly finishReason?: string;
  readonly toolCalls: readonly ClientToolCall[];
  readonly usage?: StreamUsage;
}

const isTerminal = (reason: ClientErrorReason): boolean =>
  reason === "auth_failed" || reason === "context_overflow";

const toWireMessage = (message: ClientMessage): Record<string, unknown> => ({
  content: message.content,
  role: message.role,
  ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
  ...(message.toolCalls
    ? {
        tool_calls: message.toolCalls.map((call) => ({
          function: { arguments: call.argumentsJson, name: call.name },
          id: call.id,
          type: "function",
        })),
      }
    : {}),
});

const toWireTool = (tool: ToolDescriptor): Record<string, unknown> => ({
  function: {
    description: tool.description,
    name: tool.name,
    parameters: tool.parametersSchema,
  },
  type: "function",
});

const filterExtraBody = (
  extraBody?: Readonly<Record<string, unknown>>
): Record<string, unknown> => {
  if (!extraBody) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(extraBody).filter(
      ([key]) => !RESERVED_EXTRA_BODY_KEYS.has(key)
    )
  );
};

const buildRequestBody = (
  model: string,
  messages: readonly ClientMessage[],
  tools: readonly ToolDescriptor[],
  dialect: DialectProfile,
  extraBody?: Readonly<Record<string, unknown>>
): Record<string, unknown> => ({
  ...filterExtraBody(extraBody),
  messages: messages.map(toWireMessage),
  model,
  stream: true,
  stream_options: { include_usage: true },
  ...(tools.length > 0
    ? {
        tools: tools.map(toWireTool),
        ...(dialect.toolChoiceSupport === "unsupported"
          ? {}
          : { tool_choice: "auto" }),
      }
    : {}),
});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Non-2xx classification. 429/5xx are retryable; 401/403 auth and 4xx overflow
// are terminal.
const errorFromStatus = (status: number, bodyText: string): ClientTurnError => {
  if (status === 401 || status === 403) {
    return new ClientTurnError(
      "auth_failed",
      `Auth failed (${status}): ${bodyText}`
    );
  }
  if (status === 429) {
    return new ClientTurnError("rate_limited", `Rate limited: ${bodyText}`);
  }
  if (status === 400 && CONTEXT_ERROR_PATTERN.test(bodyText)) {
    return new ClientTurnError("context_overflow", bodyText);
  }
  return new ClientTurnError(
    "provider_error",
    `Provider error (${status}): ${bodyText}`
  );
};

const classifyThrown = (error: unknown): ClientTurnError => {
  if (error instanceof ClientTurnError) {
    return error;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new ClientTurnError("aborted", "The turn was aborted.");
  }
  return new ClientTurnError(
    "network",
    error instanceof Error ? error.message : String(error)
  );
};

const streamResponse = async (
  response: Response,
  dialect: DialectProfile,
  onContent: (chunk: string) => void,
  onThinking: (chunk: string) => void
): Promise<ModelCallResult> => {
  const accumulator = createStreamAccumulator();
  const flusher = createReasoningFlusher(onThinking);
  const body = response.body as AsyncIterable<Uint8Array> | null;
  if (!body) {
    throw new ClientTurnError("provider_error", "Response had no body.");
  }
  for await (const frame of readSseDataFrames(body)) {
    const delta = parseChatCompletionChunk(frame, dialect);
    if (!delta) {
      continue;
    }
    if (delta.content) {
      flusher.flush();
      onContent(delta.content);
    }
    if (delta.thinking) {
      flusher.push(delta.thinking);
    }
    applyStreamDelta(accumulator, delta);
  }
  flusher.flush();
  if (accumulator.finishReason === "model_context_window_exceeded") {
    throw new ClientTurnError("context_overflow", "Context window exceeded.");
  }
  return {
    content: accumulator.textParts.join(""),
    toolCalls: materializeToolCalls(accumulator),
    ...(accumulator.finishReason
      ? { finishReason: accumulator.finishReason }
      : {}),
    ...(accumulator.usage ? { usage: accumulator.usage } : {}),
  };
};

export interface ModelCallParams {
  readonly apiKey?: string;
  readonly dialect: DialectProfile;
  readonly extraBody?: Readonly<Record<string, unknown>>;
  readonly messages: readonly ClientMessage[];
  readonly model: string;
  readonly onContent: (chunk: string) => void;
  readonly onThinking: (chunk: string) => void;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

// One HTTP attempt: streams on 2xx, otherwise throws a classified error (with
// retryAfterMs attached for retryable statuses).
const attemptCall = async (
  url: string,
  body: string,
  params: ModelCallParams
): Promise<ModelCallResult> => {
  const response = await fetch(url, {
    body,
    headers: {
      "content-type": "application/json",
      ...(params.apiKey ? { authorization: `Bearer ${params.apiKey}` } : {}),
      ...params.dialect.extraHeaders,
    },
    method: "POST",
    signal: params.signal,
  });
  if (response.ok) {
    return await streamResponse(
      response,
      params.dialect,
      params.onContent,
      params.onThinking
    );
  }
  const error = errorFromStatus(response.status, await response.text());
  const header = response.headers.get("retry-after");
  const seconds = header ? Number.parseInt(header, 10) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) {
    error.retryAfterMs = seconds * 1000;
  }
  throw error;
};

export const callModel = async (
  params: ModelCallParams
): Promise<ModelCallResult> => {
  const url = `${params.dialect.baseUrl.replace(TRAILING_SLASH_PATTERN, "")}/chat/completions`;
  const body = JSON.stringify(
    buildRequestBody(
      params.model,
      params.messages,
      params.tools,
      params.dialect,
      params.extraBody
    )
  );
  let lastError = new ClientTurnError("network", "No attempt made.");
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await attemptCall(url, body, params);
    } catch (raw) {
      const error = classifyThrown(raw);
      if (isTerminal(error.reason)) {
        throw error;
      }
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(error.retryAfterMs ?? BASE_BACKOFF_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
};
