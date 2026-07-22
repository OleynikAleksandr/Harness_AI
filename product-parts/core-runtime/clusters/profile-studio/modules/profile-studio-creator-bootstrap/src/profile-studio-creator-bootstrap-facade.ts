import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { ProfileStudioProviderId } from "../../profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";

export type ProfileStudioCaptureProviderId = "claude" | "codex" | "kimi";

export interface ProfileStudioCreatorCaptureRequest {
  readonly modelId: string;
  readonly providerId: ProfileStudioProviderId;
  readonly reasoningEffort?: string;
  readonly workspacePath: string;
}

export interface ProfileStudioNativeCaptureRunner {
  capture(request: {
    readonly modelId: string;
    readonly providerId: ProfileStudioCaptureProviderId;
    readonly reasoningEffort?: string;
    readonly workspacePath: string;
  }): Promise<{
    readonly error: string | null;
    readonly jsonlPath: string | null;
    readonly ok: boolean;
  }>;
}

export interface ProfileStudioCreatorCaptureProvenance {
  readonly captureId: string;
  readonly captureProviderId: ProfileStudioCaptureProviderId;
  readonly rawCapturePath: string;
  readonly rawCaptureSha256: string;
  readonly targetModelId: string;
  readonly targetProviderId: ProfileStudioProviderId;
  readonly targetReasoning: string;
}

export type ProfileStudioCreatorBootstrapResult =
  | { readonly error: string; readonly ok: false }
  | {
      readonly ok: true;
      readonly provenance: ProfileStudioCreatorCaptureProvenance;
    };

interface CaptureStartRecord {
  readonly captureId: string;
  readonly providerId: ProfileStudioCaptureProviderId;
  readonly selectedModelId: string;
  readonly selectedReasoningEffort: string | null;
}

const JSONL_EXTENSION_PATTERN = /\.jsonl$/u;
const LINE_BREAK_PATTERN = /\r?\n/u;

export class ProfileStudioCreatorBootstrapFacade {
  private readonly captureRunner: ProfileStudioNativeCaptureRunner;

  constructor(options: {
    readonly captureRunner: ProfileStudioNativeCaptureRunner;
  }) {
    this.captureRunner = options.captureRunner;
  }

