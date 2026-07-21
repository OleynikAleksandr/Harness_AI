import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import {
  type ProfileStudioAgentContext,
  ProfileStudioAgentFacade,
  type ProfileStudioAgentTurnSpec,
} from "../../../../profile-studio/modules/profile-studio-agent/src/profile-studio-agent-facade.js";
import { resolveNextSessionMode } from "./next-session-mode.js";
import type { SessionProfileResolverLike } from "./session-profile-resolution.js";
import { createId } from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  CoreSessionActionResult,
  CreateCoreSessionRequest,
} from "./session-request-handler-types.js";

const PROFILE_CREATOR_AGENT_PROFILE_ID = "profile-studio-creator-agent";
const profileStudioAgent = new ProfileStudioAgentFacade();
const profileCreatorContractSpec = profileStudioAgent.buildTurnSpec({
  currentDraft: {
    customInstructions: "",
    description: "",
    donorReference: null,
    name: "Profile Creator",
    purpose: "",
    systemPrompt: "",
    toolSelection: { mode: "claude-subset", tools: [] },
  },
  donorContent: null,
  profileId: "profile-studio-runtime-contract",
  target: { modelId: "opus", providerId: "claude" },
});

export interface CreateProfileCreatorSessionRequest {
  readonly context: ProfileStudioAgentContext;
  readonly sessionId: string;
  readonly title?: string;
}

export async function buildOrdinaryCoreSession(
  request: CreateCoreSessionRequest,
  profileResolver: SessionProfileResolverLike
): Promise<CoreSessionActionResult> {
  const nextSessionMode = resolveNextSessionMode(request.nextSessionMode);
  const resolution = await profileResolver.resolveAppliedProfile({
    modelId: request.model,
    nextSessionMode,
    providerId: request.providerId,
    workspacePath: request.workspacePath,
  });
  if (!resolution.ok) {
    return { error: resolution.error, ok: false };
  }
  const now = new Date().toISOString();
  const session: CoreSession = {
    appliedProfile: resolution.appliedProfile,
    createdAt: now,
    id: createId(`session-${request.providerId}`),
    model: request.model,
    nextSessionMode,
    providerId: request.providerId,
    providerName: request.providerName,
    sessionKind: "primary",
    title: request.title ?? `${request.providerName} session`,
    titleOrigin: "default",
    updatedAt: now,
    workspaceId: request.workspaceId,
    ...(request.sessionPurpose
      ? { sessionPurpose: request.sessionPurpose }
      : {}),
    ...(request.workspacePath ? { workspacePath: request.workspacePath } : {}),
  };
  return { ok: true, session };
}

export async function buildProfileCreatorSession(
  request: CreateProfileCreatorSessionRequest
): Promise<CoreSessionActionResult> {
  const sessionId = request.sessionId.trim();
  if (!(sessionId && request.context.profileId.trim())) {
    return {
      error: "Creator session id and profile id must not be empty.",
      ok: false,
    };
  }
  const spec = profileStudioAgent.buildTurnSpec(request.context);
  await fs.mkdir(spec.workspacePath, { recursive: true });
  const now = new Date().toISOString();
  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        prompt: spec.systemPrompt,
        settingSources: spec.settingSources,
        tools: spec.tools,
      })
    )
    .digest("hex");
  return {
    ok: true,
    session: {
      appliedProfile: {
        contentHash,
        kind: "managed",
        profileId: PROFILE_CREATOR_AGENT_PROFILE_ID,
        profileName: "Profile Creator Agent",
        prompt: spec.systemPrompt,
        toolingCategories: {},
        tools: [],
      },
      createdAt: now,
      id: sessionId,
      model: spec.modelId,
      nextSessionMode: {
        invocationMode: "managed",
        managedProfileId: PROFILE_CREATOR_AGENT_PROFILE_ID,
        managedProfileSelection: "auto",
        requestMode: "raw",
      },
      providerId: spec.providerId,
      providerName: profileCreatorProviderName(spec.providerId),
      ...(spec.reasoningEffort
        ? { reasoningEffort: spec.reasoningEffort }
        : {}),
      sessionKind: "primary",
      sessionPurpose: {
        profileId: request.context.profileId,
        type: "profile-creator",
      },
      title: request.title?.trim() || "Profile Creator",
      titleOrigin: "default",
      updatedAt: now,
      workspaceId: spec.workspaceId,
      workspacePath: spec.workspacePath,
    },
  };
}

export function buildProfileCreatorTurnOptions(
  session: CoreSession
): Record<string, unknown> | null {
  if (session.sessionPurpose?.type !== "profile-creator") {
    return null;
  }
  const isClaude = session.providerId === "claude";
  return {
    ...(isClaude
      ? {
          __codeaiAppliedTurnConfig: {
            modelId: session.model,
            providerId: "claudeCodeCli",
            ...(session.reasoningEffort
              ? { reasoningEffort: session.reasoningEffort }
              : {}),
            thinkingDisplaySyncEnabled: true,
            thinkingEnabled: true,
          },
        }
      : {}),
    model: session.model,
    outputSchema: profileCreatorContractSpec.outputSchema,
    ...(session.reasoningEffort
      ? { reasoningEffort: session.reasoningEffort }
      : {}),
    ...(isClaude
      ? { thinkingDisplaySyncEnabled: true, thinkingEnabled: true }
      : {}),
  };
}

function profileCreatorProviderName(
  providerId: ProfileStudioAgentTurnSpec["providerId"]
): string {
  switch (providerId) {
    case "claude":
      return "Claude";
    case "codex":
      return "Codex";
    default:
      return "Kimi";
  }
}

export function includeProfileStudioWorkspace(
  workspaces: readonly { readonly path: string }[]
): { path: string }[] {
  const studioPath = profileCreatorContractSpec.workspacePath;
  return workspaces.some((workspace) => workspace.path === studioPath)
    ? [...workspaces]
    : [...workspaces, { path: studioPath }];
}
