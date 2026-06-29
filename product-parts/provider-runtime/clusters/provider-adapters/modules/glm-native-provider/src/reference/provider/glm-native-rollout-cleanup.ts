import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// GLM-native writes its per-session rollout under
// <workspace>/.harness/runtime/providers/glm-native/home/sessions/YYYY/MM/DD/
//   <providerSessionId>.jsonl  (the file name is the providerSessionId, glm-<uuid>).
// Remove the rollout for one provider session when its Core session is deleted.
export function deleteGlmNativeRolloutArtifacts(
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
    "glm-native",
    "home",
    "sessions"
  );
  if (!existsSync(sessionsDir)) {
    return;
  }
  const suffix = `${providerSessionId}.jsonl`;
  for (const entry of readdirSync(sessionsDir, { recursive: true })) {
    if (typeof entry === "string" && entry.endsWith(suffix)) {
      rmSync(join(sessionsDir, entry), { force: true });
    }
  }
}
