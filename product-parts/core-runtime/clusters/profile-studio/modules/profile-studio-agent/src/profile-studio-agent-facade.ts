import { homedir } from "node:os";
import path from "node:path";
import type {
  ProfileStudioCreatorSnapshot,
  ProfileStudioToolSelection,
} from "../../profile-studio-authoring/src/profile-studio-authoring-facade.js";
import type { ProfileStudioCreatorAgentProviderId } from "../../profile-studio-creator-profile/src/profile-studio-creator-profile-facade.js";
import type { ProfileStudioProviderId } from "../../profile-studio-lifecycle/src/profile-studio-lifecycle-facade.js";

export interface ProfileCreatorTurnResult {
  readonly assistantResponse: string;
  readonly draft: ProfileStudioCreatorSnapshot | null;
  readonly nextAction: "continue" | "request-approval";
}

export interface ProfileStudioAgentContext {
  readonly currentDraft: {
    readonly customInstructions: string;
    readonly description: string;
    readonly donorReference: { readonly artifactPath: string } | null;
    readonly name: string;
    readonly purpose: string;
    readonly systemPrompt: string;
    readonly toolSelection:
      | ProfileStudioToolSelection
      | { readonly mode: "codex-fixed"; readonly tools: null };
  };
  readonly donorContent: unknown | null;
  readonly profileId: string;
  readonly target: {
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  };
}

export interface ProfileStudioAgentTurnSpec {
  readonly modelId: string;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly providerId: ProfileStudioCreatorAgentProviderId;
  readonly reasoningEffort: "high";
  readonly settingSources: readonly [];
  readonly systemPrompt: string;
  readonly tools: readonly [];
  readonly workspaceId: "profile-studio";
  readonly workspacePath: string;
}

export interface ProfileStudioAgentExecutionProfile {
  readonly modelId: string;
  readonly providerId: ProfileStudioCreatorAgentProviderId;
  readonly reasoningEffort: "high";
  readonly systemPrompt: string;
}

export type ProfileCreatorTurnParseResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly result: ProfileCreatorTurnResult };

const PROFILE_CREATOR_OUTPUT_SCHEMA = {
  additionalProperties: false,
  properties: {
    assistantResponse: { type: "string" },
    draft: {
      anyOf: [
        { type: "null" },
        {
          additionalProperties: false,
          properties: {
            customInstructions: { type: "string" },
            description: { type: "string" },
            donorReference: {
              anyOf: [
                { type: "null" },
                {
                  additionalProperties: false,
                  properties: {
                    artifactPath: { type: "string" },
                  },
                  required: ["artifactPath"],
                  type: "object",
                },
              ],
            },
            name: { type: "string" },
            purpose: { type: "string" },
            systemPrompt: { type: "string" },
            toolSelection: {
              additionalProperties: false,
              properties: {
                mode: {
                  enum: ["claude-subset", "codex-fixed", "kimi-candidate"],
                  type: "string",
                },
                runtimeEffect: {
                  anyOf: [
                    { type: "null" },
                    { enum: ["declarative-only"], type: "string" },
                  ],
                },
                toolsJson: { type: "string" },
              },
              required: ["mode", "runtimeEffect", "toolsJson"],
              type: "object",
            },
          },
          required: [
            "name",
            "description",
            "purpose",
            "systemPrompt",
            "customInstructions",
            "toolSelection",
            "donorReference",
          ],
          type: "object",
        },
      ],
    },
    nextAction: { enum: ["continue", "request-approval"], type: "string" },
  },
  required: ["assistantResponse", "draft", "nextAction"],
  type: "object",
} as const;

export class ProfileStudioAgentFacade {
  buildTurnSpec(
    executionProfile: ProfileStudioAgentExecutionProfile
  ): ProfileStudioAgentTurnSpec {
    return {
      modelId: executionProfile.modelId,
      outputSchema: PROFILE_CREATOR_OUTPUT_SCHEMA,
      providerId: executionProfile.providerId,
      reasoningEffort: executionProfile.reasoningEffort,
      settingSources: [],
      systemPrompt: executionProfile.systemPrompt,
      tools: [],
      workspaceId: "profile-studio",
      workspacePath: resolveProfileStudioWorkspacePath(),
    };
  }

