import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Codex writes its per-session rollout under
// <workspace>/.harness/runtime/providers/codex/home/sessions/YYYY/MM/DD/
//   rollout-<timestamp>-<providerSessionId>.jsonl
// Remove the rollout(s) for one provider session when its Core session is deleted.
export function deleteCodexRolloutArtifacts(
  workspacePath: string,
  providerSessionId: string
): void {
  if (!(workspacePath && providerSessionId)) {
    return;
  }
  const sessionsDir = join(
    workspacePath,
    ".harness",
    "runtime",
    "providers",
    "codex",
    "home",
    "sessions"
  );
  if (!existsSync(sessionsDir)) {
    return;
  }
  const suffix = `-${providerSessionId}.jsonl`;
  for (const entry of readdirSync(sessionsDir, { recursive: true })) {
    if (typeof entry === "string" && entry.endsWith(suffix)) {
      rmSync(join(sessionsDir, entry), { force: true });
    }
  }
}