  async prepare(
    request: ProfileStudioCreatorCaptureRequest
  ): Promise<ProfileStudioCreatorBootstrapResult> {
    const captureProviderId = mapTargetToCaptureProvider(request.providerId);
    let capture: Awaited<
      ReturnType<ProfileStudioNativeCaptureRunner["capture"]>
    >;
    try {
      capture = await this.captureRunner.capture({
        modelId: request.modelId,
        providerId: captureProviderId,
        ...(request.reasoningEffort
          ? { reasoningEffort: request.reasoningEffort }
          : {}),
        workspacePath: request.workspacePath,
      });
    } catch (error) {
      return {
        error: `Native Request Capture failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ok: false,
      };
    }
    if (!(capture.ok && capture.jsonlPath)) {
      return {
        error: `Native Request Capture failed: ${capture.error ?? "unknown error"}`,
        ok: false,
      };
    }
    try {
      return {
        ok: true,
        provenance: await validateCapture({
          captureProviderId,
          modelId: request.modelId,
          rawPath: capture.jsonlPath,
          targetProviderId: request.providerId,
        }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      };
    }
  }
}

export function mapTargetToCaptureProvider(
  providerId: ProfileStudioProviderId
): ProfileStudioCaptureProviderId {
  return providerId === "kimi-client" ? "kimi" : providerId;
}

async function validateCapture(input: {
  readonly captureProviderId: ProfileStudioCaptureProviderId;
  readonly modelId: string;
  readonly rawPath: string;
  readonly targetProviderId: ProfileStudioProviderId;
}): Promise<ProfileStudioCreatorCaptureProvenance> {
  const captureRoot = await realpath(resolveNativeCaptureRoot());
  const rawCapturePath = await realpath(input.rawPath);
  assertContained(captureRoot, rawCapturePath);
  if (!rawCapturePath.endsWith("-native-request.jsonl")) {
    throw new Error("Native Request Capture raw artifact has an invalid path.");
  }
  const diagnosticsPath = rawCapturePath.replace(
    JSONL_EXTENSION_PATTERN,
    ".diagnostics.jsonl"
  );
  const [rawContent, diagnosticsContent] = await Promise.all([
    readFile(rawCapturePath, "utf8"),
    readFile(diagnosticsPath, "utf8"),
  ]);
  const rawRecords = parseJsonl(rawContent, "raw");
  const diagnosticRecords = parseJsonl(diagnosticsContent, "diagnostics");
  const start = readCaptureStart(diagnosticRecords);
  validateCaptureEnd(diagnosticRecords, start.captureId);
  validateIdentity(start, input.captureProviderId, input.modelId);
  validateRawRecords(rawRecords, start.captureId, input.captureProviderId);
  return {
    captureId: start.captureId,
    captureProviderId: input.captureProviderId,
    rawCapturePath,
    rawCaptureSha256: createHash("sha256").update(rawContent).digest("hex"),
    targetModelId: input.modelId,
    targetProviderId: input.targetProviderId,
    targetReasoning: start.selectedReasoningEffort ?? "provider-managed",
  };
}

function readCaptureStart(
  records: readonly Readonly<Record<string, unknown>>[]
): CaptureStartRecord {
  const record = records.find(
    (candidate) => candidate.type === "capture_start"
  );
  if (
    !record ||
    typeof record.captureId !== "string" ||
    typeof record.providerId !== "string" ||
    typeof record.selectedModelId !== "string" ||
    !(
      record.selectedReasoningEffort === null ||
      typeof record.selectedReasoningEffort === "string"
    )
  ) {
    throw new Error("Native Request Capture start record is incomplete.");
  }
  return record as unknown as CaptureStartRecord;
}

function validateCaptureEnd(
  records: readonly Readonly<Record<string, unknown>>[],
  captureId: string
): void {
  const completed = records.some(
    (record) =>
      record.type === "capture_end" &&
      record.captureId === captureId &&
      record.status === "captured"
  );
  if (!completed) {
    throw new Error("Native Request Capture did not complete successfully.");
  }
}

function validateIdentity(
  start: CaptureStartRecord,
  providerId: ProfileStudioCaptureProviderId,
  modelId: string
): void {
  if (start.providerId !== providerId || start.selectedModelId !== modelId) {
    throw new Error("Native Request Capture target identity does not match.");
  }
}

function validateRawRecords(
  records: readonly Readonly<Record<string, unknown>>[],
  captureId: string,
  providerId: ProfileStudioCaptureProviderId
): void {
  const captured = records.some(
    (record) =>
      record.type === "request_captured" &&
      record.captureId === captureId &&
      record.providerId === providerId &&
      isPlainRecord(record.request)
  );
  if (!captured) {
    throw new Error("Native Request Capture contains no captured request.");
  }
}

function parseJsonl(
  content: string,
  label: string
): readonly Readonly<Record<string, unknown>>[] {
  const lines = content
    .split(LINE_BREAK_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`Native Request Capture ${label} JSONL is empty.`);
  }
  return lines.map((line) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Native Request Capture ${label} JSONL is invalid.`);
    }
    if (!isPlainRecord(parsed)) {
      throw new Error(
        `Native Request Capture ${label} JSONL record must be an object.`
      );
    }
    return parsed;
  });
}

function assertContained(rootPath: string, artifactPath: string): void {
  const relative = path.relative(rootPath, artifactPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "Native Request Capture artifact is outside the capture root."
    );
  }
}

function resolveNativeCaptureRoot(): string {
  const harnessHome =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(harnessHome, "logs", "native-request-capture");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
