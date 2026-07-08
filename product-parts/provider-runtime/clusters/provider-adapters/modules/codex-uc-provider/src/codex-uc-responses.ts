import type { ToolDescriptor } from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";
import {
  appendCustomToolInput,
  normalizeResponsesOutputItem,
  setCustomToolInput,
} from "./codex-uc-custom-tool-calls.js";
import {
  CODEX_UC_PHASE_PROTOCOL_INPUT,
  withCodexUcPhaseTool,
} from "./codex-uc-phase-protocol.js";
import { buildCodexUcPromptCacheKey } from "./codex-uc-prompt-cache-key.js";

export interface ResponsesOutputItem {
  readonly arguments?: string;
  readonly call_id?: string;
  readonly content?: readonly {
    readonly text?: string;
    readonly type: string;
  }[];
  readonly id?: string;
  readonly input?: string;
  readonly name?: string;
  readonly role?: string;
  readonly summary?: readonly {
    readonly text?: string;
    readonly type: string;
  }[];
  readonly text?: string;
  readonly type: string;
}

export interface ResponsesParsedStream {
  readonly completed?: {
    readonly id?: string;
    readonly usage?: ResponsesUsage;
  };
  readonly outputItems: readonly ResponsesOutputItem[];
}

export interface ResponsesUsage {
  readonly cached_input_tokens?: number;
  readonly cached_tokens?: number;
  readonly input_tokens?: number;
  readonly input_tokens_details?: {
    readonly cached_input_tokens?: number;
    readonly cached_tokens?: number;
  };
  readonly prompt_tokens_details?: {
    readonly cached_input_tokens?: number;
    readonly cached_tokens?: number;
  };
  readonly total_tokens?: number;
}

export type ResponsesInputItem =
  | Readonly<Record<string, unknown>>
  | { readonly content: string; readonly role: "user" }
  | {
      readonly content: readonly {
        readonly text: string;
        readonly type: string;
      }[];
      readonly role: "assistant";
    }
  | {
      readonly arguments: string;
      readonly call_id: string;
      readonly name: string;
      readonly type: "function_call";
    }
  | {
      readonly call_id: string;
      readonly output: string;
      readonly type: "function_call_output";
    };

export interface CodexUcResponsesRequest {
  readonly include?: readonly unknown[];
  readonly input: readonly ResponsesInputItem[];
  readonly instructions: string;
  readonly model: string;
  readonly parallel_tool_calls?: boolean;
  readonly prompt_cache_key?: string;
  readonly reasoning?: Readonly<Record<string, unknown>>;
  readonly store?: boolean;
  readonly stream?: boolean;
  readonly tool_choice?: unknown;
  readonly tools: readonly Readonly<Record<string, unknown>>[];
  readonly [key: string]: unknown;
}

interface ResponsesFunctionTool {
  readonly description: string;
  readonly name: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly type: "function";
  readonly [key: string]: unknown;
}

export const buildCodexUcResponsesRequest = (input: {
  readonly instructions: string;
  readonly items: readonly ResponsesInputItem[];
  readonly model: string;
  readonly nativeInputPrefix?: readonly Readonly<Record<string, unknown>>[];
  readonly nativeTools?: readonly Readonly<Record<string, unknown>>[];
  readonly reasoningEffort?: string | null;
  readonly requestTemplate?: Readonly<Record<string, unknown>>;
  readonly tools: readonly ToolDescriptor[];
}): CodexUcResponsesRequest => {
  const template = sanitizeCodexUcRequestTemplate(input.requestTemplate ?? {});
  const model =
    typeof template.model === "string" && template.model.trim()
      ? template.model
      : input.model;
  const nativeTools = withCodexUcPhaseTool(
    input.nativeTools ?? input.tools.map(toResponsesTool)
  );
  const inputItems = [
    ...(input.nativeInputPrefix ?? []),
    CODEX_UC_PHASE_PROTOCOL_INPUT,
    ...input.items,
  ];
  const templateRemainder = omitCodexUcKnownTemplateFields(template);
  const templateReasoning = isRecord(template.reasoning)
    ? template.reasoning
    : undefined;
  const reasoning =
    templateReasoning || input.reasoningEffort
      ? toCodexUcReasoning({
          ...(templateReasoning ?? {}),
          ...(input.reasoningEffort ? { effort: input.reasoningEffort } : {}),
        })
      : undefined;
  const toolChoice = template.tool_choice ?? "auto";
  const parallelToolCalls =
    typeof template.parallel_tool_calls === "boolean"
      ? template.parallel_tool_calls
      : false;
  const store = typeof template.store === "boolean" ? template.store : false;
  const stream = typeof template.stream === "boolean" ? template.stream : true;
  const include = Array.isArray(template.include)
    ? template.include
    : ["reasoning.encrypted_content"];
  const promptCacheKey = buildCodexUcPromptCacheKey({
    include,
    instructions: input.instructions,
    model,
    parallelToolCalls,
    reasoning,
    store,
    text: template.text,
    toolChoice,
    inputPrefix: [
      ...(input.nativeInputPrefix ?? []),
      CODEX_UC_PHASE_PROTOCOL_INPUT,
    ],
    tools: nativeTools,
  });
  return {
    model,
    instructions: input.instructions,
    tools: nativeTools,
    prompt_cache_key: promptCacheKey,
    input: inputItems,
    tool_choice: toolChoice,
    parallel_tool_calls: parallelToolCalls,
    ...(reasoning ? { reasoning } : {}),
    store,
    stream,
    include,
    ...(template.text === undefined ? {} : { text: template.text }),
    ...templateRemainder,
  };
};

