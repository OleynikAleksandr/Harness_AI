import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { CodexUcResponsesRequest } from "./codex-uc-responses.js";

interface CodexUcResponseFeedbackInput {
  readonly profileId?: unknown;
  readonly request: CodexUcResponsesRequest;
  readonly responseStatus: number;
  readonly responseText: string;
  readonly sessionId: string;
}

interface ResponseFeedbackEvent {
  readonly event: string;
  readonly id: string | null;
  readonly model: string | null;
  readonly reasoning: unknown;
  readonly status: string | null;
  readonly topLevelKeys: readonly string[];
}

export function recordCodexUcResponseFeedback(
  input: CodexUcResponseFeedbackInput
): void {
  try {
    const record = {
      feedbackEvents: extractCodexUcResponseFeedback(input.responseText),
      profileId: readString(input.profileId),
      providerId: "codex-uc",
      requested: {
        include: input.request.include ?? null,
        model: input.request.model,
        reasoning: input.request.reasoning ?? null,
        store: input.request.store ?? null,
        stream: input.request.stream ?? null,
      },
      requestEnvelope: summarizeRequestEnvelope(input.request),
      responseEventNames: readResponseEventNames(input.responseText),
      responseStatus: input.responseStatus,
      route: "codex-oauth-responses",
      sessionId: input.sessionId,
      timestamp: new Date().toISOString(),
    };
    mkdirSync(codexUcProviderLogDir(), { recursive: true });
    appendFileSync(
      path.join(codexUcProviderLogDir(), "codex-uc-response-feedback.jsonl"),
      `${JSON.stringify(record)}\n`,
      "utf8"
    );
  } catch {
    // Provider diagnostics must never affect the live CodexUC turn.
  }
}

export function extractCodexUcResponseFeedback(
  responseText: string
): ResponseFeedbackEvent[] {
  const feedback: ResponseFeedbackEvent[] = [];
  for (const block of responseText.split("\n\n")) {
    const event = readSseEvent(block);
    if (
      !(
        event &&
        ["response.created", "response.completed"].includes(event.name) &&
        isRecord(event.data.response)
      )
    ) {
      continue;
    }
    const response = event.data.response;
    feedback.push({
      event: event.name,
      id: readString(response.id),
      model: readString(response.model),
      reasoning: isRecord(response.reasoning)
        ? redactJsonValue(response.reasoning)
        : null,
      status: readString(response.status),
      topLevelKeys: Object.keys(response).sort(),
    });
  }
  return feedback;
}

function readResponseEventNames(responseText: string): string[] {
  const names: string[] = [];
  for (const block of responseText.split("\n\n")) {
    const event = readSseEvent(block);
    if (event?.name.startsWith("response.")) {
      names.push(event.name);
    }
  }
  return names;
}

function summarizeRequestEnvelope(
  request: CodexUcResponsesRequest
): Readonly<Record<string, unknown>> {
  return {
    inputBytes: byteLength(request.input),
    inputCount: request.input.length,
    instructionsBytes: Buffer.byteLength(request.instructions, "utf8"),
    instructionsHash: hashString(request.instructions),
    promptCacheKey: request.prompt_cache_key ?? null,
    toolNames: request.tools
      .map((tool) => readToolName(tool))
      .filter((name): name is string => Boolean(name)),
    toolsBytes: byteLength(request.tools),
    toolsCount: request.tools.length,
    toolSummaries: request.tools.map(summarizeTool),
    topLevelKeys: Object.keys(request),
  };
}

function summarizeTool(
  tool: Readonly<Record<string, unknown>>
): Readonly<Record<string, unknown>> {
  return {
    bytes: byteLength(tool),
    hash: hashString(stableJson(tool)),
    name: readToolName(tool),
    type: readToolType(tool),
  };
}

function readToolName(tool: Readonly<Record<string, unknown>>): string | null {
  const name = readString(tool.name);
  if (name) {
    return name;
  }
  return readString(tool.function_name) ?? readString(tool.id);
}

function readToolType(tool: Readonly<Record<string, unknown>>): string | null {
  return readString(tool.type);
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(stableJson(value), "utf8");
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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
  try {
    return { data: JSON.parse(data) as Record<string, unknown>, name };
  } catch {
    return null;
  }
}

function redactJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactJsonValue(item, depth + 1));
  }
  if (!isRecord(value)) {
    return null;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .slice(0, 50)
      .map((key) => [key, redactJsonValue(value[key], depth + 1)])
  );
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codexUcProviderLogDir(): string {
  return path.join(harnessHome(), "logs", "providers");
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}
