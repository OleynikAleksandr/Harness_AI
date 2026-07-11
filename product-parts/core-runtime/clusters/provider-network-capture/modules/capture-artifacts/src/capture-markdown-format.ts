import type {
  CapturedNativeRequest,
  NativeCaptureAppliedInputEnvelope,
  NativeCaptureDiagnosticRecord,
  NativeCaptureFailureReason,
  NativeCaptureProviderId,
} from "./capture-artifacts-facade.js";

export type NativeCaptureSectionName = "messages" | "system" | "tools";

export interface NativeCaptureSection {
  readonly content?: unknown;
  readonly payload?: unknown;
  readonly section: NativeCaptureSectionName;
  readonly type: "section_extract";
}

export interface NativeCaptureMarkdownOptions {
  readonly appliedInputEnvelope: NativeCaptureAppliedInputEnvelope | null;
  readonly capturedRequests: readonly CapturedNativeRequest[];
  readonly diagnosticRecordCount: number;
  readonly diagnosticRecords: readonly NativeCaptureDiagnosticRecord[];
  readonly diagnosticsJsonlPath: string;
  readonly failureReason: NativeCaptureFailureReason | null;
  readonly generatedAt: string;
  readonly jsonlPath: string;
  readonly providerId: NativeCaptureProviderId;
  readonly rawRecordCount: number;
  readonly selectedModelId: string | null;
}

export function extractCaptureSections(
  body: unknown
): readonly NativeCaptureSection[] {
  if (!isRecord(body)) {
    return [];
  }
  const sections: NativeCaptureSection[] = [];
  const input = messagesArray(body.input);
  const embeddedCodexSystemMessage = input.find(isCodexSystemMessage) ?? null;
  if ("system" in body) {
    sections.push({
      type: "section_extract",
      section: "system",
      content: body.system,
    });
  } else if ("instructions" in body) {
    sections.push({
      type: "section_extract",
      section: "system",
      content: body.instructions,
    });
  } else {
    const systemMessage =
      findSystemMessageContent(body.messages) ??
      embeddedCodexSystemMessage?.content;
    if (systemMessage !== undefined) {
      sections.push({
        type: "section_extract",
        section: "system",
        content: systemMessage,
      });
    }
  }
  if ("tools" in body) {
    sections.push({
      type: "section_extract",
      section: "tools",
      payload: body.tools,
    });
  } else {
    const embeddedCodexTools = findCodexAdditionalTools(input);
    if (embeddedCodexTools.length > 0) {
      sections.push({
        type: "section_extract",
        section: "tools",
        payload: embeddedCodexTools,
      });
    }
  }
  if ("messages" in body) {
    sections.push({
      type: "section_extract",
      section: "messages",
      payload: body.messages,
    });
  } else if ("input" in body) {
    sections.push({
      type: "section_extract",
      section: "messages",
      payload: input.filter(
        (message) =>
          message !== embeddedCodexSystemMessage &&
          message.type !== "additional_tools"
      ),
    });
  }
  return sections;
}

export function buildNativeRequestCaptureMarkdown(
  options: NativeCaptureMarkdownOptions
): string {
  const request = options.capturedRequests.at(-1) ?? null;
  const sections = request ? extractCaptureSections(request.body) : [];
  const body = isRecord(request?.body) ? request.body : {};
  const title = `${capitalize(options.providerId)} Native Request Capture`;
  return [
    `# ${title}`,
    "",
    `Provider: ${options.providerId}`,
    `Selected model: ${options.selectedModelId ?? "(provider default)"}`,
    "Sent upstream: true",
    "Capture mode: MITM forward transit",
    `Generated at: ${options.generatedAt}`,
    "",
    "## Summary",
    "",
    buildSummary(request, options),
    "",
    "## Captured Upstream Request",
    "",
    request
      ? formatCapturedRequestMetadata(request)
      : "_No upstream request captured._",
    "",
    "## Profile-Relevant Payload",
    "",
    "### 1. System Prompt",
    "",
    formatPromptValue(findSection(sections, "system")?.content),
    "",
    "### 2. Tool Declarations",
    "",
    formatToolDeclarations(findSection(sections, "tools")?.payload),
    "",
    "### 3. Developer Context: Permissions, Skills, Plugins",
    "",
    formatDeveloperMessages(findSection(sections, "messages")?.payload),
    "",
    "## Request Context",
    "",
    formatNonDeveloperMessages(findSection(sections, "messages")?.payload),
    "",
    "## Request Parameters",
    "",
    fencedJson(extractRequestParameters(body)),
    "",
    "## Redacted Request Headers",
    "",
    fencedJson(request?.headers ?? {}),
    "",
    "## Applied Harness/Profile Envelope",
    "",
    fencedJson(options.appliedInputEnvelope),
    "",
    "## Diagnostics",
    "",
    formatDiagnostics(options),
    "",
    "## Notes",
    "",
    "- Sensitive local diagnostic artifact. Do not upload or share.",
    "- Credential-bearing headers are redacted by default.",
    "- The JSONL artifact contains only captured upstream request records.",
    "- Local capture lifecycle, proxy events, and adapter diagnostics are preserved in the diagnostics JSONL artifact.",
    "",
  ].join("\n");
}

