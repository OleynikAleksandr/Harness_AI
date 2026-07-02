import type {
  ProviderProfileApplicationDetails,
  ProviderSessionStartOptions,
  SessionProfilePayload,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildGlmNativeSystemMessage,
  GLM_NATIVE_WORKFLOW_TOOLS,
  type GlmNativeToolDefinition,
  type GlmSessionMessage,
} from "./glm-native-agent-runtime.js";
import type { GlmRuntimeProfile } from "./glm-native-runtime-profile.js";

/**
 * GLM Native profile application layer (docs/architecture/SessionProfiles.md):
 * categories only filter GLM's OWN tool schemas, and the adapter — never the
 * Core materializer or the profile author — appends the tool contract that
 * teaches the model to drive the local agentic loop. The managed system
 * message is built from the frozen snapshot payload (same start date, same
 * wrapper), never from live data.
 */
const GLM_TOOL_CATEGORY_MAP: Readonly<Record<string, readonly string[]>> = {
  "file-read": [
    "read_file",
    "read_file_anchored",
    "grep_files",
    "glob_files",
    "workspace_symbols",
    "go_to_definition",
    "find_references",
  ],
  "file-write": [
    "write_file",
    "edit_file",
    "edit_file_by_anchor",
    "apply_patch",
    "write_workflow_artifact",
  ],
  git: ["git_status", "git_diff", "git_log", "git_blame"],
  shell: ["exec_command"],
  tests: ["run_tests"],
  web: ["web_search", "web_fetch", "browser_fetch"],
};

export interface GlmSessionProfileState {
  readonly kind: "managed" | "native";
  readonly payload?: SessionProfilePayload;
}

export function resolveGlmSessionProfileState(
  options?: ProviderSessionStartOptions
): GlmSessionProfileState | undefined {
  if (options?.profileKind === "managed" && options.profile) {
    return { kind: "managed", payload: options.profile };
  }
  if (options?.profileKind === "native") {
    return { kind: "native" };
  }
  return;
}

/**
 * System message + tool schema subset for one request. Native (and legacy)
 * keep the built-in instruction with the full tool set — GLM Native's native
 * IS the built-in client behavior by definition.
 */
export function buildGlmProfileRequestParts(
  profile: GlmRuntimeProfile,
  state?: GlmSessionProfileState
): {
  readonly systemMessage: GlmSessionMessage;
  readonly tools: readonly GlmNativeToolDefinition[];
} {
  if (state?.kind !== "managed" || !state.payload) {
    return {
      systemMessage: buildGlmNativeSystemMessage(profile),
      tools: GLM_NATIVE_WORKFLOW_TOOLS,
    };
  }
  const tools = filterGlmWorkflowTools(state.payload.toolingCategories);
  return {
    systemMessage: {
      content: buildGlmManagedInstruction(state.payload, tools),
      role: "system",
    },
    tools,
  };
}

function filterGlmWorkflowTools(
  categories: Readonly<Record<string, boolean>>
): GlmNativeToolDefinition[] {
  const disabled = new Set<string>();
  for (const [category, enabled] of Object.entries(categories)) {
    if (enabled) {
      continue;
    }
    for (const tool of GLM_TOOL_CATEGORY_MAP[category] ?? []) {
      disabled.add(tool);
    }
  }
  return GLM_NATIVE_WORKFLOW_TOOLS.filter(
    (tool) => !disabled.has(readGlmToolName(tool))
  );
}

export function computeGlmProfileDetails(
  state?: GlmSessionProfileState
): ProviderProfileApplicationDetails | undefined {
  if (!state) {
    return;
  }
  if (state.kind === "native" || !state.payload) {
    return {
      mode: "native",
      toolSchemaIds: GLM_NATIVE_WORKFLOW_TOOLS.map(readGlmToolName),
    };
  }
  return {
    contentHash: state.payload.contentHash,
    mode: "managed",
    profileId: state.payload.profileId,
    toolSchemaIds: filterGlmWorkflowTools(state.payload.toolingCategories).map(
      readGlmToolName
    ),
  };
}

function buildGlmManagedInstruction(
  payload: SessionProfilePayload,
  tools: readonly GlmNativeToolDefinition[]
): string {
  return [
    payload.prompt.trimEnd(),
    "",
    "# GLM Tool Contract",
    "",
    "- The executable tools are provided in the request `tools` array using Z.AI/OpenAI-compatible function-call format; every declared tool has a local executor.",
    `- Tools available to this profile: ${tools.map(readGlmToolName).join(", ")}.`,
    "- Keep edits scoped and verify them with the declared tools.",
    "- Never claim that a file was created or changed unless the tool returned success.",
  ].join("\n");
}

function readGlmToolName(tool: GlmNativeToolDefinition): string {
  const fn = (tool as { function?: { name?: unknown } }).function;
  return typeof fn?.name === "string" ? fn.name : "";
}
