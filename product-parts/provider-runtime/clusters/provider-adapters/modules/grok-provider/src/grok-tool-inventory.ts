export const GROK_TOOL_CATEGORY_MAP: Readonly<
  Record<string, readonly string[]>
> = {
  "file-read": ["Read", "Glob", "Grep"],
  "file-write": ["Write", "Edit"],
  git: ["Bash"],
  shell: ["Bash"],
  tests: ["Bash"],
  web: ["WebSearch", "WebFetch"],
};

export interface GrokToolSelection {
  readonly ignoredEnabledCategories: readonly string[];
  readonly tools: readonly string[];
}

export function mapGrokToolCategories(
  categories: Readonly<Record<string, boolean>>
): GrokToolSelection {
  const tools = new Set<string>();
  const ignoredEnabledCategories: string[] = [];
  for (const [category, enabled] of Object.entries(categories)) {
    if (!enabled) {
      continue;
    }
    const mapped = GROK_TOOL_CATEGORY_MAP[category];
    if (!mapped) {
      ignoredEnabledCategories.push(category);
      continue;
    }
    for (const tool of mapped) {
      tools.add(tool);
    }
  }
  return { ignoredEnabledCategories, tools: [...tools] };
}