function buildSummary(
  request: CapturedNativeRequest | null,
  options: NativeCaptureMarkdownOptions
): string {
  if (!request) {
    const lead = options.appliedInputEnvelope
      ? "No HTTP request intercepted (wire-only or envelope-only capture)."
      : "No matching provider model request captured yet.";
    const failure = options.failureReason
      ? `Failure reason: ${options.failureReason}.`
      : lead;
    return [
      failure,
      `Captured upstream request records: ${options.rawRecordCount}.`,
      `Diagnostic records: ${options.diagnosticRecordCount}.`,
    ].join("\n");
  }
  return [
    `Captured provider requests: ${options.capturedRequests.length}.`,
    `Primary request: ${request.method} ${request.target}${request.path}.`,
    `Captured upstream request records: ${options.rawRecordCount}.`,
    `Diagnostic records: ${options.diagnosticRecordCount}.`,
  ].join("\n");
}

function formatCapturedRequestMetadata(request: CapturedNativeRequest): string {
  return [
    `- Method: \`${request.method}\``,
    `- Target: \`${request.target}\``,
    `- Path: \`${request.path}\``,
    `- Captured at: \`${request.timestamp}\``,
  ].join("\n");
}

function formatPromptValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "_No system prompt field found in the captured request._";
  }
  if (typeof value === "string") {
    return fencedText(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry, index) => formatPromptBlock(entry, index + 1))
      .join("\n\n");
  }
  return fencedJson(value);
}

function formatPromptBlock(value: unknown, index: number): string {
  if (typeof value === "string") {
    return [`#### Block ${index}`, "", fencedText(value)].join("\n");
  }
  if (isRecord(value)) {
    const text = textFromContentRecord(value);
    if (text !== null) {
      return [`#### Block ${index}`, "", fencedText(text)].join("\n");
    }
  }
  return [`#### Block ${index}`, "", fencedJson(value)].join("\n");
}

function formatToolDeclarations(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "_No tool declarations found in the captured request._";
  }
  return value
    .map((tool, index) => formatToolDeclaration(tool, index + 1))
    .join("\n\n");
}

function formatToolDeclaration(value: unknown, index: number): string {
  if (!isRecord(value)) {
    return [`#### ${index}. Tool`, "", fencedJson(value)].join("\n");
  }
  const type = stringField(value, "type") ?? "unknown";
  const name = toolName(value) ?? "unnamed";
  const description = toolDescription(value);
  const schema = toolSchema(value);
  const lines = [`#### ${index}. ${name}`, "", `- Type: \`${type}\``];
  if (description) {
    lines.push("", "Description:", "", fencedText(description));
  }
  if (schema !== undefined) {
    lines.push("", "Schema:", "", fencedJson(schema));
  }
  return lines.join("\n");
}

function formatDeveloperMessages(value: unknown): string {
  const messages = messagesArray(value).filter(
    (message) => message.role === "developer"
  );
  if (messages.length === 0) {
    return "_No developer-role message found in the captured request._";
  }
  return messages
    .map((message, index) => formatMessageContent(message, index + 1))
    .join("\n\n");
}

function formatNonDeveloperMessages(value: unknown): string {
  const messages = messagesArray(value).filter(
    (message) => message.role !== "developer" && message.role !== "system"
  );
  if (messages.length === 0) {
    return "_No non-developer request context found in the captured request._";
  }
  return messages
    .map((message, index) => {
      const role = message.role ?? "unknown";
      return [
        `### ${index}. ${role}`,
        "",
        formatMessageContent(message, index),
      ].join("\n");
    })
    .join("\n\n");
}

function formatMessageContent(
  message: Record<string, unknown>,
  fallbackIndex: number
): string {
  const content = message.content;
  if (typeof content === "string") {
    return fencedText(content);
  }
  if (!Array.isArray(content)) {
    return fencedJson(message);
  }
  return content
    .map((entry, index) => formatContentEntry(entry, index + 1, fallbackIndex))
    .join("\n\n");
}

