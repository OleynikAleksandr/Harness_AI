import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CoreSession } from "./session-request-handler-facade.js";

export function readWorkspaceSessionIndex(
  workspacePath: string
): CoreSession[] {
  const indexPath = sessionIndexPath(workspacePath);
  if (!existsSync(indexPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(indexPath, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isCoreSession) : [];
  } catch {
    return [];
  }
}

export function writeWorkspaceSessionIndex(
  workspacePath: string,
  sessions: CoreSession[]
): void {
  const indexPath = sessionIndexPath(workspacePath);
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, JSON.stringify(sessions, null, 2), "utf8");
}

function sessionIndexPath(workspacePath: string): string {
  return join(workspacePath, ".harness", "sessions", "index.json");
}

function isCoreSession(value: unknown): value is CoreSession {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.providerId === "string" &&
    typeof value.providerName === "string" &&
    typeof value.model === "string" &&
    typeof value.title === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.workspacePath === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.providerSessionId === undefined ||
      typeof value.providerSessionId === "string") &&
    isAppliedProfileSnapshot(value.appliedProfile)
  );
}

// Sessions persisted before session profiles have no appliedProfile (legacy);
// a malformed snapshot invalidates the entry instead of resurrecting it with
// different instructions than the user chose.
function isAppliedProfileSnapshot(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  return (
    isRecord(value) &&
    (value.kind === "managed" || value.kind === "native") &&
    typeof value.profileId === "string" &&
    typeof value.profileName === "string" &&
    (value.prompt === undefined || typeof value.prompt === "string") &&
    (value.contentHash === undefined ||
      typeof value.contentHash === "string") &&
    (value.toolingCategories === undefined ||
      isRecord(value.toolingCategories)) &&
    (value.appliedProfileApplication === undefined ||
      isRecord(value.appliedProfileApplication))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
