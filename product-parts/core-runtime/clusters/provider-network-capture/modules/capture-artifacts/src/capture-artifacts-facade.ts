import { promises as fs } from "node:fs";
import path from "node:path";

// Providers whose native request Harness AI can capture. GLM Native needs no
// capture: our own adapter owns its system message and tool schemas.
export type NativeCaptureProviderId = "claude" | "codex" | "kimi";

export type NativeCaptureFailureReason =
  | "provider_not_supported"
  | "runtime_failed"
  | "target_not_seen"
  | "timeout"
  | "tls_trust_failed";

export interface CapturedNativeRequest {
  readonly body: unknown;
  readonly bodyText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
  readonly target: string;
  readonly timestamp: string;
}

export type NativeCaptureSectionName = "messages" | "system" | "tools";

export interface NativeCaptureSection {
  readonly content?: unknown;
  readonly payload?: unknown;
  readonly section: NativeCaptureSectionName;
  readonly type: "section_extract";
}

export interface NativeCaptureArtifacts {
  readonly jsonlPath: string;
  readonly markdownPath: string;
}

interface NativeCaptureWriterOptions {
  readonly captureId: string;
  readonly clock?: () => Date;
  readonly outputDir: string;
  readonly providerId: NativeCaptureProviderId;
  readonly releaseVersion?: string | null;
  readonly selectedModelId?: string | null;
}

const CREDENTIAL_HEADER_PATTERN =
  /(^authorization$|^cookie$|^set-cookie$|api-key|token|secret|session|credential|oauth|account-id)/iu;
const STAINLESS_HEADER_PATTERN = /^x-stainless-/iu;
const STAINLESS_CREDENTIAL_VALUE_PATTERN =
  /(bearer|token|secret|credential|oauth|session)/iu;
const ARTIFACT_STEM_TIME_PATTERN = /[:.]/gu;
const ARTIFACT_MODEL_UNSAFE_PATTERN = /[^a-zA-Z0-9._-]+/gu;

export const REDACTED_CAPTURE_HEADER_VALUE = "[REDACTED]";

// A filename-safe segment for the selected model, or "" when no model was
// chosen, so dumps for different models are distinguishable on disk.
function modelFilenameSegment(modelId: string | null | undefined): string {
  const trimmed = modelId?.trim();
  if (!trimmed) {
    return "";
  }
  return `-${trimmed.replace(ARTIFACT_MODEL_UNSAFE_PATTERN, "-")}`;
}

export function redactCaptureHeaders(
  headers: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = shouldRedactCaptureHeader(name, value)
      ? REDACTED_CAPTURE_HEADER_VALUE
      : value;
  }
  return redacted;
}

// Providers name the fields differently (Anthropic `system`/`messages`,
// OpenAI/Codex `instructions`/`input`, Kimi OpenAI-chat `messages[role=system]`),
// so map them onto one section shape. The Codex WebSocket `response.create`
// frame carries `instructions`, `tools`, and `input` at the top level (its
// `type` field is ignored), so the same mapping extracts a full pair from it.
export function extractCaptureSections(
  body: unknown
): readonly NativeCaptureSection[] {
  if (!isRecord(body)) {
    return [];
  }
  const sections: NativeCaptureSection[] = [];
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
    // Kimi (OpenAI chat shape) has no top-level system field; the system
    // prompt is the first `role: "system"` message.
    const systemMessage = findSystemMessageContent(body.messages);
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
      payload: body.input,
    });
  }
  return sections;
}

// Opaque provider-supplied envelope; recorded and serialized as-is.
export type NativeCaptureAppliedInputEnvelope = unknown;

export interface NativeCaptureDiagnosticRecord {
  readonly kind: string;
  readonly payload: unknown;
}

