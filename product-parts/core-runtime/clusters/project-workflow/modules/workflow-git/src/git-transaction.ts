import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import {
  ensure,
  WorkflowError,
  workflowPlatformFacade,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import { readChanges, readHistory } from "./git-history.js";
import {
  type CommitJournal,
  type CommitRole,
  commitMessageFor,
  localPath,
  readJournal,
  removeJournal,
  saveJournal,
  sha256,
} from "./git-journal.js";
import type { GitRunner } from "./git-runner.js";

export interface CommitRequest {
  checks?: string[];
  excluded?: string[];
  files: string[];
  iteration?: number;
  message: string;
  planPath: string;
  /** Full text of the plan document after this operation. */
  planText: string;
  /** Prepare-stage hook (formatters); may change the selected files before staging. */
  prepare?: (files: string[]) => void;
  role: CommitRole;
  scopeId: string | null;
  taskId: string | null;
}

export interface CommitResult {
  excluded: string[];
  role: CommitRole;
  sha: string;
  taskId: string | null;
}

const COMMIT_TIMEOUT_MS = 30 * 60 * 1000;
const NEXT_ACTION_RETRY =
  "Fix the reported problem and repeat the same command; your edits are kept.";

function head(git: GitRunner, root: string): string | null {
  const output = git.run(root, ["rev-parse", "--verify", "-q", "HEAD"], {
    allowFailure: true,
  });
  return output.status === 0 ? output.stdout.trim() : null;
}

function planAbsolute(root: string, planPath: string): string {
  return path.join(root, ...planPath.split("/"));
}

function indexFile(git: GitRunner, root: string): string {
  return git.text(root, [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "index",
  ]);
}

/** Returns the SHA when HEAD is exactly the commit this journal produced. */
export function confirmedCommit(
  git: GitRunner,
  root: string,
  journal: CommitJournal
): string | null {
  const now = head(git, root);
  if (!now || now === journal.beforeHead) {
    return null;
  }
  const [commit] = readHistory(git, root, journal.beforeHead, now).slice(-1);
  if (!commit || commit.trailers["Workflow-Transaction"]?.[0] !== journal.id) {
    return null;
  }
  ensure(
    (commit.parents[0] ?? null) === journal.beforeHead &&
      commit.parents.length <= 1,
    "TRANSACTION_PARENT",
    "The commit parent does not match the transaction."
  );
  ensure(
    git.text(root, ["rev-parse", "HEAD^{tree}"]) === journal.candidateTree,
    "TRANSACTION_TREE",
    "The commit content differs from the prepared candidate."
  );
  return now;
}

function finalize(
  root: string,
  journal: CommitJournal,
  sha: string
): CommitResult {
  const pending = localPath(root, "verification", `pending-${journal.id}.json`);
  if (existsSync(pending)) {
    const evidence = {
      ...JSON.parse(readFileSync(pending, "utf8")),
      commit: sha,
    };
    const text = `${JSON.stringify(evidence, null, 2)}\n`;
    workflowPlatformFacade.writeFileAtomic(
      localPath(root, "verification", `${sha}.json`),
      text
    );
    workflowPlatformFacade.writeFileAtomic(
      localPath(root, "verification", "last.json"),
      text
    );
  }
  workflowPlatformFacade.writeFileAtomic(
    localPath(root, "last-commit.json"),
    `${JSON.stringify({ role: journal.role, scopeId: journal.scopeId, sha, taskId: journal.taskId, transaction: journal.id }, null, 2)}\n`
  );
  removeJournal(root);
  return {
    excluded: journal.excluded,
    role: journal.role,
    sha,
    taskId: journal.taskId,
  };
}

function rollback(
  git: GitRunner,
  root: string,
  journal: CommitJournal
): boolean {
  const backup = localPath(root, "index-before");
  const plan = planAbsolute(root, journal.planPath);
  const untouched =
    head(git, root) === journal.beforeHead &&
    existsSync(plan) &&
    sha256(readFileSync(plan)) === journal.candidateHash &&
    git.text(root, ["write-tree"]) === journal.candidateTree;
  if (!untouched) {
    return false;
  }
  if (existsSync(backup)) {
    workflowPlatformFacade.writeFileAtomic(
      indexFile(git, root),
      readFileSync(backup)
    );
  } else if (journal.beforeHead) {
    git.run(root, ["read-tree", journal.beforeHead]);
  } else {
    git.run(root, ["read-tree", "--empty"]);
  }
  if (journal.originalPlan === null) {
    rmSync(plan, { force: true });
  } else {
    workflowPlatformFacade.writeFileAtomic(plan, journal.originalPlan);
  }
  workflowPlatformFacade.writeFileAtomic(
    localPath(root, "verification", `failed-${journal.id}.json`),
    `${JSON.stringify(journal, null, 2)}\n`
  );
  removeJournal(root);
  return true;
}

function stage(git: GitRunner, root: string, files: string[]): void {
  const tracked = new Set(
    git
      .run(root, ["ls-files", "-z", "--", ...files])
      .stdout.split("\u0000")
      .filter(Boolean)
  );
  const stageable = files.filter(
    (file) =>
      tracked.has(file) || existsSync(path.join(root, ...file.split("/")))
  );
  if (stageable.length > 0) {
    git.run(root, ["add", "-A", "--", ...stageable]);
  }
}

function prepareJournal(
  git: GitRunner,
  root: string,
  request: CommitRequest,
  id: string
): CommitJournal {
  const plan = planAbsolute(root, request.planPath);
  const originalPlan = existsSync(plan) ? readFileSync(plan, "utf8") : null;
  const index = indexFile(git, root);
  if (existsSync(index)) {
    copyFileSync(index, localPath(root, "index-before"));
  }
  return {
    beforeHead: head(git, root),
    candidateHash: sha256(request.planText),
    candidatePlan: request.planText,
    candidateTree: null,
    checkedSnapshot: null,
    checks: request.checks ?? [],
    createdAt: new Date().toISOString(),
    error: null,
    excluded: request.excluded ?? [],
    id,
    iteration: request.iteration ?? 1,
    message: request.message,
    originalPlan,
    phase: "PREPARING",
    planPath: request.planPath,
    role: request.role,
    schema: 1,
    scopeId: request.scopeId,
    selected: [...new Set([...request.files, request.planPath])].sort(),
    taskId: request.taskId,
  };
}

/**
 * Creates one commit through a journaled transaction. Failed hook checks roll
 * the plan and index back while keeping every working-tree edit.
 */
export function commitCandidate(
  git: GitRunner,
  root: string,
  request: CommitRequest,
  id: string
): CommitResult {
  ensure(
    readJournal(root) === null,
    "TRANSACTION_PENDING",
    "Another commit transaction is unfinished.",
    {},
    "Run `scripts/workflow repair` to finish or cancel it."
  );
  const staged = readChanges(git, root).staged;
  const allowed = new Set([...request.files, request.planPath]);
  const foreign = staged.filter((file) => !allowed.has(file));
  ensure(
    foreign.length === 0,
    "FOREIGN_STAGED",
    "The index holds files outside this operation; unstage them first.",
    { paths: foreign }
  );
  mkdirSync(localPath(root), { recursive: true });
  const journal = prepareJournal(git, root, request, id);
  saveJournal(root, journal);
  request.prepare?.(request.files);
  workflowPlatformFacade.writeFileAtomic(
    planAbsolute(root, request.planPath),
    request.planText
  );
  stage(git, root, journal.selected);
  const hasChanges =
    git.run(root, ["diff", "--cached", "--quiet"], { allowFailure: true })
      .status === 1;
  if (!hasChanges) {
    rollback(git, root, {
      ...journal,
      candidateTree: git.text(root, ["write-tree"]),
    });
    throw new WorkflowError(
      "NOTHING_TO_COMMIT",
      "There are no changes to commit."
    );
  }
  journal.candidateTree = git.text(root, ["write-tree"]);
  journal.phase = "PREPARED";
  saveJournal(root, journal);
  const result = git.run(root, ["commit", "-q", "-F", "-"], {
    allowFailure: true,
    input: commitMessageFor(journal),
    timeoutMs: COMMIT_TIMEOUT_MS,
  });
  if (result.status !== 0) {
    const failed = {
      ...(readJournal(root) ?? journal),
      error: `${result.stderr}${result.stdout}`.slice(-8000),
      phase: "FAILED" as const,
    };
    saveJournal(root, failed);
    const restored = rollback(git, root, failed);
    throw new WorkflowError(
      "COMMIT_FAILED",
      restored
        ? "A commit check failed. The plan and index were restored; your edits are kept."
        : "The commit failed and the project changed concurrently; the journal is kept.",
      { output: failed.error, retryable: restored },
      restored ? NEXT_ACTION_RETRY : "Run `scripts/workflow repair`."
    );
  }
  const sha = confirmedCommit(git, root, journal);
  ensure(
    sha,
    "COMMIT_NOT_CONFIRMED",
    "Git finished but the expected commit was not found.",
    {},
    "Run `scripts/workflow repair`."
  );
  return finalize(root, readJournal(root) ?? journal, sha);
}

/** Finishes the bookkeeping of a transaction whose commit already exists. */
export function finishConfirmed(
  git: GitRunner,
  root: string
): CommitResult | null {
  const journal = readJournal(root);
  if (!journal) {
    return null;
  }
  const sha = confirmedCommit(git, root, journal);
  return sha ? finalize(root, journal, sha) : null;
}

export { rollback as rollbackTransaction };
