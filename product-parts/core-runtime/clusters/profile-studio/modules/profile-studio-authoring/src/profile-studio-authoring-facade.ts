import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type {
  ProfileStudioLifecycleFacade,
  ProfileStudioLifecycleResult,
  ProfileStudioProviderId,
} from "../../profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";

type StructuredTool = Readonly<Record<string, unknown>>;

export type ProfileStudioToolSelection =
  | {
      readonly mode: "claude-subset";
      readonly tools: readonly StructuredTool[];
    }
  | { readonly mode: "codex-fixed"; readonly tools: null }
  | {
      readonly mode: "kimi-candidate";
      readonly tools: readonly StructuredTool[];
    };

export interface ProfileStudioCreatorSnapshot {
  readonly customInstructions: string;
  readonly description: string;
  readonly donorReference: { readonly artifactPath: string } | null;
  readonly name: string;
  readonly purpose: string;
  readonly systemPrompt: string;
  readonly toolSelection: ProfileStudioToolSelection;
}

interface ProfileStudioAuthoringFacadeOptions {
  readonly captureRootDirectory?: string;
  readonly lifecycle: Pick<
    ProfileStudioLifecycleFacade,
    "applyDraftSnapshot" | "getProfile"
  >;
}

interface NativeCaptureStartRecord {
  readonly captureId: string;
  readonly providerId: string;
  readonly selectedModelId: string;
  readonly type: "capture_start";
}

interface NativeCaptureRequestRecord {
  readonly captureId: string;
  readonly providerId: string;
  readonly request: unknown;
  readonly type: "request_captured";
}

const JSONL_SUFFIX_PATTERN = /\.jsonl$/u;
const LINE_SPLIT_PATTERN = /\r?\n/u;

export class ProfileStudioAuthoringFacade {
  private readonly captureRootDirectory: string;
  private readonly lifecycle: ProfileStudioAuthoringFacadeOptions["lifecycle"];

  constructor(options: ProfileStudioAuthoringFacadeOptions) {
    this.captureRootDirectory =
      options.captureRootDirectory ?? defaultCaptureRootDirectory();
    this.lifecycle = options.lifecycle;
  }

  async applyCreatorSnapshot(request: {
    readonly profileId: string;
    readonly snapshot: ProfileStudioCreatorSnapshot;
  }): Promise<ProfileStudioLifecycleResult> {
    const current = await this.lifecycle.getProfile(request.profileId);
    if (!current.ok) {
      return current;
    }
    const textIssue = validateTextSnapshot(request.snapshot);
    if (textIssue) {
      return { error: textIssue, ok: false };
    }
    const toolIssue = validateToolSelection(
      current.profile.target.providerId,
      request.snapshot.toolSelection
    );
    if (toolIssue) {
      return { error: toolIssue, ok: false };
    }
    const donor = request.snapshot.donorReference
      ? await this.validateDonor({
          artifactPath: request.snapshot.donorReference.artifactPath,
          modelId: current.profile.target.modelId,
          providerId: current.profile.target.providerId,
        })
      : { ok: true as const, reference: null };
    if (!donor.ok) {
      return donor;
    }
    return this.lifecycle.applyDraftSnapshot({
      profileId: request.profileId,
      snapshot: {
        customInstructions: request.snapshot.customInstructions,
        description: request.snapshot.description,
        name: request.snapshot.name,
        nativeCaptureDonor: donor.reference,
        purpose: request.snapshot.purpose,
        systemPrompt: request.snapshot.systemPrompt,
        tools: request.snapshot.toolSelection.tools,
      },
    });
  }