export interface NativeCaptureMarkdownOptions {
  readonly appliedInputEnvelope: NativeCaptureAppliedInputEnvelope | null;
  readonly capturedRequests: readonly CapturedNativeRequest[];
  readonly diagnosticRecords: readonly NativeCaptureDiagnosticRecord[];
  readonly failureReason: NativeCaptureFailureReason | null;
  readonly generatedAt: string;
  readonly providerId: NativeCaptureProviderId;
  readonly recordCount: number;
  readonly selectedModelId: string | null;
}

export function buildNativeRequestCaptureMarkdown(
  options: NativeCaptureMarkdownOptions
): string {
  const request = options.capturedRequests.at(-1) ?? null;
  const sections = request ? extractCaptureSections(request.body) : [];
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
    "## Request Headers",
    "",
    fencedJson(request?.headers ?? {}),
    "",
    "## Extracted System Prompt",
    "",
    fencedJson(findSection(sections, "system")?.content ?? null),
    "",
    "## Extracted Tool Declarations",
    "",
    fencedJson(findSection(sections, "tools")?.payload ?? null),
    "",
    "## Extracted Messages",
    "",
    fencedJson(findSection(sections, "messages")?.payload ?? null),
    "",
    "## Applied Input Envelope",
    "",
    fencedJson(options.appliedInputEnvelope),
    "",
    "## Diagnostic Context",
    "",
    fencedJson(options.diagnosticRecords),
    "",
    "## Notes",
    "",
    "- Sensitive local diagnostic artifact. Do not upload or share.",
    "- Credential-bearing headers are redacted by default.",
    "- Full raw request bodies are preserved in the JSONL artifact.",
    "",
  ].join("\n");
}

// Append-only JSONL plus a rewritten human-readable markdown twin. Every
// captured request is redacted before it touches disk.
export class NativeRequestCaptureWriter {
  private readonly artifactsValue: NativeCaptureArtifacts;
  private readonly captureId: string;
  private readonly clock: () => Date;
  private readonly providerId: NativeCaptureProviderId;
  private readonly selectedModelId: string | null;
  private readonly capturedRequests: CapturedNativeRequest[] = [];
  private readonly diagnosticRecords: NativeCaptureDiagnosticRecord[] = [];
  private appliedInputEnvelope: NativeCaptureAppliedInputEnvelope | null = null;
  private recordCount = 0;
  private failureReason: NativeCaptureFailureReason | null = null;

  private constructor(
    options: NativeCaptureWriterOptions,
    artifacts: NativeCaptureArtifacts
  ) {
    this.artifactsValue = artifacts;
    this.captureId = options.captureId;
    this.clock = options.clock ?? (() => new Date());
    this.providerId = options.providerId;
    this.selectedModelId = options.selectedModelId ?? null;
  }

  static async create(
    options: NativeCaptureWriterOptions
  ): Promise<NativeRequestCaptureWriter> {
    await fs.mkdir(options.outputDir, { recursive: true });
    const now = options.clock?.() ?? new Date();
    const timestamp = now
      .toISOString()
      .replace(ARTIFACT_STEM_TIME_PATTERN, "-");
    const model = modelFilenameSegment(options.selectedModelId);
    const stem = `${timestamp}-${options.providerId}${model}-native-request`;
    const artifacts: NativeCaptureArtifacts = {
      jsonlPath: path.join(options.outputDir, `${stem}.jsonl`),
      markdownPath: path.join(options.outputDir, `${stem}.md`),
    };
    const writer = new NativeRequestCaptureWriter(options, artifacts);
    await writer.appendRecord({
      type: "capture_start",
      captureId: options.captureId,
      providerId: options.providerId,
      releaseVersion: options.releaseVersion ?? null,
      selectedModelId: options.selectedModelId ?? null,
      sentUpstream: true,
      timestamp: now.toISOString(),
    });
    return writer;
  }

  get artifacts(): NativeCaptureArtifacts {
    return this.artifactsValue;
  }

