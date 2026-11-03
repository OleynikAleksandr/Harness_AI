import type { CommitResult } from "../../workflow-git/src/workflow-git-facade.js";
import {
  type WorkflowPlan,
  type WorkflowPlanFacade,
  type WorkflowTask,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  changedDocuments,
  commitPlan,
  ensureNoTransaction,
  ensureRevision,
  type KitContext,
  locked,
  readConfig,
  readPlan,
  requireHead,
  savePlan,
} from "./kit-context.js";

export type ScopeInput = Parameters<WorkflowPlanFacade["createScope"]>[1];
export type ExtendInput = Parameters<WorkflowPlanFacade["extend"]>[1];
export type CarryoverInput = Parameters<WorkflowPlanFacade["carryover"]>[1];

export interface PlanChange {
  commit: CommitResult | null;
  revision: number;
  scopeId: string | null;
}

/** Task fields `task:update` may change. */
export type TaskPatch = Partial<
  Pick<
    WorkflowTask,
    | "acceptance"
    | "checks"
    | "commitMessage"
    | "context"
    | "dependencies"
    | "docsWaiver"
    | "files"
    | "title"
    | "why"
  >
>;

const PATCH_FIELDS = new Set<string>([
  "acceptance",
  "checks",
  "commitMessage",
  "context",
  "dependencies",
  "docsWaiver",
  "files",
  "title",
  "why",
]);
const IN_PROGRESS_FIELDS = new Set<string>([
  "acceptance",
  "checks",
  "docsWaiver",
  "files",
]);

function transition(context: KitContext): {
  baselineCommit: string;
  now: string;
  qualityConfigured: boolean;
} {
  return {
    baselineCommit: requireHead(context),
    now: context.now(),
    qualityConfigured: readConfig(context).quality.status === "CONFIGURED",
  };
}

function change(plan: WorkflowPlan, commit: CommitResult | null): PlanChange {
  return { commit, revision: plan.revision, scopeId: plan.scope?.id ?? null };
}

/** `scope:create`: records the agreed scope and commits it with its documents. */
export function createScope(
  context: KitContext,
  input: ScopeInput
): PlanChange {
  return locked(context, () => {
    ensureNoTransaction(context);
    const plan = workflowPlanFacade.createScope(
      readPlan(context),
      input,
      transition(context)
    );
    const documents = changedDocuments(context, [
      input.spec,
      ...(input.context ?? []).map((ref) => ref.path),
    ]);
    const commit = commitPlan(context, plan, {
      files: documents,
      message: `docs: plan scope ${input.id}`,
      role: "scope-plan",
      scopeId: input.id,
      taskId: null,
    });
    return change(plan, commit);
  });
}

/** `plan:extend`: adds tasks to the open round or a new round. */
export function extendScope(
  context: KitContext,
  input: ExtendInput,
  expectedRevision?: number
): PlanChange & { deferredDocsTaskId: string | null; roundId: string } {
  return locked(context, () => {
    const current = readPlan(context);
    ensureRevision(current, expectedRevision);
    const result = workflowPlanFacade.extend(
      current,
      input,
      transition(context)
    );
    const commit = commitPlan(context, result.plan, {
      files: [],
      message: `docs: extend scope ${current.scope?.id ?? "NONE"} (${result.roundId})`,
      role: "scope-plan",
      scopeId: current.scope?.id ?? null,
      taskId: null,
    });
    return {
      ...change(result.plan, commit),
      deferredDocsTaskId: result.deferredDocsTaskId,
      roundId: result.roundId,
    };
  });
}

/** `task:update`: edits a task that is not done. */
export function updateTask(
  context: KitContext,
  taskId: string,
  patch: TaskPatch,
  expectedRevision?: number
): PlanChange {
  return locked(context, () => {
    const current = readPlan(context);
    ensureRevision(current, expectedRevision);
    const original = workflowPlanFacade.task(current, taskId);
    const fields = Object.keys(patch);
    ensure(
      fields.length > 0 && fields.every((field) => PATCH_FIELDS.has(field)),
      "TASK_PATCH",
      `task:update changes only: ${[...PATCH_FIELDS].join(", ")}.`
    );
    ensure(
      original.status === "TODO" ||
        (original.status === "IN_PROGRESS" &&
          fields.every((field) => IN_PROGRESS_FIELDS.has(field))),
      "TASK_PATCH",
      original.status === "DONE"
        ? "A DONE task never changes; extend the plan with a fix task."
        : `A task in progress changes only: ${[...IN_PROGRESS_FIELDS].join(", ")}.`
    );
    const plan = structuredClone(current);
    plan.revision += 1;
    Object.assign(
      workflowPlanFacade.task(plan, taskId),
      structuredClone(patch)
    );
    workflowPlanFacade.validate(plan);
    const commit = commitPlan(context, plan, {
      files: [],
      message: `docs: update task ${taskId}`,
      role: "scope-plan",
      scopeId: plan.scope?.id ?? null,
      taskId: null,
    });
    return change(plan, commit);
  });
}

/** `accept`: records the user's acceptance; the scope stays open. */
export function acceptScope(context: KitContext, note: string): PlanChange {
  return locked(context, () => {
    const plan = workflowPlanFacade.accept(
      readPlan(context),
      note,
      context.now()
    );
    const commit = commitPlan(context, plan, {
      files: [],
      message: `chore: accept scope ${plan.scope?.id ?? "NONE"}`,
      role: "acceptance",
      scopeId: plan.scope?.id ?? null,
      taskId: null,
    });
    return change(plan, commit);
  });
}

/** `close`: only from ACCEPTED, on a clean tree, by a direct user command. */
export function closeScope(
  context: KitContext,
  scopeId: string,
  note: string
): PlanChange {
  return locked(context, () => {
    const dirty = context.git
      .changes(context.root)
      .all.filter((file) => !context.git.isKitManagedPath(file));
    ensure(
      dirty.length === 0,
      "DIRTY_TREE",
      "Close the scope on a clean working tree.",
      { paths: dirty }
    );
    const plan = workflowPlanFacade.close(
      readPlan(context),
      scopeId,
      note,
      context.now()
    );
    const commit = commitPlan(context, plan, {
      files: [],
      message: `chore: close scope ${scopeId}`,
      role: "close",
      scopeId,
      taskId: null,
    });
    return change(plan, commit);
  });
}

/** `carryover`: moves unfinished tasks into a new scope. */
export function carryoverScope(
  context: KitContext,
  input: CarryoverInput
): PlanChange {
  return locked(context, () => {
    const plan = workflowPlanFacade.carryover(
      readPlan(context),
      input,
      transition(context)
    );
    const commit = commitPlan(context, plan, {
      files: [],
      message: `chore: carry over into scope ${input.id}`,
      role: "carryover",
      scopeId: input.id,
      taskId: null,
    });
    return change(plan, commit);
  });
}

/** `task:block` / `task:unblock`: the next Kit commit records the state. */
export function setBlocked(
  context: KitContext,
  reason: string | null
): PlanChange {
  return locked(context, () => {
    const current = readPlan(context);
    const plan =
      reason === null
        ? workflowPlanFacade.unblock(current)
        : workflowPlanFacade.block(current, reason);
    savePlan(context, plan);
    return change(plan, null);
  });
}
