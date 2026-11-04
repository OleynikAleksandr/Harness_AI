import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";
import { checkCarryoverInput, checkExtendInput } from "./plan-input-checks.js";
import {
  docsTaskId,
  emptyPlan,
  functionalFiles,
  isDocumentationPath,
  type RoundKind,
  type WorkflowPlan,
  type WorkflowRound,
  type WorkflowTask,
} from "./plan-model.js";
import {
  arrangeRound,
  buildQualityTask,
  normalizeTaskInput,
  type TaskInput,
} from "./plan-service-tasks.js";
import {
  nextRevision,
  recomputeDelivery,
  type TransitionContext,
} from "./plan-transitions.js";
import { validatePlan } from "./plan-validation.js";

export interface ExtendTaskInput extends TaskInput {
  before?: string;
}

export interface ExtendInput {
  kind?: Exclude<RoundKind, "legacy">;
  round?: "current" | "new";
  tasks: ExtendTaskInput[];
  title?: string;
}

export interface ExtendResult {
  deferredDocsTaskId: string | null;
  plan: WorkflowPlan;
  roundId: string;
}

export interface CarryoverInput {
  approval: string;
  id: string;
  objective?: string;
}

const ROUND_NUMBER_PATTERN = /^R([0-9]+)$/u;

function nextRoundId(plan: WorkflowPlan): string {
  const numbers = plan.rounds.map((round) =>
    Number(ROUND_NUMBER_PATTERN.exec(round.id)?.[1] ?? 0)
  );
  return `R${Math.max(0, ...numbers) + 1}`;
}

function roundTasks(plan: WorkflowPlan, roundId: string): WorkflowTask[] {
  return plan.tasks.filter((task) => task.roundId === roundId);
}

function docsDone(plan: WorkflowPlan, round: WorkflowRound): boolean {
  return roundTasks(plan, round.id).some(
    (task) => task.kind === "docs" && task.status === "DONE"
  );
}

function needsQuality(
  plan: WorkflowPlan,
  tasks: WorkflowTask[],
  qualityConfigured: boolean
): boolean {
  const pending = plan.tasks.some(
    (task) => task.kind === "quality" && task.status !== "DONE"
  );
  return (
    !(qualityConfigured || pending) &&
    tasks.some(
      (task) => task.kind === "work" && functionalFiles(task).length > 0
    )
  );
}

function startNewRound(
  plan: WorkflowPlan,
  input: ExtendInput,
  tasks: WorkflowTask[],
  context: TransitionContext
): string {
  const last = plan.rounds.at(-1);
  const roundId = nextRoundId(plan);
  let carried: WorkflowTask[] = [];
  if (last && last.status === "OPEN") {
    const pending = roundTasks(plan, last.id).filter(
      (task) => task.status !== "DONE"
    );
    ensure(
      pending.every(
        (task) => task.kind === "delivery" && task.status === "TODO"
      ),
      "ROUND_OPEN",
      `Round ${last.id} still has unfinished work; extend it with round "current".`
    );
    carried = pending.map((task) => ({
      ...task,
      dependencies: task.dependencies.filter(
        (id) => id !== docsTaskId(last.id)
      ),
      roundId,
    }));
    plan.tasks = plan.tasks.filter(
      (task) => !carried.some((item) => item.id === task.id)
    );
    last.status = "CLOSED";
  }
  plan.rounds.push({
    digest: null,
    id: roundId,
    kind: input.kind ?? "fixes",
    status: "OPEN",
    title: input.title ?? "Fixes",
  });
  for (const task of tasks) {
    task.roundId = roundId;
  }
  plan.tasks.push(
    ...arrangeRound(plan, roundId, [...tasks, ...carried], {
      docsFiles: [],
      qualityConfigured: context.qualityConfigured,
    })
  );
  return roundId;
}

function insertBefore(
  list: WorkflowTask[],
  task: WorkflowTask,
  beforeId: string | undefined,
  fallbackId: string
): void {
  const target = beforeId ?? fallbackId;
  const index = list.findIndex((item) => item.id === target);
  ensure(index >= 0, "UNKNOWN_TASK", `Task not found for insertion: ${target}`);
  const anchor = list[index];
  ensure(
    beforeId === undefined || anchor?.status === "TODO",
    "TASK_STARTED",
    `Insert only before a task that has not started: ${target}`
  );
  if (beforeId !== undefined && anchor) {
    anchor.dependencies = [...new Set([...anchor.dependencies, task.id])];
  }
  list.splice(index, 0, task);
}