  async writeCapturedRequest(request: CapturedNativeRequest): Promise<void> {
    const sanitized: CapturedNativeRequest = {
      ...request,
      headers: redactCaptureHeaders(request.headers),
    };
    this.capturedRequests.push(sanitized);
    await this.appendRecord({
      type: "request_captured",
      captureId: this.captureId,
      providerId: this.providerId,
      request: sanitized,
      sentUpstream: true,
    });
    for (const section of extractCaptureSections(request.body)) {
      await this.appendRecord({ captureId: this.captureId, ...section });
    }
    await this.writeMarkdown();
  }

  // Records what the adapter actually applied for the capture turn (proxy or
  // wire-only). This is what makes the Kimi wire-only artifact meaningful even
  // though no HTTP request is intercepted for it.
  async recordAppliedInputEnvelope(
    envelope: NativeCaptureAppliedInputEnvelope
  ): Promise<void> {
    this.appliedInputEnvelope = envelope;
    await this.appendRecord({
      type: "applied_input_envelope",
      captureId: this.captureId,
      providerId: this.providerId,
      envelope,
      sentUpstream: true,
    });
    await this.writeMarkdown();
  }

  async recordDiagnosticContext(
    record: NativeCaptureDiagnosticRecord
  ): Promise<void> {
    this.diagnosticRecords.push(record);
    await this.appendRecord({
      type: "provider_diagnostic_context",
      captureId: this.captureId,
      providerId: this.providerId,
      kind: record.kind,
      payload: record.payload,
      sentUpstream: true,
    });
    await this.writeMarkdown();
  }

  async complete(
    status: "captured" | "failed" | "timeout",
    reason: NativeCaptureFailureReason | null = null
  ): Promise<void> {
    this.failureReason = reason;
    await this.appendRecord({
      type: "capture_end",
      captureId: this.captureId,
      providerId: this.providerId,
      reason,
      sentUpstream: true,
      status,
      timestamp: this.clock().toISOString(),
    });
    await this.writeMarkdown();
  }

  private async appendRecord(record: unknown): Promise<void> {
    this.recordCount += 1;
    await fs.appendFile(
      this.artifactsValue.jsonlPath,
      `${JSON.stringify(record)}\n`,
      "utf8"
    );
  }

  private async writeMarkdown(): Promise<void> {
    const markdown = buildNativeRequestCaptureMarkdown({
      appliedInputEnvelope: this.appliedInputEnvelope,
      capturedRequests: this.capturedRequests,
      diagnosticRecords: this.diagnosticRecords,
      failureReason: this.failureReason,
      generatedAt: this.clock().toISOString(),
      providerId: this.providerId,
      recordCount: this.recordCount,
      selectedModelId: this.selectedModelId,
    });
    await fs.writeFile(this.artifactsValue.markdownPath, markdown, "utf8");
  }
}

function shouldRedactCaptureHeader(name: string, value: string): boolean {
  if (CREDENTIAL_HEADER_PATTERN.test(name)) {
    return true;
  }
  return (
    STAINLESS_HEADER_PATTERN.test(name) &&
    STAINLESS_CREDENTIAL_VALUE_PATTERN.test(value)
  );
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
    return [failure, `JSONL records: ${options.recordCount}.`].join("\n");
  }
  return [
    `Captured provider requests: ${options.capturedRequests.length}.`,
    `Primary request: ${request.method} ${request.target}${request.path}.`,
    `JSONL records: ${options.recordCount}.`,
  ].join("\n");
}

function findSection(
  sections: readonly NativeCaptureSection[],
  section: NativeCaptureSectionName
): NativeCaptureSection | null {
  return sections.find((record) => record.section === section) ?? null;
}

// The `content` of the first `role: "system"` chat message, or undefined when
// there is none (used for the OpenAI/Kimi shape that has no top-level system).
function findSystemMessageContent(messages: unknown): unknown {
  if (!Array.isArray(messages)) {
    return;
  }
  const systemMessage = messages.find(
    (message) => isRecord(message) && message.role === "system"
  );
  return isRecord(systemMessage) ? systemMessage.content : undefined;
}

function fencedJson(value: unknown): string {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
