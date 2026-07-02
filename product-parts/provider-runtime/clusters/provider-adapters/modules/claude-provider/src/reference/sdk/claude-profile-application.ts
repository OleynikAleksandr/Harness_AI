import type {
  ProviderProfileApplicationDetails,
  ProviderSessionStartOptions,
  SessionProfilePayload,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

/**
 * Claude profile application layer (docs/architecture/SessionProfiles.md):
 * translates the provider-neutral payload into Claude Agent SDK options.
 * Categories only filter Claude's OWN native tools — a profile never injects
 * foreign tools. git/tests have no dedicated Claude tools and follow the
 * shell category (Bash).
 */
export const CLAUDE_TOOL_CATEGORY_MAP: Readonly<
  Record<string, readonly string[]>
> = {
  "file-read": ["Read", "Glob", "Grep"],
  "file-write": ["Write", "Edit"],
  git: [],
  shell: ["Bash"],
  tests: [],
  web: ["WebSearch", "WebFetch"],
};

const CLAUDE_CODE_PRESET = { preset: "claude_code", type: "preset" } as const;

export interface ClaudeSessionProfileState {
  readonly kind: "managed" | "native";
  readonly payload?: SessionProfilePayload;
}

/**
 * Reads the contract options into the adapter-local state. Absent kind
 * (legacy session predating profiles) returns undefined so the adapter keeps
 * its pre-profile behavior untouched.
 */
export function resolveClaudeSessionProfileState(
  options?: ProviderSessionStartOptions
): ClaudeSessionProfileState | undefined {
  if (options?.profileKind === "managed" && options.profile) {
    return { kind: "managed", payload: options.profile };
  }
  if (options?.profileKind === "native") {
    return { kind: "native" };
  }
  return;
}

export function mapClaudeToolCategories(
  categories: Readonly<Record<string, boolean>>
): string[] {
  const tools = new Set<string>();
  for (const [category, enabled] of Object.entries(categories)) {
    if (!enabled) {
      continue;
    }
    for (const tool of CLAUDE_TOOL_CATEGORY_MAP[category] ?? []) {
      tools.add(tool);
    }
  }
  return [...tools];
}

/**
 * Mutates the prepared SDK query options according to the session's applied
 * profile state and returns the actually-applied details for the Core
 * snapshot. Managed replaces the workflow prompt and the tool whitelist;
 * native switches both to the claude_code presets (Harness process policy —
 * permission mode, setting sources, home isolation — stays untouched).
 */
export function applyClaudeSessionProfile(
  options: { systemPrompt?: unknown; tools?: unknown },
  state?: ClaudeSessionProfileState
): ProviderProfileApplicationDetails | undefined {
  if (!state) {
    return;
  }
  if (state.kind === "native") {
    options.systemPrompt = { ...CLAUDE_CODE_PRESET };
    options.tools = { ...CLAUDE_CODE_PRESET };
    return {
      mode: "native",
      systemPrompt: "claude_code preset",
      tools: "claude_code preset",
    };
  }
  const payload = state.payload;
  if (!payload) {
    return;
  }
  const toolWhitelist = mapClaudeToolCategories(payload.toolingCategories);
  options.systemPrompt = payload.prompt;
  options.tools = toolWhitelist;
  return {
    contentHash: payload.contentHash,
    mode: "managed",
    profileId: payload.profileId,
    toolWhitelist,
  };
}

export function computeClaudeProfileDetails(
  state?: ClaudeSessionProfileState
): ProviderProfileApplicationDetails | undefined {
  return applyClaudeSessionProfile({}, state);
}