function sanitizeCodexUcRequestTemplate(
  template: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  const { type: _type, ...supportedTemplate } = template;
  return supportedTemplate;
}

function omitCodexUcKnownTemplateFields(
  template: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  const {
    include: _include,
    model: _model,
    parallel_tool_calls: _parallelToolCalls,
    prompt_cache_key: _promptCacheKey,
    reasoning: _reasoning,
    store: _store,
    stream: _stream,
    text: _text,
    tool_choice: _toolChoice,
    ...remainder
  } = template;
  return remainder;
}

function toCodexUcReasoning(
  reasoning: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  return { ...reasoning, summary: "detailed" };
}

export function parseResponsesStream(
  text: string,
  callbacks: {
    readonly onReasoningDelta?: (text: string) => void;
    readonly onTextDelta: (text: string) => void;
  }
): ResponsesParsedStream {
  const outputItems: ResponsesOutputItem[] = [];
  const customToolInputs = new Map<string, string>();
  let completed: ResponsesParsedStream["completed"];
  for (const block of text.split("\n\n")) {
    const event = readSseEvent(block);
    if (!event) {
      continue;
    }
    const result = handleResponsesEvent(event, callbacks, customToolInputs);
    if (result.outputItem) {
      outputItems.push(result.outputItem);
    }
    if (result.completed) {
      completed = result.completed;
    }
  }
  return { completed, outputItems };
}

function readSseEvent(
  block: string
): { data: Record<string, unknown>; name: string } | null {
  const lines = block.split("\n");
  const name = lines.find((line) => line.startsWith("event: "))?.slice(7);
  const data = lines
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .join("\n");
  if (!(name && data)) {
    return null;
  }
  return { data: JSON.parse(data) as Record<string, unknown>, name };
}

function handleResponsesEvent(
  event: { data: Record<string, unknown>; name: string },
  callbacks: {
    readonly onReasoningDelta?: (text: string) => void;
    readonly onTextDelta: (text: string) => void;
  },
  customToolInputs: Map<string, string>
): {
  completed?: ResponsesParsedStream["completed"];
  outputItem?: ResponsesOutputItem;
} {
  emitDelta(event, callbacks);
  if (event.name === "response.custom_tool_call_input.delta") {
    appendCustomToolInput(event.data, customToolInputs);
  }
  if (event.name === "response.custom_tool_call_input.done") {
    setCustomToolInput(event.data, customToolInputs);
  }
  if (event.name === "response.output_item.done" && isRecord(event.data.item)) {
    const outputItem = normalizeResponsesOutputItem(
      event.data.item as unknown as ResponsesOutputItem,
      event.data,
      customToolInputs
    );
    emitReasoningItem(outputItem, callbacks);
    return { outputItem };
  }
  if (event.name === "response.completed" && isRecord(event.data.response)) {
    return {
      completed: event.data.response as ResponsesParsedStream["completed"],
    };
  }
  return {};
}

