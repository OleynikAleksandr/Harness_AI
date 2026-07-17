import type {
  ClientMessage,
  ToolDescriptor,
} from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";
import type { SessionProfilePayload } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

// Managed Kimi sessions really apply the materialized profile on the
// universal client (2026-07-17 profile-routing order): the profile prompt
// opens the session history as its system message and the provider-neutral
// tooling categories select the builtin tool whitelist. Unknown categories
// are contract no-ops; `profile.tools` raw schemas are not registered — the
// universal client only executes its builtin inventory.
export const KIMI_CLIENT_TOOL_CATEGORY_MAP: Readonly<
  Record<string, readonly string[]>
> = {
  "file-read": ["read_file", "grep_files", "glob_files"],
  "file-write": ["write_file", "edit_file", "apply_patch"],
  git: ["exec_command"],
  shell: ["exec_command"],
  tests: ["exec_command"],
  web: ["web_fetch", "web_search"],
};

export function buildKimiManagedSystemMessages(
  profile: SessionProfilePayload | undefined
): ClientMessage[] {
  const prompt = profile?.prompt.trim();
  return prompt ? [{ content: prompt, role: "system" }] : [];
}

export function selectKimiManagedTools(
  tools: readonly ToolDescriptor[],
  profile: SessionProfilePayload | undefined
): readonly ToolDescriptor[] {
  if (!profile) {
    return tools;
  }
  const allowed = new Set<string>();
  for (const [category, enabled] of Object.entries(profile.toolingCategories)) {
    if (!enabled) {
      continue;
    }
    for (const toolName of KIMI_CLIENT_TOOL_CATEGORY_MAP[category] ?? []) {
      allowed.add(toolName);
    }
  }
  return tools.filter((tool) => allowed.has(tool.name));
}
