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
  readonly input_tokens?: number;
  readonly input_tokens_details?: { readonly cached_tokens?: number };
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
  readonly input: readonly ResponsesInputItem[];
  readonly instructions: string;
  readonly model: string;
  readonly parallel_tool_calls: false;
  readonly reasoning?: { readonly effort: string };
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
  input: input.items,
  instructions: input.instructions,
  model: input.model,
  parallel_tool_calls: false,
  ...(input.reasoningEffort
    ? { reasoning: { effort: input.reasoningEffort } }
    : {}),
  store: false,
  stream: true,
  tool_choice: "auto",
  tools: input.tools.map(toResponsesTool),
});

export function parseResponsesStream(
  text: string,
  onDelta: (text: string) => void
): ResponsesParsedStream {
  const outputItems: ResponsesOutputItem[] = [];
  let completed: ResponsesParsedStream["completed"];
  for (const block of text.split("\n\n")) {
    const lines = block.split("\n");
    const name = lines.find((line) => line.startsWith("event: "))?.slice(7);
    const data = lines
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6))
      .join("\n");
    if (!(name && data)) {
      continue;
    }
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (name === "response.output_text.delta") {
      const delta = readString(parsed.delta);
      if (delta) {
        onDelta(delta);
      }
    }
    if (name === "response.output_item.done" && isRecord(parsed.item)) {
      outputItems.push(parsed.item as unknown as ResponsesOutputItem);
    }
    if (name === "response.completed" && isRecord(parsed.response)) {
      completed = parsed.response as ResponsesParsedStream["completed"];
    }
  }
  return { completed, outputItems };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