function emitDelta(
  event: { data: Record<string, unknown>; name: string },
  callbacks: {
    readonly onReasoningDelta?: (text: string) => void;
    readonly onTextDelta: (text: string) => void;
  }
): void {
  if (isTextDeltaEvent(event.name)) {
    const delta = readFirstText(event.data.delta, event.data.text);
    if (delta) {
      callbacks.onTextDelta(delta);
    }
  }
  if (isReasoningDeltaEvent(event.name)) {
    const delta = readFirstText(
      event.data.delta,
      event.data.text,
      event.data.summary_text,
      event.data.summary,
      event.data.part,
      event.data.content
    );
    if (delta) {
      callbacks.onReasoningDelta?.(delta);
    }
  }
}

function emitReasoningItem(
  item: ResponsesOutputItem,
  callbacks: {
    readonly onReasoningDelta?: (text: string) => void;
  }
): void {
  if (item.type !== "reasoning") {
    return;
  }
  for (const reasoningText of readReasoningItemTexts(item)) {
    callbacks.onReasoningDelta?.(reasoningText);
  }
}

function isTextDeltaEvent(name: string): boolean {
  return name === "response.output_text.delta";
}

function isReasoningDeltaEvent(name: string): boolean {
  return (
    name === "response.reasoning_text.delta" ||
    name === "response.reasoning_summary.delta" ||
    name === "response.reasoning_summary_text.delta" ||
    name === "response.reasoning.delta" ||
    name === "response.reasoning_part.added" ||
    name === "response.reasoning_summary_part.added" ||
    (name.includes("reasoning") && name.endsWith(".delta"))
  );
}

function readReasoningItemTexts(item: ResponsesOutputItem): string[] {
  const texts: string[] = [];
  const itemText = readString(item.text);
  if (itemText) {
    texts.push(itemText);
  }
  for (const part of item.summary ?? []) {
    const text = readString(part.text);
    if (text) {
      texts.push(text);
    }
  }
  for (const part of item.content ?? []) {
    const text = readString(part.text);
    if (text) {
      texts.push(text);
    }
  }
  return texts;
}

export function toInputItem(
  item: ResponsesOutputItem
): ResponsesInputItem | null {
  if (isFunctionCall(item)) {
    return {
      arguments: item.arguments,
      call_id: item.call_id,
      name: item.name,
      type: "function_call",
    };
  }
  if (item.type === "message" && item.role === "assistant") {
    return {
      content: (item.content ?? []).map((part) => ({
        text: part.text ?? "",
        type: part.type,
      })),
      role: "assistant",
    };
  }
  return null;
}

export function isInputItem(
  item: ResponsesInputItem | null
): item is ResponsesInputItem {
  return item !== null;
}

export function isFunctionCall(
  item: ResponsesOutputItem
): item is ResponsesOutputItem & {
  readonly arguments: string;
  readonly call_id: string;
  readonly name: string;
} {
  return (
    (item.type === "function_call" || item.type === "custom_tool_call") &&
    typeof item.arguments === "string" &&
    typeof item.call_id === "string" &&
    typeof item.name === "string"
  );
}

export function readCachedInputTokens(
  usage: ResponsesUsage | undefined
): number | null {
  const value =
    readNumber(usage?.input_tokens_details?.cached_tokens) ??
    readNumber(usage?.input_tokens_details?.cached_input_tokens) ??
    readNumber(usage?.prompt_tokens_details?.cached_tokens) ??
    readNumber(usage?.prompt_tokens_details?.cached_input_tokens) ??
    readNumber(usage?.cached_tokens) ??
    readNumber(usage?.cached_input_tokens);
  return value === null || value < 0 ? null : value;
}

export class CodexUcReasoningBuffer {
  private content = "";

  append(delta: string): void {
    if (this.content && delta.startsWith(this.content)) {
      this.content = delta;
      return;
    }
    if (this.content.endsWith(delta)) {
      return;
    }
    this.content += delta;
  }

  flush(): string | null {
    const content = this.content.trim();
    this.content = "";
    return content || null;
  }
}

function toResponsesTool(tool: ToolDescriptor): ResponsesFunctionTool {
  return {
    description: tool.description,
    name: tool.qualifiedName,
    parameters: tool.parametersSchema,
    type: "function",
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readFirstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = readText(value);
    if (text) {
      return text;
    }
  }
  return null;
}

function readText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const joined = value.map(readText).filter(Boolean).join("");
    return joined || null;
  }
  if (!isRecord(value)) {
    return null;
  }
  return readFirstText(
    value.text,
    value.output_text,
    value.summary_text,
    value.content,
    value.summary
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