  getOutputSchema(): Readonly<Record<string, unknown>> {
    return PROFILE_CREATOR_OUTPUT_SCHEMA;
  }

  parseTurnResult(value: unknown): ProfileCreatorTurnParseResult {
    if (!isPlainRecord(value)) {
      return {
        error: "Creator structured output must be an object.",
        ok: false,
      };
    }
    if (
      typeof value.assistantResponse !== "string" ||
      !(
        value.nextAction === "continue" ||
        value.nextAction === "request-approval"
      )
    ) {
      return {
        error: "Creator structured output has invalid response/action fields.",
        ok: false,
      };
    }
    const draft = parseCreatorDraft(value.draft);
    if (!draft.ok) {
      return draft;
    }
    return {
      ok: true,
      result: {
        assistantResponse: value.assistantResponse,
        draft: draft.snapshot,
        nextAction: value.nextAction,
      },
    };
  }
}

export function resolveProfileStudioWorkspacePath(): string {
  const harnessHome =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(harnessHome, "ProfileStudio", "workspace");
}

function parseCreatorDraft(value: unknown):
  | { readonly error: string; readonly ok: false }
  | {
      readonly ok: true;
      readonly snapshot: ProfileStudioCreatorSnapshot | null;
    } {
  if (value === null) {
    return { ok: true, snapshot: null };
  }
  if (!isPlainRecord(value)) {
    return { error: "Creator draft must be null or an object.", ok: false };
  }
  const name = readString(value.name);
  const description = readString(value.description);
  const purpose = readString(value.purpose);
  const systemPrompt = readString(value.systemPrompt);
  const customInstructions = readString(value.customInstructions);
  const toolSelection = parseToolSelection(value.toolSelection);
  const donorReference = parseDonorReference(value.donorReference);
  if (
    !name ||
    description === undefined ||
    purpose === undefined ||
    systemPrompt === undefined ||
    customInstructions === undefined ||
    !toolSelection.ok ||
    !donorReference.ok
  ) {
    return {
      error: "Creator draft is not a complete full snapshot.",
      ok: false,
    };
  }
  return {
    ok: true,
    snapshot: {
      customInstructions,
      description,
      donorReference: donorReference.value,
      name,
      purpose,
      systemPrompt,
      toolSelection: toolSelection.value,
    },
  };
}

function parseToolSelection(
  value: unknown
):
  | { readonly ok: false }
  | { readonly ok: true; readonly value: ProfileStudioToolSelection } {
  if (!isPlainRecord(value)) {
    return { ok: false };
  }
  const tools = parseToolsJson(value.toolsJson);
  if (!tools) {
    return { ok: false };
  }
  if (
    value.mode === "codex-fixed" &&
    value.runtimeEffect === "declarative-only" &&
    tools.length > 0
  ) {
    return {
      ok: true,
      value: {
        mode: "codex-fixed",
        runtimeEffect: "declarative-only",
        tools,
      },
    };
  }
  if (
    !(
      (value.mode === "claude-subset" || value.mode === "kimi-candidate") &&
      value.runtimeEffect === null
    )
  ) {
    return { ok: false };
  }
  return {
    ok: true,
    value: { mode: value.mode, tools },
  };
}

function parseToolsJson(
  value: unknown
): readonly Record<string, unknown>[] | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const tools: unknown = JSON.parse(value);
    return Array.isArray(tools) && tools.every(isPlainRecord) ? tools : null;
  } catch {
    return null;
  }
}

function parseDonorReference(value: unknown):
  | { readonly ok: false }
  | {
      readonly ok: true;
      readonly value: { readonly artifactPath: string } | null;
    } {
  if (value === null) {
    return { ok: true, value: null };
  }
  if (!isPlainRecord(value)) {
    return { ok: false };
  }
  const artifactPath = readString(value.artifactPath)?.trim();
  return artifactPath ? { ok: true, value: { artifactPath } } : { ok: false };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