function formatContentEntry(
  value: unknown,
  index: number,
  fallbackIndex: number
): string {
  const heading = `#### Block ${index}`;
  if (typeof value === "string") {
    return [heading, "", fencedText(value)].join("\n");
  }
  if (isRecord(value)) {
    const text = textFromContentRecord(value);
    if (text !== null) {
      return [heading, "", fencedText(text)].join("\n");
    }
  }
  return [`#### Block ${index || fallbackIndex}`, "", fencedJson(value)].join(
    "\n"
  );
}

function formatDiagnostics(options: NativeCaptureMarkdownOptions): string {
  return [
    `- Raw JSONL artifact: \`${options.jsonlPath}\``,
    `- Diagnostics JSONL artifact: \`${options.diagnosticsJsonlPath}\``,
    `- Diagnostic records: ${options.diagnosticRecordCount}`,
    "",
    "Provider/proxy diagnostic records:",
    "",
    formatDiagnosticRecords(options.diagnosticRecords),
  ].join("\n");
}

function formatDiagnosticRecords(
  records: readonly NativeCaptureDiagnosticRecord[]
): string {
  if (records.length === 0) {
    return "_No provider diagnostic context records._";
  }
  return records
    .map((record, index) =>
      [
        `### ${index + 1}. ${record.kind}`,
        "",
        "Payload:",
        "",
        fencedJson(record.payload),
      ].join("\n")
    )
    .join("\n\n");
}

function extractRequestParameters(
  body: Record<string, unknown>
): Record<string, unknown> {
  const excluded = new Set([
    "instructions",
    "system",
    "tools",
    "input",
    "messages",
  ]);
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!excluded.has(key)) {
      params[key] = value;
    }
  }
  return params;
}

function messagesArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function textFromContentRecord(value: Record<string, unknown>): string | null {
  if (typeof value.text === "string") {
    return value.text;
  }
  if (typeof value.content === "string") {
    return value.content;
  }
  return null;
}

function toolName(value: Record<string, unknown>): string | null {
  const direct = stringField(value, "name");
  if (direct) {
    return direct;
  }
  const fn = value.function;
  return isRecord(fn) ? stringField(fn, "name") : null;
}

function toolDescription(value: Record<string, unknown>): string | null {
  const direct = stringField(value, "description");
  if (direct) {
    return direct;
  }
  const fn = value.function;
  return isRecord(fn) ? stringField(fn, "description") : null;
}

function toolSchema(value: Record<string, unknown>): unknown {
  if ("parameters" in value) {
    return value.parameters;
  }
  if ("input_schema" in value) {
    return value.input_schema;
  }
  const fn = value.function;
  if (isRecord(fn) && "parameters" in fn) {
    return fn.parameters;
  }
  if ("format" in value) {
    return value.format;
  }
  return;
}

function stringField(
  value: Record<string, unknown>,
  field: string
): string | null {
  const fieldValue = value[field];
  return typeof fieldValue === "string" && fieldValue.trim()
    ? fieldValue
    : null;
}

function findSection(
  sections: readonly NativeCaptureSection[],
  section: NativeCaptureSectionName
): NativeCaptureSection | null {
  return sections.find((record) => record.section === section) ?? null;
}

function findSystemMessageContent(messages: unknown): unknown {
  const systemMessage = messagesArray(messages).find(
    (message) => message.role === "system"
  );
  return systemMessage?.content;
}

function isCodexSystemMessage(message: Record<string, unknown>): boolean {
  return (
    message.type === "message" &&
    message.role === "developer" &&
    Array.isArray(message.content) &&
    message.content.some(
      (entry) =>
        isRecord(entry) &&
        (textFromContentRecord(entry) ?? "")
          .trimStart()
          .startsWith("You are Codex")
    )
  );
}

function findCodexAdditionalTools(
  input: readonly Record<string, unknown>[]
): readonly unknown[] {
  return input.flatMap((message) =>
    message.type === "additional_tools" && Array.isArray(message.tools)
      ? message.tools
      : []
  );
}

function fencedJson(value: unknown): string {
  return fencedBlock("json", JSON.stringify(value, null, 2));
}

function fencedText(value: string): string {
  return fencedBlock("text", value);
}

function fencedBlock(language: string, value: string): string {
  const longestFence = Math.max(
    2,
    ...Array.from(value.matchAll(/`+/gu), (match) => match[0].length)
  );
  const fence = "`".repeat(longestFence + 1);
  return [`${fence}${language}`, value, fence].join("\n");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
