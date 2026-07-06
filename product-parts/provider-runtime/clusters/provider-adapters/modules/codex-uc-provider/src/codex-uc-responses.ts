import type { ToolDescriptor } from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";

export interface ResponsesOutputItem {
  readonly arguments?: string;
  readonly call_id?: string;
  readonly content?: readonly {
    readonly text?: string;
    readonly type: string;
  }[];
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
  readonly include: readonly string[];
  readonly input: readonly ResponsesInputItem[];
  readonly instructions: string;
  readonly model: string;
  readonly parallel_tool_calls: false;
  readonly reasoning?: {
    readonly effort: string;
    readonly summary: "detailed";
  };
  readonly store: false;
  readonly stream: true;
  readonly tool_choice: "auto";
  readonly tools: readonly ResponsesFunctionTool[];
}

interface ResponsesFunctionTool {
  readonly description: string;
  readonly name: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly type: "function";
}

export const buildCodexUcResponsesRequest = (input: {
  readonly instructions: string;
  readonly items: readonly ResponsesInputItem[];
  readonly model: string;
  readonly reasoningEffort?: string | null;
  readonly tools: readonly ToolDescriptor[];
}): CodexUcResponsesRequest => ({
  include: ["reasoning.encrypted_content"],
  input: input.items,
  instructions: input.instructions,
  model: input.model,
  parallel_tool_calls: false,
  ...(input.reasoningEffort
    ? { reasoning: { effort: input.reasoningEffort, summary: "detailed" } }
    : {}),
  store: false,
  stream: true,
  tool_choice: "auto",
  tools: input.tools.map(toResponsesTool),
});

export function parseResponsesStream(
  text: string,
  callbacks: {
    readonly onReasoningDelta?: (text: string) => void;
    readonly onTextDelta: (text: string) => void;
  }
): ResponsesParsedStream {
  const outputItems: ResponsesOutputItem[] = [];
  let completed: ResponsesParsedStream["completed"];
  for (const block of text.split("\n\n")) {
    const event = readSseEvent(block);
    if (!event) {
      continue;
    }
    const result = handleResponsesEvent(event, callbacks);
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
  }
): {
  completed?: ResponsesParsedStream["completed"];
  outputItem?: ResponsesOutputItem;
} {
  emitDelta(event, callbacks);
  if (event.name === "response.output_item.done" && isRecord(event.data.item)) {
    const outputItem = event.data.item as unknown as ResponsesOutputItem;
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
    item.type === "function_call" &&
    typeof item.arguments === "string" &&
    typeof item.call_id === "string" &&
    typeof item.name === "string"
  );
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
