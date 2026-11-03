import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { workflowPlatformFacade } from "../../workflow-platform/src/workflow-platform-facade.js";

/** Project-relative directory for local, git-ignored Workflow Kit state. */
export const LOCAL_DIR = ".harness/workflow/local";

export type CommitRole =
  | "acceptance"
  | "bootstrap"
  | "carryover"
  | "close"
  | "docs"
  | "implementation"
  | "kit-update"
  | "quality"
  | "repair"
  | "scope-plan";

export type JournalPhase = "CHECKED" | "FAILED" | "PREPARED" | "PREPARING";

export interface CommitJournal {
  beforeHead: string | null;
  candidateHash: string;
  candidatePlan: string;
  candidateTree: string | null;
  checkedSnapshot: string | null;
  checks: string[];
  createdAt: string;
  error: string | null;
  excluded: string[];
  id: string;
  iteration: number;
  message: string;
  originalPlan: string | null;
  phase: JournalPhase;
  planPath: string;
  role: CommitRole;
  schema: 1;
  scopeId: string | null;
  selected: string[];
  taskId: string | null;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function localPath(root: string, ...parts: string[]): string {
  return path.join(root, ...LOCAL_DIR.split("/"), ...parts);
}

export function readJournal(root: string): CommitJournal | null {
  const file = localPath(root, "transaction.json");
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as CommitJournal)
    : null;
}

export function saveJournal(root: string, journal: CommitJournal): void {
  workflowPlatformFacade.writeFileAtomic(
    localPath(root, "transaction.json"),
    `${JSON.stringify(journal, null, 2)}\n`
  );
}

export function removeJournal(root: string): void {
  rmSync(localPath(root, "transaction.json"), { force: true });
  rmSync(localPath(root, "index-before"), { force: true });
}

/** Full commit message: subject/body followed by the Workflow trailers. */
export function commitMessageFor(journal: CommitJournal): string {
  const trailers = [
    `Workflow-Scope: ${journal.scopeId ?? "NONE"}`,
    `Workflow-Task: ${journal.taskId ?? "-"}`,
    `Workflow-Role: ${journal.role}`,
    ...(journal.role === "implementation"
      ? [`Workflow-Iteration: ${journal.iteration}`]
      : []),
    `Workflow-Transaction: ${journal.id}`,
  ];
  return `${journal.message.trim()}\n\n${trailers.join("\n")}\n`;
}