  private async validateDonor(request: {
    readonly artifactPath: string;
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  }): Promise<
    | { readonly error: string; readonly ok: false }
    | {
        readonly ok: true;
        readonly reference: {
          readonly artifactPath: string;
          readonly captureId: string;
          readonly modelId: string;
          readonly providerId: string;
          readonly requestHash: string;
        };
      }
  > {
    let captureRoot: string;
    let artifactPath: string;
    try {
      [captureRoot, artifactPath] = await Promise.all([
        fs.realpath(this.captureRootDirectory),
        fs.realpath(request.artifactPath.trim()),
      ]);
    } catch {
      return {
        error: "Native Capture donor artifact is not readable.",
        ok: false,
      };
    }
    if (
      !(
        isPathInside(captureRoot, artifactPath) &&
        artifactPath.endsWith(".jsonl")
      )
    ) {
      return {
        error:
          "Native Capture donor must be a raw JSONL artifact inside the capture root.",
        ok: false,
      };
    }
    if (artifactPath.endsWith(".diagnostics.jsonl")) {
      return {
        error: "Select the raw capture JSONL, not diagnostics.",
        ok: false,
      };
    }
    const diagnosticsPath = artifactPath.replace(
      JSONL_SUFFIX_PATTERN,
      ".diagnostics.jsonl"
    );
    let rawRecords: unknown[];
    let diagnosticRecords: unknown[];
    try {
      [rawRecords, diagnosticRecords] = await Promise.all([
        readJsonl(artifactPath),
        readJsonl(diagnosticsPath),
      ]);
    } catch {
      return { error: "Native Capture donor JSONL is invalid.", ok: false };
    }
    const start = diagnosticRecords.find(isCaptureStartRecord);
    const captured = [...rawRecords].reverse().find(isCaptureRequestRecord);
    const completed = diagnosticRecords.some(
      (record) =>
        isPlainRecord(record) &&
        record.type === "capture_end" &&
        record.status === "captured"
    );
    if (
      !(
        start &&
        captured &&
        completed &&
        start.captureId === captured.captureId
      )
    ) {
      return {
        error:
          "Native Capture donor is incomplete or its capture id is inconsistent.",
        ok: false,
      };
    }
    const expectedCaptureProvider = nativeCaptureProviderId(request.providerId);
    if (
      start.providerId !== expectedCaptureProvider ||
      captured.providerId !== expectedCaptureProvider ||
      start.selectedModelId !== request.modelId
    ) {
      return {
        error:
          "Native Capture donor does not match the profile provider/model target.",
        ok: false,
      };
    }
    return {
      ok: true,
      reference: {
        artifactPath,
        captureId: start.captureId,
        modelId: request.modelId,
        providerId: request.providerId,
        requestHash: createHash("sha256")
          .update(JSON.stringify(captured.request))
          .digest("hex"),
      },
    };
  }
}

function validateTextSnapshot(
  snapshot: ProfileStudioCreatorSnapshot
): string | undefined {
  if (!snapshot.name.trim()) {
    return "Creator snapshot name must not be empty.";
  }
  for (const value of [
    snapshot.description,
    snapshot.purpose,
    snapshot.systemPrompt,
    snapshot.customInstructions,
  ]) {
    if (typeof value !== "string") {
      return "Creator snapshot text fields must be strings.";
    }
  }
  return;
}

function validateToolSelection(
  providerId: ProfileStudioProviderId,
  selection: ProfileStudioToolSelection
): string | undefined {
  const expectedMode = {
    claude: "claude-subset",
    codex: "codex-fixed",
    "kimi-client": "kimi-candidate",
  }[providerId];
  if (selection.mode !== expectedMode) {
    return `Tool mode "${selection.mode}" is not valid for ${providerId}.`;
  }
  if (selection.tools === null) {
    return;
  }
  if (
    !(Array.isArray(selection.tools) && selection.tools.every(isPlainRecord))
  ) {
    return "Tool selection must be an array of structured tool objects.";
  }
  const names = selection.tools.map((tool) => readToolName(tool));
  if (names.some((name) => !name)) {
    return "Every selected tool must have a non-empty name.";
  }
  if (new Set(names).size !== names.length) {
    return "Selected tool names must be unique.";
  }
  return;
}

function readToolName(tool: StructuredTool): string {
  const directName = typeof tool.name === "string" ? tool.name.trim() : "";
  if (directName) {
    return directName;
  }
  return isPlainRecord(tool.function) && typeof tool.function.name === "string"
    ? tool.function.name.trim()
    : "";
}

function nativeCaptureProviderId(providerId: ProfileStudioProviderId): string {
  return providerId === "kimi-client" ? "kimi" : providerId;
}

function defaultCaptureRootDirectory(): string {
  const harnessHome =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(harnessHome, "logs", "native-request-capture");
}

function isPathInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

async function readJsonl(filePath: string): Promise<unknown[]> {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(LINE_SPLIT_PATTERN)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as unknown);
}

function isCaptureStartRecord(
  value: unknown
): value is NativeCaptureStartRecord {
  return (
    isPlainRecord(value) &&
    value.type === "capture_start" &&
    typeof value.captureId === "string" &&
    typeof value.providerId === "string" &&
    typeof value.selectedModelId === "string"
  );
}

function isCaptureRequestRecord(
  value: unknown
): value is NativeCaptureRequestRecord {
  return (
    isPlainRecord(value) &&
    value.type === "request_captured" &&
    typeof value.captureId === "string" &&
    typeof value.providerId === "string" &&
    "request" in value
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
