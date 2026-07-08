export const CODEX_UC_FINAL_ANSWER_TOOL_NAME = "final_answer";

export const CODEX_UC_PHASE_PROTOCOL_INPUT = {
  content: [
    {
      text: [
        "<codex_uc_phase_protocol>",
        "Use ordinary assistant output only for commentary/progress updates.",
        "A CodexUC turn is not complete until you call the `final_answer` tool.",
        "Call `final_answer` exactly once when the task is genuinely complete or blocked and the final user-facing answer is ready.",
        "Do not use commentary text as a substitute for `final_answer`.",
        "</codex_uc_phase_protocol>",
      ].join("\n"),
      type: "input_text",
    },
  ],
  role: "developer",
  type: "message",
} as const;

export const CODEX_UC_PHASE_CONTINUATION_TEXT =
  "CodexUC phase protocol: your previous assistant output was commentary only and did not call `final_answer`. Continue with the next required tool call, or call `final_answer` only if the task is genuinely complete or blocked and the final user-facing answer is ready.";

const CODEX_UC_FINAL_ANSWER_TOOL = {
  description:
    "Protocol-only final answer signal for CodexUC. Call this exactly once when the task is genuinely complete or blocked and the final user-facing answer is ready. Ordinary assistant output is commentary and does not complete the turn.",
  name: CODEX_UC_FINAL_ANSWER_TOOL_NAME,
  parameters: {
    additionalProperties: false,
    properties: {
      answer: {
        description: "The final user-facing answer.",
        type: "string",
      },
    },
    required: ["answer"],
    type: "object",
  },
  type: "function",
} as const;

export function withCodexUcPhaseTool(
  tools: readonly Readonly<Record<string, unknown>>[]
): readonly Readonly<Record<string, unknown>>[] {
  if (tools.some((tool) => tool.name === CODEX_UC_FINAL_ANSWER_TOOL_NAME)) {
    return tools;
  }
  return [...tools, CODEX_UC_FINAL_ANSWER_TOOL];
}

export function isCodexUcFinalAnswerCall(item: {
  readonly arguments?: unknown;
  readonly call_id?: unknown;
  readonly name?: unknown;
  readonly type: string;
}): item is {
  readonly arguments: string;
  readonly call_id: string;
  readonly name: string;
  readonly type: string;
} {
  return (
    (item.type === "function_call" || item.type === "custom_tool_call") &&
    typeof item.arguments === "string" &&
    typeof item.call_id === "string" &&
    item.name === CODEX_UC_FINAL_ANSWER_TOOL_NAME
  );
}

export function readCodexUcFinalAnswer(item: {
  readonly arguments: string;
}): string {
  try {
    const parsed = JSON.parse(item.arguments) as { readonly answer?: unknown };
    if (typeof parsed.answer === "string") {
      return parsed.answer;
    }
  } catch {
    // Keep the raw arguments visible if the model violates the schema.
  }
  return item.arguments;
}

export function toCodexUcAssistantInputItem(
  content: string
): Readonly<Record<string, unknown>> {
  return {
    content: [{ text: content, type: "output_text" }],
    role: "assistant",
  };
}

export function codexUcPhaseContinuationInput(): Readonly<
  Record<string, unknown>
> {
  return {
    content: [
      {
        text: CODEX_UC_PHASE_CONTINUATION_TEXT,
        type: "input_text",
      },
    ],
    role: "developer",
    type: "message",
  };
}
