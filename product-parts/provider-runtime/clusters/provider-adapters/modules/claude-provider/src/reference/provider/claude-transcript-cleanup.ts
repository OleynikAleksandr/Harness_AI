import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isClaudeChildProviderSessionId } from "../subagents/claude-subagent-event-normalizer.js";

// Claude CLI writes its per-session transcript at
// <workspace>/.harness/runtime/providers/claude/home/.claude/projects/<slug>/
//   <providerSessionId>.jsonl  (the file name is the providerSessionId), and
// subagent artifacts under <providerSessionId>/subagents/ next to it.
// Remove only the session's own artifacts; leave shared .claude.json, caches
// and mcp-logs intact. A child id (`agent-<agentId>`) removes just that
// subagent's meta/transcript pair; a parent id removes its transcript plus
// the whole <providerSessionId>/ directory (Core cascades child deletion).
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
  const isChild = isClaudeChildProviderSessionId(providerSessionId);
  const transcriptSuffix = `${providerSessionId}.jsonl`;
  const metaSuffix = `${providerSessionId}.meta.json`;
  for (const entry of readdirSync(projectsDir, { recursive: true })) {
    if (typeof entry !== "string") {
      continue;
    }
    if (entry.endsWith(transcriptSuffix)) {
      rmSync(join(projectsDir, entry), { force: true });
      if (!isChild) {
        rmSync(join(projectsDir, entry.slice(0, -".jsonl".length)), {
          force: true,
          recursive: true,
        });
      }
      continue;
    }
    if (isChild && entry.endsWith(metaSuffix)) {
      rmSync(join(projectsDir, entry), { force: true });
    }
  }
}
