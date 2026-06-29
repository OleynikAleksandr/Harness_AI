import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Claude CLI writes its per-session transcript at
// <workspace>/.harness/runtime/providers/claude/home/.claude/projects/<slug>/
//   <providerSessionId>.jsonl  (the file name is the providerSessionId).
// Remove only that transcript; leave shared .claude.json, caches and mcp-logs intact.
export function deleteClaudeTranscriptArtifacts(
  workspacePath: string,
  providerSessionId: string
): void {
  if (!(workspacePath && providerSessionId)) {
    return;
  }
  const projectsDir = join(
    workspacePath,
    ".harness",
    "runtime",
    "providers",
    "claude",
    "home",
    ".claude",
    "projects"
  );
  if (!existsSync(projectsDir)) {
    return;
  }
  const suffix = `${providerSessionId}.jsonl`;
  for (const entry of readdirSync(projectsDir, { recursive: true })) {
    if (typeof entry === "string" && entry.endsWith(suffix)) {
      rmSync(join(projectsDir, entry), { force: true });
    }
  }
}
