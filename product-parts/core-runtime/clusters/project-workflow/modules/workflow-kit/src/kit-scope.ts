import {
  type ExecutionModeOption,
  workflowExecutionModeFacade,
} from "../../workflow-execution-mode/src/workflow-execution-mode-facade.js";
import type { CommitResult } from "../../workflow-git/src/workflow-git-facade.js";
import {
  type ExecutionStrategy,
  type WorkflowExecution,
  type WorkflowPlan,
  type WorkflowPlanFacade,
  type WorkflowTask,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";
import { workflowQualityFacade } from "../../workflow-quality/src/workflow-quality-facade.js";
import {
  changedDocuments,
  commitPlan,
  ensureNoIntegration,
  ensureNoTransaction,
  ensureRevision,
  type KitContext,
  locked,
  readConfig,
  readPlan,
  requireHead,
  savePlan,
} from "./kit-context.js";
import {
  changedContextTasks,
  ensureContextBudget,
} from "./kit-context-budget.js";

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

/**
 * CHECK_UNKNOWN before anything is written: `checks` of the input tasks are
 * quality check ids (`workflowQualityFacade.ensurePlannedChecks`), refusals
 * name the input field `tasks[<index>].checks`.
 */
function ensureInputChecks(
  context: KitContext,
  tasks: readonly { checks?: readonly string[]; id?: string }[] | undefined
): void {
  workflowQualityFacade.ensurePlannedChecks(
    readConfig(context),
    (tasks ?? []).map((task, index) => ({
      checks: task.checks ?? [],
      field: `tasks[${index}].checks`,
      taskId: task.id ?? null,
    }))
  );
}

function change(plan: WorkflowPlan, commit: CommitResult | null): PlanChange {
  return { commit, revision: plan.revision, scopeId: plan.scope?.id ?? null };
}

/** Creates and commits the scope; every creation path clears the proposal. */
function commitScope(context: KitContext, input: ScopeInput): PlanChange {
  ensureNoTransaction(context);
  const plan = workflowPlanFacade.createScope(
    readPlan(context),
    input,
    transition(context)
  );
  ensureInputChecks(context, input.tasks);
  ensureContextBudget(context, plan, plan.tasks);
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
  workflowExecutionModeFacade.clear(context.root);
  return change(plan, commit);
}

/**
 * `scope:create`: records the agreed scope and commits it with its
 * documents. A Harness-hosted project chooses the mode through
 * `scope:propose` instead (`EXECUTION_MODE_REQUIRED`).
 */
export function createScope(
  context: KitContext,
  input: ScopeInput
): PlanChange {
  return locked(context, () => {
    ensure(
      readConfig(context).host !== "harness",
      "EXECUTION_MODE_REQUIRED",
      "In a Harness project the user chooses the execution mode; propose the scope instead of creating it.",
      {},
      'Run `scripts/workflow scope:propose --input <file.json> --recommended sequential|orchestrated --reason "<why>"` and end the turn.'
    );
    return commitScope(context, input);
  });
}

/** The proposal answer of `scope:propose`. */
export interface ScopeProposalResult {
  autoChosen: boolean;
  generation: number;
  hasParallelWork: boolean;
  options: ExecutionModeOption[];
  reason: string;
  recommended: ExecutionStrategy;
  scope: PlanChange | null;
}

/** The answer of `scope:choose`. */
export interface ScopeChoiceResult {
  execution: WorkflowExecution | null;
  generation: number;
  option: ExecutionModeOption;
  refining: boolean;
  scope: PlanChange | null;
}

/** The scope input with the chosen strategy; `maxWorkers` comes from the input or the default. */
function withExecution(
  input: ScopeInput,
  strategy: ExecutionStrategy,
  ownerSession: string | null,
  note: string | null
): ScopeInput {
  const maxWorkers = input.execution?.maxWorkers;
  return {
    ...structuredClone(input),
    ...(note === null ? {} : { approval: `${input.approval} | ${note}` }),
    execution: {
      ...(maxWorkers === undefined ? {} : { maxWorkers }),
      ownerSession,
      strategy,
    },
  };
}

/**
 * `scope:propose`: validates the plan exactly like `scope:create` without
 * creating it and stores the proposal for the user's choice. After a
 * "refine" answer, a new proposal without parallel work creates the
 * sequential scope at once (`autoChosen`).
 */
export function proposeScope(
  context: KitContext,
  request: { input: ScopeInput; reason: string; recommended: ExecutionStrategy }
): ScopeProposalResult {
  return locked(context, () => {
    ensureNoTransaction(context);
    const candidate = workflowPlanFacade.createScope(
      readPlan(context),
      withExecution(request.input, request.recommended, null, null),
      transition(context)
    );
    ensureInputChecks(context, request.input.tasks);
    ensureContextBudget(context, candidate, candidate.tasks);
    const proposal = workflowExecutionModeFacade.nextProposal(context.root, {
      hasParallelWork: workflowPlanFacade.hasParallelWork(candidate),
      input: request.input,
      now: context.now(),
      reason: request.reason,
      recommended: request.recommended,
    });
    const answer = {
      generation: proposal.generation,
      hasParallelWork: proposal.hasParallelWork,
      options: proposal.options,
      reason: proposal.reason,
      recommended: proposal.recommended,
    };
    const previous = workflowExecutionModeFacade.readProposal(context.root);
    if (previous?.refining === true && !proposal.hasParallelWork) {
      const scope = commitScope(
        context,
        withExecution(
          request.input,
          "sequential",
          null,
          "Execution mode chosen automatically: sequential (no parallel work after the specification was refined)"
        )
      );
      return { ...answer, autoChosen: true, scope };
    }
    workflowExecutionModeFacade.writeProposal(context.root, proposal);
    return { ...answer, autoChosen: false, scope: null };
  });
}

/**
 * `scope:choose`: records the user's answer to the current proposal.
 * `sequential`/`orchestrated` create the scope from the stored plan,
 * `refine` drops the plan and keeps the cycle in refinement. A stale
 * choice fails with PROPOSAL_CHANGED before anything is written.
 */
export function chooseScope(
  context: KitContext,
  request: {
    generation: number;
    note: string;
    option: ExecutionModeOption;
    session: string;
  }
): ScopeChoiceResult {
  return locked(context, () => {
    ensureNoTransaction(context);
    const choice = { ...request, now: context.now() };
    const proposal = workflowExecutionModeFacade.verifyChoice(
      context.root,
      choice
    );
    if (request.option === "refine") {
      workflowExecutionModeFacade.refine(context.root, proposal, choice);
      return {
        execution: null,
        generation: proposal.generation,
        option: "refine",
        refining: true,
        scope: null,
      };
    }
    const scope = commitScope(
      context,
      withExecution(
        proposal.input as ScopeInput,
        request.option,
        request.session.trim(),
        `Execution mode chosen by the user: ${request.option}: ${request.note.trim()}`
      )
    );
    return {
      execution: workflowPlanFacade.execution(readPlan(context)),
      generation: proposal.generation,
      option: request.option,
      refining: false,
      scope,
    };
  });
}

/** `plan:extend`: adds tasks to the open round or a new round. */
export function extendScope(
  context: KitContext,
  input: ExtendInput,
  expectedRevision?: number
): PlanChange & { deferredDocsTaskId: string | null; roundId: string } {
  return locked(context, () => {
    ensureNoTransaction(context);
    const current = readPlan(context);
    ensureRevision(current, expectedRevision);
    const result = workflowPlanFacade.extend(
      current,
      input,
      transition(context)
    );
    ensureInputChecks(context, input.tasks);
    ensureContextBudget(
      context,
      result.plan,
      changedContextTasks(current, result.plan)
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
    ensureNoTransaction(context);
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
    if (patch.checks !== undefined) {
      workflowQualityFacade.ensurePlannedChecks(readConfig(context), [
        { checks: patch.checks, field: "checks", taskId },
      ]);
    }
    ensureContextBudget(context, plan, [workflowPlanFacade.task(plan, taskId)]);
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
    ensureNoTransaction(context);
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
    ensureNoTransaction(context);
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
    workflowExecutionModeFacade.clear(context.root);
    return change(plan, commit);
  });
}

/** `carryover`: moves unfinished tasks into a new scope. */
export function carryoverScope(
  context: KitContext,
  input: CarryoverInput
): PlanChange {
  return locked(context, () => {
    ensureNoTransaction(context);
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
    ensureNoIntegration(context);
    const current = readPlan(context);
    const plan =
      reason === null
        ? workflowPlanFacade.unblock(current)
        : workflowPlanFacade.block(current, reason);
    savePlan(context, plan);
    return change(plan, null);
  });
}
