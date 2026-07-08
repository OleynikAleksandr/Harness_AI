import { createHash } from "node:crypto";

export function buildCodexUcPromptCacheKey(input: {
  readonly include: readonly unknown[];
  readonly instructions: string;
  readonly inputPrefix: readonly Readonly<Record<string, unknown>>[];
  readonly model: string;
  readonly parallelToolCalls: boolean;
  readonly reasoning?: Readonly<Record<string, unknown>>;
  readonly store: boolean;
  readonly text?: unknown;
  readonly toolChoice: unknown;
  readonly tools: readonly Readonly<Record<string, unknown>>[];
}): string {
  const staticPrefix = stableJson({
    include: input.include,
    instructions: input.instructions,
    inputPrefix: input.inputPrefix,
    model: input.model,
    parallel_tool_calls: input.parallelToolCalls,
    reasoning: input.reasoning ?? null,
    store: input.store,
    text: input.text ?? null,
    tool_choice: input.toolChoice,
    tools: input.tools,
  });
  return `pck_${createHash("sha256").update(staticPrefix).digest("hex").slice(0, 24)}`;
}

function stableJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (!isRecord(value)) {
    return JSON.stringify(null);
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