interface PlacedTask {
  before: string | undefined;
  task: WorkflowTask;
}

function addQualityIfNeeded(
  plan: WorkflowPlan,
  roundId: string,
  placed: PlacedTask[],
  context: TransitionContext
): void {
  const work = placed
    .map((item) => item.task)
    .filter((task) => task.kind !== "delivery");
  if (!needsQuality(plan, work, context.qualityConfigured)) {
    return;
  }
  const quality = buildQualityTask(plan, roundId);
  const firstFunctional = placed.find(
    (item) => item.task.kind === "work" && functionalFiles(item.task).length > 0
  );
  if (firstFunctional) {
    firstFunctional.task.dependencies = [
      ...new Set([quality.id, ...firstFunctional.task.dependencies]),
    ];
    placed.splice(placed.indexOf(firstFunctional), 0, {
      before: firstFunctional.before,
      task: quality,
    });
  }
}

function extendOpenRound(
  plan: WorkflowPlan,
  round: WorkflowRound,
  placed: PlacedTask[],
  context: TransitionContext
): string | null {
  const docs = plan.tasks.find((task) => task.id === docsTaskId(round.id));
  ensure(docs, "DOCS_TASK", `Round ${round.id} has no DOCS task.`);
  let deferred: string | null = null;
  if (docs.status === "IN_PROGRESS") {
    docs.status = "TODO";
    plan.currentTaskId = null;
    deferred = docs.id;
  }
  addQualityIfNeeded(plan, round.id, placed, context);
  for (const { before, task } of placed.filter(
    (item) => item.task.kind !== "delivery"
  )) {
    insertBefore(plan.tasks, task, before, docs.id);
  }
  for (const { task } of placed.filter(
    (item) => item.task.kind === "delivery"
  )) {
    plan.tasks.push({
      ...task,
      dependencies: [...new Set([...task.dependencies, docs.id])],
    });
  }
  const roundWork = roundTasks(plan, round.id).filter(
    (task) => task.kind === "work" || task.kind === "quality"
  );
  docs.dependencies = roundWork.map((task) => task.id);
  docs.files = [
    ...new Set([
      ...docs.files,
      ...roundWork.flatMap((task) => task.files.filter(isDocumentationPath)),
    ]),
  ];
  return deferred;
}

/** Adds tasks to the open round or to a new round; finished records stay untouched. */
export function extendPlan(
  plan: WorkflowPlan,
  input: ExtendInput,
  context: TransitionContext
): ExtendResult {
  ensure(
    plan.scope !== null,
    "NO_SCOPE",
    "There is no active scope to extend."
  );
  checkExtendInput(input);
  const next = nextRevision(plan);
  const ids = new Set(next.tasks.map((task) => task.id));
  const last = next.rounds.at(-1);
  const wantsNew =
    input.round === "new" ||
    !last ||
    last.status === "CLOSED" ||
    docsDone(next, last);
  const targetId = wantsNew ? nextRoundId(next) : (last?.id ?? "R1");
  const placed: PlacedTask[] = input.tasks.map((source, index) => ({
    before: source.before,
    task: normalizeTaskInput(source, targetId, ids, `tasks[${index}]`),
  }));
  let deferred: string | null = null;
  let roundId = targetId;
  if (wantsNew) {
    ensure(
      placed.every((item) => item.before === undefined),
      "PLAN_SCHEMA",
      "`before` applies only to the current round.",
      { field: "tasks[].before" }
    );
    roundId = startNewRound(
      next,
      input,
      placed.map((item) => item.task),
      context
    );
  } else if (last) {
    deferred = extendOpenRound(next, last, placed, context);
  }
  recomputeDelivery(next);
  return { deferredDocsTaskId: deferred, plan: validatePlan(next), roundId };
}

