import { promises as fs } from "node:fs";
import path from "node:path";
import { buildNativeRequestCaptureMarkdown } from "./capture-markdown-format.js";

export type {
  NativeCaptureMarkdownOptions,
  NativeCaptureSection,
  NativeCaptureSectionName,
} from "./capture-markdown-format.js";
export {
  buildNativeRequestCaptureMarkdown,
  extractCaptureSections,
} from "./capture-markdown-format.js";

// Providers whose native request Harness AI can capture today. The writer is
// provider-neutral so universal-client diagnostic paths can reuse the same
// raw JSONL / diagnostics JSONL / readable markdown contract when validating
// selected profile application.
export type NativeCaptureProviderId = "claude" | "codex";

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

export interface NativeCaptureArtifacts {
  readonly diagnosticsJsonlPath: string;
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

// Opaque provider-supplied envelope; recorded and serialized as-is.
export type NativeCaptureAppliedInputEnvelope = unknown;

export interface NativeCaptureDiagnosticRecord {
  readonly kind: string;
  readonly payload: unknown;
}

// Append-only raw JSONL, separate diagnostics JSONL, and a rewritten
// human-readable markdown twin. Every captured request is redacted before it
// touches disk.
export class NativeRequestCaptureWriter {
  private readonly artifactsValue: NativeCaptureArtifacts;
  private readonly captureId: string;
  private readonly clock: () => Date;
  private readonly providerId: NativeCaptureProviderId;
  private readonly selectedModelId: string | null;
  private readonly capturedRequests: CapturedNativeRequest[] = [];
  private readonly diagnosticRecords: NativeCaptureDiagnosticRecord[] = [];
  private appliedInputEnvelope: NativeCaptureAppliedInputEnvelope | null = null;
  private rawRecordCount = 0;
  private diagnosticRecordCount = 0;
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
      diagnosticsJsonlPath: path.join(
        options.outputDir,
        `${stem}.diagnostics.jsonl`
      ),
      jsonlPath: path.join(options.outputDir, `${stem}.jsonl`),
      markdownPath: path.join(options.outputDir, `${stem}.md`),
    };
    const writer = new NativeRequestCaptureWriter(options, artifacts);
    await fs.writeFile(artifacts.jsonlPath, "", "utf8");
    await writer.appendDiagnosticRecord({
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
    await this.appendRawRecord({
      type: "request_captured",
      captureId: this.captureId,
      providerId: this.providerId,
      request: sanitized,
      sentUpstream: true,
    });
    await this.writeMarkdown();
  }

  // Records what the adapter actually applied for the capture turn (proxy or
  // wire-only). This is what makes the Kimi wire-only artifact meaningful even
  // though no HTTP request is intercepted for it.
  async recordAppliedInputEnvelope(
    envelope: NativeCaptureAppliedInputEnvelope
  ): Promise<void> {
    this.appliedInputEnvelope = envelope;
    await this.appendDiagnosticRecord({
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
    await this.appendDiagnosticRecord({
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
    await this.appendDiagnosticRecord({
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

  private async appendRawRecord(record: unknown): Promise<void> {
    this.rawRecordCount += 1;
    await fs.appendFile(
      this.artifactsValue.jsonlPath,
      `${JSON.stringify(record)}\n`,
      "utf8"
    );
  }

  private async appendDiagnosticRecord(record: unknown): Promise<void> {
    this.diagnosticRecordCount += 1;
    await fs.appendFile(
      this.artifactsValue.diagnosticsJsonlPath,
      `${JSON.stringify(record)}\n`,
      "utf8"
    );
  }

  private async writeMarkdown(): Promise<void> {
    const markdown = buildNativeRequestCaptureMarkdown({
      appliedInputEnvelope: this.appliedInputEnvelope,
      capturedRequests: this.capturedRequests,
      diagnosticsJsonlPath: this.artifactsValue.diagnosticsJsonlPath,
      diagnosticRecords: this.diagnosticRecords,
      failureReason: this.failureReason,
      generatedAt: this.clock().toISOString(),
      jsonlPath: this.artifactsValue.jsonlPath,
      providerId: this.providerId,
      rawRecordCount: this.rawRecordCount,
      diagnosticRecordCount: this.diagnosticRecordCount,
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
