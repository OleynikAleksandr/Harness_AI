# Dialect Streaming Module

## Responsibility

Own the consolidated SSE + dialect layer of the universal client: read a
provider's `data:` frames, parse each OpenAI-shape `chat.completions` chunk into
one normalized delta (content, thinking, tool-call deltas, usage, model,
finish_reason), accumulate tool calls by index, and normalize the several
provider thinking forms onto one internal channel. This merges the three ported
reference readers (`open-router-sse-reader`, `glm-native-sse-parser`,
`local-models-sse-reader`) into one dialect-driven parser; the agent loop
(`client-core`) drives it. Types plus pure parsing/accumulation; no HTTP here.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.3, 3.4).

## Public Facade

`dialect-streaming-facade.ts`

## Inputs

- A byte stream (`AsyncIterable<Uint8Array>`, e.g. a fetch `Response.body`).
- A `DialectProfile` (from `client-contract`) whose `thinkingForm` selects how
  reasoning is read.

## Outputs

- `readSseDataFrames(body)`: async generator of SSE `data:` payloads (CRLF
  normalized, blank-line frame boundary, trailing frame flushed).
- `parseChatCompletionChunk(data, dialect)`: one payload -> `ParsedStreamDelta`
  (`content` / `thinking` / `toolCallDeltas` / `usage` / `model` /
  `finishReason`) or null for `[DONE]`, blanks and unparseable frames.
  `extractThinking` reads `reasoning_content` (Kimi/GLM), `reasoning`
  (Ollama/OpenRouter, falling back to `reasoning_content`); `think_tags` are
  handled at content level by the splitter, not here.
- `StreamAccumulator` + `createStreamAccumulator` / `applyStreamDelta` /
  `materializeToolCalls`: fold deltas into text parts, tool calls by index
  (args concatenated, id/name from the first delta) and usage/model/finish,
  then produce sorted, named-only `ClientToolCall`s.
- OpenRouter structured reasoning: for `thinkingForm: "reasoning_details"`
  the parser also captures raw `delta.reasoning_details[]` entries; the
  accumulator merges them by `index` (text-like fields `text`/`summary`/
  `data` concatenate, other fields keep the latest value) and
  `materializeReasoningDetails` returns the ordered blocks for the final
  assistant message (undefined when the dialect streamed none). The display
  text keeps flowing through the `reasoning` thinking channel unchanged.
- `createReasoningFlusher(onThinking)`: buffers reasoning and flushes only on a
  size/sentence boundary so thinking is not emitted "letter per line"; the loop
  flushes explicitly when content starts or the stream ends.
- `createThinkTagSplitter()`: stateful `<think>...</think>` splitter for raw
  local templates (`thinkingForm: "think_tags"`), tracking an open block across
  chunks and returning `{ output, thinking }`.
- `StreamUsage` / `ToolCallDelta` / `ParsedStreamDelta` / `ThinkTagSplit`: the
  shared streaming types.

## Owned Paths

- `module.md`
- `src/**`
