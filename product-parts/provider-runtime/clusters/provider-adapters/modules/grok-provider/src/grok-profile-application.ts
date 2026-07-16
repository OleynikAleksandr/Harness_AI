import type {
  ProviderProfileApplicationDetails,
  ProviderSessionStartOptions,
  SessionProfilePayload,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { isRecord } from "./grok-acp-contracts.js";
import { mapGrokToolCategories } from "./grok-tool-inventory.js";

export interface GrokProfileVerificationExpectation {
  readonly agentName: string;
  readonly maximumToolDefinitions: number;
  readonly minimumToolDefinitions: number;
}

export interface GrokProfileApplication {
  readonly details?: ProviderProfileApplicationDetails;
  readonly sessionMeta: Readonly<Record<string, unknown>>;
  readonly verification?: GrokProfileVerificationExpectation;
}

export interface GrokSessionProfileState {
  readonly kind: "managed" | "native";
  readonly payload?: SessionProfilePayload;
}

const PROFILE_NAME_CHARACTER_PATTERN = /[^a-z0-9-]+/gu;
const PROFILE_NAME_EDGE_PATTERN = /^-+|-+$/gu;
const MAX_AGENT_NAME_LENGTH = 48;
const ALWAYS_ON_MCP_META_TOOL_COUNT = 2;

export function resolveGrokSessionProfileState(
  options?: ProviderSessionStartOptions
): GrokSessionProfileState | undefined {
  if (options?.profileKind === "managed" && options.profile) {
    return { kind: "managed", payload: options.profile };
  }
  if (options?.profileKind === "managed") {
    throw new Error("Managed Grok profile requires a frozen profile payload.");
  }
  if (options?.profileKind === "native") {
    return { kind: "native" };
  }
  return;
}

export function buildGrokProfileApplication(
  state?: GrokSessionProfileState
): GrokProfileApplication {
  if (!state) {
    return { sessionMeta: {} };
  }
  if (state.kind === "native") {
    return {
      details: {
        agentProfile: "vendor default",
        agentsMd: "vendor default",
        mode: "native",
        systemPrompt: "vendor default",
        tools: "vendor default",
      },
      sessionMeta: {},
    };
  }
  const payload = state.payload;
  if (!payload) {
    throw new Error("Managed Grok profile payload is missing.");
  }
  if (!payload.prompt.trim()) {
    throw new Error("Managed Grok profile system prompt is empty.");
  }
  const selection = mapGrokToolCategories(payload.toolingCategories);
  if (selection.tools.length === 0) {
    throw new Error(
      "Managed Grok profile has no verified enabled tool category."
    );
  }
  const agentName = buildAgentName(payload.profileId);
  const maximumToolDefinitions =
    selection.tools.length + ALWAYS_ON_MCP_META_TOOL_COUNT;
  const agentProfile = {
    agentsMd: false,
    description: `Harness managed session profile: ${payload.profileName}`,
    discoverSkills: false,
    name: agentName,
    tools: selection.tools,
  };
  return {
    details: {
      agentName,
      agentsMd: false,
      contentHash: payload.contentHash,
      discoverSkills: false,
      ignoredEnabledCategories: selection.ignoredEnabledCategories,
      mode: "managed",
      profileId: payload.profileId,
      systemPrompt: "full override",
      toolAllowlist: selection.tools,
      toolBinding: "ACP _meta.agentProfile.tools",
    },
    sessionMeta: {
      agentProfile,
      systemPromptOverride: payload.prompt,
    },
    verification: {
      agentName,
      maximumToolDefinitions,
      minimumToolDefinitions: ALWAYS_ON_MCP_META_TOOL_COUNT + 1,
    },
  };
}

export function verifyGrokProfileApplication(
  application: GrokProfileApplication,
  sessionInfoResponse: unknown
): ProviderProfileApplicationDetails | undefined {
  const expectation = application.verification;
  if (!expectation) {
    return application.details;
  }
  const root = isRecord(sessionInfoResponse) ? sessionInfoResponse : null;
  const info = isRecord(root?.result) ? root.result : root;
  const context = isRecord(info?.context) ? info.context : null;
  const agentName = typeof info?.agentName === "string" ? info.agentName : null;
  const toolDefinitionsCount = readCount(context?.toolDefinitionsCount);
  if (agentName !== expectation.agentName) {
    throw new Error(
      `Grok managed profile binding failed: expected agent ${expectation.agentName}, got ${agentName ?? "unknown"}.`
    );
  }
  if (
    toolDefinitionsCount === null ||
    toolDefinitionsCount < expectation.minimumToolDefinitions ||
    toolDefinitionsCount > expectation.maximumToolDefinitions
  ) {
    throw new Error(
      `Grok managed tool binding failed: effective tool count ${toolDefinitionsCount ?? "unknown"} is outside ${expectation.minimumToolDefinitions}-${expectation.maximumToolDefinitions}.`
    );
  }
  return {
    ...application.details,
    profileBindingVerified: true,
    toolDefinitionsCount,
  };
}

function buildAgentName(profileId: string): string {
  const normalized = profileId
    .toLowerCase()
    .replace(PROFILE_NAME_CHARACTER_PATTERN, "-")
    .replace(PROFILE_NAME_EDGE_PATTERN, "");
  const suffix = normalized || "profile";
  return `harness-${suffix}`.slice(0, MAX_AGENT_NAME_LENGTH);
}

function readCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
