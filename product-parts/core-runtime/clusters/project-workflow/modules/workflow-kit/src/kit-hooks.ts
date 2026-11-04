import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CommitJournal } from "../../workflow-git/src/workflow-git-facade.js";
import {
  type WorkflowPlan,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  type StageReport,
  workflowQualityFacade,
} from "../../workflow-quality/src/workflow-quality-facade.js";
import type { KitContext } from "./kit-context.js";
import { executorAssignment, guardExecutorCandidate } from "./kit-executor.js";

export type GitHookName =
  | "commit-msg"
  | "post-commit"
  | "pre-commit"
  | "pre-push";

export const GIT_HOOKS: readonly GitHookName[] = [
  "pre-commit",
  "commit-msg",
  "post-commit",
  "pre-push",
];

export interface HookResult {
  code: string | null;
  exitCode: number;
  message: string;
}

const MANAGED_HINT =
  "Commit through the Workflow Kit: `scripts/workflow commit --task <ID>` or `scripts/workflow docs:commit`.";
const OUTPUT_TAIL = 1500;

const pass = (message = ""): HookResult => ({
  code: null,
  exitCode: 0,
  message,
});
const fail = (code: string, message: string): HookResult => ({
  code,
  exitCode: 1,
  message: `${code}: ${message}`,
});

function fingerprints(root: string, files: string[]): string {
  return files
    .map((file) => {
      const absolute = path.join(root, ...file.split("/"));
      const digest = existsSync(absolute)
        ? createHash("sha256").update(readFileSync(absolute)).digest("hex")
        : "deleted";
      return `${file}:${digest}`;
    })
    .join("\n");
}

function failedSummary(report: StageReport): string {
  return report.results
    .filter((item) => item.status !== "passed" && item.status !== "skipped")
    .map(
      (item) =>
        `- ${item.id} ${item.status}${item.reason ? ` (${item.reason})` : ""}\n${item.output.slice(-OUTPUT_TAIL)}`
    )
    .join("\n");
}

function docsWaiver(journal: CommitJournal): string | null {
  if (!journal.taskId) {
    return null;
  }
  try {
    const plan = workflowPlanFacade.parse(journal.candidatePlan, {
      projection: false,
    });
    return (
      plan.tasks.find((task) => task.id === journal.taskId)?.docsWaiver ?? null
    );
  } catch {
    return null;
  }
}

function preCommit(context: KitContext): HookResult {
  const { git, root } = context;
  const journal = git.transactions.journal(root);
  if (!journal || journal.phase !== "PREPARED") {
    return fail("MANAGED_COMMIT_REQUIRED", MANAGED_HINT);
  }
  const treeBefore = git.git.text(root, ["write-tree"]);
  if (treeBefore !== journal.candidateTree) {
    return fail(
      "MANAGED_COMMIT_REQUIRED",
      "The index differs from the prepared candidate of the transaction."
    );
  }
  guardExecutorCandidate(context, journal);
  const before = fingerprints(root, journal.selected);
  const report = workflowQualityFacade.runStage({
    assigned: journal.checks,
    config: workflowQualityFacade.readConfig(root),
    docsWaiver: docsWaiver(journal),
    env: context.env,
    files: journal.selected,
    root,
    service: journal.role !== "implementation",
    stage: "commit",
  });
  workflowQualityFacade.recordEvidence(root, journal.id, [report]);
  if (
    git.git.text(root, ["write-tree"]) !== journal.candidateTree ||
    fingerprints(root, journal.selected) !== before
  ) {
    return fail(
      "CHECK_MODIFIED_CANDIDATE",
      "A commit-stage check changed the candidate files; commit checks may only read. Move fixers to the prepare stage."
    );
  }
  if (!report.ok) {
    return fail(
      "CHECK_FAILED",
      `Commit checks failed:\n${failedSummary(report)}`
    );
  }
  return pass(
    `Workflow checks passed: ${report.results.map((item) => `${item.id} ${item.status}`).join(", ") || "none"}.`
  );
}

function commitMessage(context: KitContext, args: string[]): HookResult {
  const journal = context.git.transactions.journal(context.root);
  const file = args[0] ? path.resolve(context.root, args[0]) : "";
  const message = file && existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!(journal && message.includes(`Workflow-Transaction: ${journal.id}`))) {
    return fail("MANAGED_COMMIT_REQUIRED", MANAGED_HINT);
  }
  return pass();
}

/** The last round with finished work must have its DOCS task done. */
function pendingDocs(plan: WorkflowPlan | null): string | null {
  if (!plan) {
    return null;
  }
  const rounds = plan.rounds.filter((round) =>
    plan.tasks.some(
      (task) =>
        task.roundId === round.id &&
        task.kind !== "docs" &&
        task.status === "DONE"
    )
  );
  const last = rounds.at(-1);
  if (!last || last.kind === "legacy") {
    return null;
  }
  const docs = plan.tasks.find(
    (task) => task.roundId === last.id && task.kind === "docs"
  );
  return docs && docs.status !== "DONE" ? docs.id : null;
}

function prePush(context: KitContext): HookResult {
  const executor = executorAssignment(context);
  if (executor) {
    return fail(
      "ASSIGNMENT_READ_ONLY",
      `The executor worktree of ${executor.id} never pushes; report the commit SHA to the orchestrator.`
    );
  }
  if (context.git.transactions.journal(context.root)) {
    return fail(
      "TRANSACTION_PENDING",
      "A commit transaction is unfinished; run `scripts/workflow repair`."
    );
  }
  const docs = pendingDocs(workflowPlanFacade.read(context.root));
  if (docs) {
    return fail(
      "DOCS_PENDING",
      `Finish ${docs} (documentation and round digest) before pushing.`
    );
  }
  const report = workflowQualityFacade.runStage({
    config: workflowQualityFacade.readConfig(context.root),
    env: context.env,
    root: context.root,
    stage: "push",
  });
  if (!report.ok) {
    return fail(
      "CHECK_FAILED",
      `Push checks failed:\n${failedSummary(report)}`
    );
  }
  return pass(
    `Workflow push checks passed: ${report.results.map((item) => item.id).join(", ") || "none"}.`
  );
}

/** `git-hook <name>`: the managed git hooks of an installed project. */
export function runGitHook(
  context: KitContext,
  name: string,
  args: string[]
): HookResult {
  try {
    switch (name) {
      case "pre-commit":
        return preCommit(context);
      case "commit-msg":
        return commitMessage(context, args);
      case "post-commit":
        return pass();
      case "pre-push":
        return prePush(context);
      default:
        return fail("UNKNOWN_HOOK", `Unknown git hook: ${name}`);
    }
  } catch (error) {
    const { code, message } = error as { code?: string; message: string };
    return fail(code ?? "HOOK_ERROR", message);
  }
}
