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
    return Array.isArray(parsed)
      ? parsed.filter(isCoreSession).map(normalizeCoreSession)
      : [];
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
    isOptionalString(value.agentNickname) &&
    isOptionalString(value.agentRole) &&
    isOptionalString(value.delegatedTask) &&
    isOptionalString(value.parentSessionId) &&
    isOptionalString(value.reasoningEffort) &&
    isOptionalString(value.subagentCallId) &&
    isOptionalString(value.workingDirectory) &&
    (value.sessionKind === undefined ||
      value.sessionKind === "primary" ||
      value.sessionKind === "subagent") &&
    (value.sessionKind !== "subagent" ||
      typeof value.parentSessionId === "string") &&
    isSessionPurpose(value.sessionPurpose) &&
    (value.subagentStatus === undefined ||
      isSubagentStatus(value.subagentStatus)) &&
    (value.titleOrigin === undefined ||
      value.titleOrigin === "default" ||
      value.titleOrigin === "auto" ||
      value.titleOrigin === "manual") &&
    isAppliedProfileSnapshot(value.appliedProfile)
  );
}

function isSessionPurpose(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }
  return (
    isRecord(value) &&
    value.type === "profile-creator" &&
    typeof value.profileId === "string" &&
    Boolean(value.profileId.trim())
  );
}

function normalizeCoreSession(session: CoreSession): CoreSession {
  return {
    ...session,
    sessionKind: session.sessionKind ?? "primary",
    titleOrigin: session.titleOrigin ?? "default",
  };
}

function isSubagentStatus(value: unknown): boolean {
  return (
    value === "pending" ||
    value === "running" ||
    value === "interrupted" ||
    value === "completed" ||
    value === "failed" ||
    value === "shutdown" ||
    value === "not_found"
  );
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
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
    (value.inputPrefix === undefined ||
      (Array.isArray(value.inputPrefix) &&
        value.inputPrefix.every(isRecord))) &&
    (value.prompt === undefined || typeof value.prompt === "string") &&
    (value.requestTemplate === undefined || isRecord(value.requestTemplate)) &&
    (value.tools === undefined ||
      (Array.isArray(value.tools) && value.tools.every(isRecord))) &&
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
