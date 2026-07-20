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

/**
 * Native restoration contract (docs/architecture/SessionProfiles.md): Native
 * returns the channel to vendor-default behavior as if launched via the
 * plain vendor CLI. The SDK loads workspace CLAUDE.md only when
 * settingSources includes "project" (an empty array is SDK isolation mode),
 * so Native restores the full vendor CLI source set. Provider home
 * isolation, auth and permission bypass stay Harness process policy — the
 * "user" scope reads the isolated provider home, not the OS user home.
 */
const CLAUDE_VENDOR_SETTING_SOURCES = ["user", "project", "local"] as const;

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
 * snapshot. Managed replaces the workflow prompt and the tool whitelist and
 * keeps the SDK isolation mode (`settingSources: []`) so profile
 * instructions stay the only workflow truth; native switches prompt/tools
 * to the claude_code presets AND restores the vendor setting sources so
 * CLAUDE.md discovery behaves like the plain vendor CLI. Permission mode
 * and home isolation stay untouched Harness process policy in both modes.
 */
export function applyClaudeSessionProfile(
  options: {
    settingSources?: unknown;
    systemPrompt?: unknown;
    tools?: unknown;
  },
  state?: ClaudeSessionProfileState
): ProviderProfileApplicationDetails | undefined {
  if (!state) {
    return;
  }
  if (state.kind === "native") {
    options.systemPrompt = { ...CLAUDE_CODE_PRESET };
    options.tools = { ...CLAUDE_CODE_PRESET };
    options.settingSources = [...CLAUDE_VENDOR_SETTING_SOURCES];
    return {
      mode: "native",
      settingSources: [...CLAUDE_VENDOR_SETTING_SOURCES],
      systemPrompt: "claude_code preset",
      tools: "claude_code preset",
    };
  }
  const payload = state.payload;
  if (!payload) {
    return;
  }
  const explicitToolWhitelist = readExplicitClaudeToolNames(payload.tools);
  const toolWhitelist =
    explicitToolWhitelist ?? mapClaudeToolCategories(payload.toolingCategories);
  const toolMode = explicitToolWhitelist
    ? "explicit-native-subset"
    : "category-map";
  options.systemPrompt = payload.prompt;
  options.tools = toolWhitelist;
  options.settingSources = [];
  return {
    contentHash: payload.contentHash,
    mode: "managed",
    profileId: payload.profileId,
    settingSources: [],
    systemPrompt: "full-replacement",
    toolMode,
    toolWhitelist,
  };
}

function readExplicitClaudeToolNames(
  tools: SessionProfilePayload["tools"]
): string[] | null {
  if (tools === undefined) {
    return null;
  }
  const names = tools.map(readStructuredToolName);
  if (names.some((name) => !name)) {
    throw new Error(
      "Claude managed profile contains a tool descriptor without a name."
    );
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Claude managed profile tool names must be unique.");
  }
  return names;
}

function readStructuredToolName(
  tool: Readonly<Record<string, unknown>>
): string {
  const directName = typeof tool.name === "string" ? tool.name.trim() : "";
  if (directName) {
    return directName;
  }
  const functionDefinition = tool.function;
  return isRecord(functionDefinition) &&
    typeof functionDefinition.name === "string"
    ? functionDefinition.name.trim()
    : "";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function computeClaudeProfileDetails(
  state?: ClaudeSessionProfileState
): ProviderProfileApplicationDetails | undefined {
  return applyClaudeSessionProfile({}, state);
}