/** Moves an in-progress DOCS task back to TODO (repair action defer-docs). */
export function deferDocs(plan: WorkflowPlan): WorkflowPlan {
  const current = plan.tasks.find((task) => task.id === plan.currentTaskId);
  ensure(
    current?.kind === "docs",
    "NOT_DOCS",
    "The current task is not a DOCS task."
  );
  const next = nextRevision(plan);
  const docs = next.tasks.find((task) => task.id === current.id);
  if (docs) {
    docs.status = "TODO";
  }
  next.currentTaskId = null;
  return validatePlan(next);
}

export function acceptScope(
  plan: WorkflowPlan,
  note: string,
  now: string
): WorkflowPlan {
  ensure(
    plan.scope?.delivery === "READY_FOR_ACCEPTANCE",
    "NOT_READY",
    "Acceptance needs every task DONE (READY_FOR_ACCEPTANCE)."
  );
  ensure(
    typeof note === "string" && note.trim().length >= 3,
    "ACCEPTANCE_NOTE",
    "Record the user's acceptance words in --note."
  );
  const next = nextRevision(plan);
  if (next.scope) {
    next.scope.delivery = "ACCEPTED";
    next.scope.acceptanceNote = { at: now, text: note.trim() };
  }
  return validatePlan(next);
}

export function closeScope(
  plan: WorkflowPlan,
  scopeId: string,
  note: string,
  now: string
): WorkflowPlan {
  ensure(
    plan.scope && plan.scope.id === scopeId,
    "SCOPE_ID",
    "Pass the exact id of the scope to close (--scope)."
  );
  ensure(
    plan.scope.delivery === "ACCEPTED",
    "NOT_ACCEPTED",
    "Only an ACCEPTED scope closes; record acceptance first."
  );
  ensure(
    typeof note === "string" && note.trim().length >= 10,
    "USER_CLOSE_REQUIRED",
    "Closing needs the user's direct command in --note; acceptance alone is not one."
  );
  const closed = emptyPlan(plan.projectId, plan.projectName);
  closed.revision = plan.revision + 1;
  closed.lastClosed = { closedAt: now, scopeId };
  return validatePlan(closed);
}

/** Closes the current scope and opens a new one with every unfinished task. */
export function carryoverScope(
  plan: WorkflowPlan,
  input: CarryoverInput,
  context: TransitionContext
): WorkflowPlan {
  const scope = plan.scope;
  ensure(scope, "NO_SCOPE", "There is no scope to carry over.");
  checkCarryoverInput(input);
  ensure(
    context.baselineCommit,
    "NO_BASELINE",
    "carryover needs the current HEAD."
  );
  const done = new Set(
    plan.tasks.filter((task) => task.status === "DONE").map((task) => task.id)
  );
  const unfinished = plan.tasks.filter(
    (task) => task.status !== "DONE" && task.kind !== "docs"
  );
  ensure(
    unfinished.length > 0,
    "NOTHING_TO_CARRY",
    "Every task is DONE; accept and close the scope instead."
  );
  const next = nextRevision(plan);
  const tasks = unfinished.map((task) => ({
    ...structuredClone(task),
    confirmation: null,
    dependencies: task.dependencies.filter(
      (id) => !done.has(id) && unfinished.some((item) => item.id === id)
    ),
    fixes: unfinished.some((item) => item.id === task.fixes)
      ? task.fixes
      : null,
    roundId: "R1",
    status: "TODO" as const,
  }));
  next.lastClosed = { closedAt: context.now, scopeId: scope.id };
  next.scope = {
    ...structuredClone(scope),
    acceptanceNote: null,
    approval: { at: context.now, text: input.approval.trim() },
    baselineCommit: context.baselineCommit,
    blockedReason: null,
    decisions: [
      {
        at: context.now,
        text: `Carried over unfinished tasks from scope ${scope.id}.`,
      },
    ],
    delivery: "IN_PROGRESS",
    id: input.id,
    objective: input.objective ?? scope.objective,
    status: "ACTIVE",
  };
  next.rounds = [
    {
      digest: null,
      id: "R1",
      kind: "implementation",
      status: "OPEN",
      title: "Carried over",
    },
  ];
  next.tasks = [];
  next.currentTaskId = null;
  next.tasks = arrangeRound(
    next,
    "R1",
    tasks.filter((task) => task.kind !== "quality"),
    {
      docsFiles: scope.spec ? [scope.spec] : [],
      qualityConfigured: context.qualityConfigured,
    }
  );
  return validatePlan(next);
}
