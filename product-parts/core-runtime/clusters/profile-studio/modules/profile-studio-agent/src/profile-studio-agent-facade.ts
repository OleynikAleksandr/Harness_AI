import { homedir } from "node:os";
import path from "node:path";
import type {
  ProfileStudioCreatorSnapshot,
  ProfileStudioToolSelection,
} from "../../profile-studio-authoring/src/profile-studio-authoring-facade.js";
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
    readonly toolSelection: ProfileStudioToolSelection;
  };
  readonly donorContent: unknown | null;
  readonly profileId: string;
  readonly target: {
    readonly modelId: string;
    readonly providerId: ProfileStudioProviderId;
  };
}

export interface ProfileStudioAgentTurnSpec {
  readonly modelId: "opus";
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly providerId: "claude";
  readonly reasoningEffort: "high";
  readonly settingSources: readonly [];
  readonly systemPrompt: string;
  readonly tools: readonly [];
  readonly workspaceId: "profile-studio";
  readonly workspacePath: string;
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
                    artifactPath: { minLength: 1, type: "string" },
                  },
                  required: ["artifactPath"],
                  type: "object",
                },
              ],
            },
            name: { minLength: 1, type: "string" },
            purpose: { type: "string" },
            systemPrompt: { type: "string" },
            toolSelection: {
              oneOf: [
                toolSelectionSchema("claude-subset", "array"),
                toolSelectionSchema("codex-fixed", "null"),
                toolSelectionSchema("kimi-candidate", "array"),
              ],
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
    context: ProfileStudioAgentContext
  ): ProfileStudioAgentTurnSpec {
    return {
      modelId: "opus",
      outputSchema: PROFILE_CREATOR_OUTPUT_SCHEMA,
      providerId: "claude",
      reasoningEffort: "high",
      settingSources: [],
      systemPrompt: buildInlineSystemPrompt(context),
      tools: [],
      workspaceId: "profile-studio",
      workspacePath: resolveProfileStudioWorkspacePath(),
    };
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

function buildInlineSystemPrompt(context: ProfileStudioAgentContext): string {
  return `You are the Harness AI Profile Creator Agent.

Your only job is to discuss and author one provider/model-specific Custom
Profile with the user. Start from the supplied Native Capture donor when it is
present: reduce and reformat its system prompt to the target task, removing
general-purpose instructions. Then discuss what short custom instructions and
skills are still missing for that task and add them to the custom part.

The profile always has exactly two prompt source parts:
1. systemPrompt: the reduced Native foundation.
2. customInstructions: concise task-specific additions.

Do not use or request AGENTS.md, CLAUDE.md, Skills, project settings or other
ambient instruction files. You have no filesystem, shell, web or provider
tools. Everything authoritative for this turn is inline below. Never mark a
profile Valid; only the user can approve the exact current content hash.

Return JSON matching the supplied schema. A discussion-only turn uses
draft=null. When proposing changes, return the entire draft snapshot, never a
patch. Use request-approval only when the full snapshot is ready for the
user's direct approval. Tool mode must match the target: claude-subset,
codex-fixed or kimi-candidate.

PROFILE CONTEXT (authoritative inline JSON):
${JSON.stringify(context, null, 2)}`;
}

function toolSelectionSchema(mode: string, toolsType: "array" | "null") {
  return {
    additionalProperties: false,
    properties: {
      mode: { const: mode, type: "string" },
      tools:
        toolsType === "array"
          ? { items: { type: "object" }, type: "array" }
          : { type: "null" },
    },
    required: ["mode", "tools"],
    type: "object",
  } as const;
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
  if (value.mode === "codex-fixed" && value.tools === null) {
    return { ok: true, value: { mode: "codex-fixed", tools: null } };
  }
  if (
    !(
      (value.mode === "claude-subset" || value.mode === "kimi-candidate") &&
      Array.isArray(value.tools) &&
      value.tools.every(isPlainRecord)
    )
  ) {
    return { ok: false };
  }
  return {
    ok: true,
    value: { mode: value.mode, tools: value.tools },
  };
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
