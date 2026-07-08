import type { ResponsesOutputItem } from "./codex-uc-responses.js";

export function normalizeResponsesOutputItem(
  item: ResponsesOutputItem,
  eventData: Readonly<Record<string, unknown>>,
  customToolInputs: ReadonlyMap<string, string>
): ResponsesOutputItem {
  if (item.type !== "custom_tool_call") {
    return item;
  }
  const input =
    readString(item.input) ??
    customToolInputs.get(outputItemKey(item, eventData)) ??
    customToolInputs.get(outputIndexKey(eventData)) ??
    "";
  return {
    ...item,
    arguments: toCustomToolArguments(item.name, input),
    input,
  };
}

export function appendCustomToolInput(
  eventData: Readonly<Record<string, unknown>>,
  customToolInputs: Map<string, string>
): void {
  const key = outputItemKey(undefined, eventData);
  const delta = readFirstText(eventData.delta, eventData.input, eventData.text);
  if (!(key && delta)) {
    return;
  }
  customToolInputs.set(key, `${customToolInputs.get(key) ?? ""}${delta}`);
}

export function setCustomToolInput(
  eventData: Readonly<Record<string, unknown>>,
  customToolInputs: Map<string, string>
): void {
  const key = outputItemKey(undefined, eventData);
  const input = readFirstText(eventData.input, eventData.delta, eventData.text);
  if (!(key && input !== null)) {
    return;
  }
  customToolInputs.set(key, input);
}

function outputItemKey(
  item: ResponsesOutputItem | undefined,
  eventData: Readonly<Record<string, unknown>>
): string {
  return (
    readString(item?.id) ??
    readString(eventData.item_id) ??
    readString(eventData.output_item_id) ??
    outputIndexKey(eventData)
  );
}

function outputIndexKey(eventData: Readonly<Record<string, unknown>>): string {
  const outputIndex = readNumber(eventData.output_index);
  return outputIndex === null ? "" : `output_index:${outputIndex}`;
}

function toCustomToolArguments(
  name: string | undefined,
  input: string
): string {
  if (name === "apply_patch") {
    return JSON.stringify({ patch: input });
  }
  if (isJsonObjectText(input)) {
    return input;
  }
  return JSON.stringify({ input });
}

function isJsonObjectText(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed);
  } catch {
    return false;
  }
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
