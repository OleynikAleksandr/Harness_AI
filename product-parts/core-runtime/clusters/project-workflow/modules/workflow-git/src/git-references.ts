import type {
  WorkflowPlan,
  WorkflowTask,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  type CommitRecord,
  readCommitPaths,
  readHistory,
} from "./git-history.js";
import type { CommitJournal } from "./git-journal.js";
import type { GitRunner } from "./git-runner.js";

export type TaskReference =
  | { paths: string[]; sha: string; status: "committed" }
  | { status: "pending" }
  | { status: "open" };

function trailer(commit: CommitRecord, key: string): string | undefined {
  const values = commit.trailers[key] ?? [];
  ensure(
    values.length <= 1,
    "AMBIGUOUS_COMMIT",
    `Duplicated ${key} trailer in ${commit.sha}.`
  );
  return values[0];
}

/** Roles of commits that complete a plan task. */
const TASK_ROLES = new Set(["docs", "implementation", "quality"]);

function taskCommits(
  history: CommitRecord[],
  scopeId: string,
  task: WorkflowTask
): CommitRecord[] {
  return history.filter(
    (commit) =>
      trailer(commit, "Workflow-Scope") === scopeId &&
      trailer(commit, "Workflow-Task") === task.id &&
      TASK_ROLES.has(trailer(commit, "Workflow-Role") ?? "") &&
      Number(trailer(commit, "Workflow-Iteration") ?? "1") === task.iteration
  );
}

function checkCommit(
  git: GitRunner,
  root: string,
  plan: WorkflowPlan,
  planPath: string,
  task: WorkflowTask,
  commit: CommitRecord,
  resolved: Map<string, string>
): string[] {
  ensure(
    task.status === "DONE",
    "PLAN_COMMIT_MISMATCH",
    `Task ${task.id} has a commit but is not DONE.`,
    { sha: commit.sha }
  );
  ensure(
    commit.parents.length === 1,
    "HISTORY_NOT_LINEAR",
    `The task commit of ${task.id} must have one parent.`,
    { sha: commit.sha }
  );
  const paths = readCommitPaths(git, root, commit.sha);
  const allowed = new Set([...task.files, planPath]);
  const outside = paths.filter((file) => !allowed.has(file));
  ensure(
    outside.length === 0,
    "COMMIT_SCOPE_MISMATCH",
    `The commit of ${task.id} touches files outside the task.`,
    { paths: outside, sha: commit.sha }
  );
  for (const dependency of task.dependencies) {
    const dependencySha = resolved.get(dependency);
    const legacy = plan.tasks.find(
      (item) =>
        item.id === dependency &&
        plan.rounds.find((round) => round.id === item.roundId)?.kind ===
          "legacy"
    );
    ensure(
      legacy ||
        (dependencySha &&
          git.succeeds(root, [
            "merge-base",
            "--is-ancestor",
            dependencySha,
            commit.parents[0] ?? "",
          ])),
      "DEPENDENCY_ORDER",
      `Dependency ${dependency} must be committed before ${task.id}.`
    );
  }
  return paths;
}

/**
 * Proves that every DONE task has exactly one commit in baseline..HEAD that
 * touches only its files, after the commits of its dependencies.
 */
export function resolveTaskReferences(
  git: GitRunner,
  root: string,
  plan: WorkflowPlan,
  planPath: string,
  pending: CommitJournal | null
): Map<string, TaskReference> {
  const references = new Map<string, TaskReference>();
  const scope = plan.scope;
  if (!scope) {
    return references;
  }
  const history = readHistory(git, root, scope.baselineCommit);
  const legacyRounds = new Set(
    plan.rounds
      .filter((round) => round.kind === "legacy")
      .map((round) => round.id)
  );
  const resolved = new Map<string, string>();
  for (const task of plan.tasks.filter(
    (item) => !legacyRounds.has(item.roundId)
  )) {
    const commits = taskCommits(history, scope.id, task);
    ensure(
      commits.length <= 1,
      "AMBIGUOUS_COMMIT",
      `Several commits claim task ${task.id}.`,
      { shas: commits.map((commit) => commit.sha) }
    );
    const [commit] = commits;
    if (commit) {
      const paths = checkCommit(
        git,
        root,
        plan,
        planPath,
        task,
        commit,
        resolved
      );
      resolved.set(task.id, commit.sha);
      references.set(task.id, { paths, sha: commit.sha, status: "committed" });
      continue;
    }
    const inTransaction =
      pending?.scopeId === scope.id && pending.taskId === task.id;
    ensure(
      task.status !== "DONE" || inTransaction,
      "PLAN_COMMIT_MISMATCH",
      `Task ${task.id} is DONE but has no commit.`,
      {},
      "Run `scripts/workflow repair`."
    );
    references.set(task.id, { status: inTransaction ? "pending" : "open" });
  }
  return references;
}
