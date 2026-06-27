import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const WORKSPACE_REGISTRY_FILE = join(
  process.env.HARNESS_AI_HOME || join(homedir(), ".harness-ai"),
  "workspaces.json"
);

export function loadWorkspaceRegistrySnapshot() {
  if (!existsSync(WORKSPACE_REGISTRY_FILE)) {
    return null;
  }
  try {
    const snapshot = JSON.parse(readFileSync(WORKSPACE_REGISTRY_FILE, "utf8"));
    return Array.isArray(snapshot?.workspaces) &&
      typeof snapshot?.activeWorkspaceId === "string"
      ? snapshot
      : null;
  } catch {
    return null;
  }
}

export function saveWorkspaceRegistrySnapshot(snapshot) {
  mkdirSync(dirname(WORKSPACE_REGISTRY_FILE), { recursive: true });
  writeFileSync(
    WORKSPACE_REGISTRY_FILE,
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
}
