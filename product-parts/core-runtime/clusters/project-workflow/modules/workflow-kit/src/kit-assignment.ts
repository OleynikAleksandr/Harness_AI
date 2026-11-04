import {
  type AssignmentRecord,
  type AssignmentSchedule,
  type BlockedTask,
  workflowAssignmentFacade,
} from "../../workflow-assignment/src/workflow-assignment-facade.js";
import {
  PLAN_PATH,
  type TaskKind,
  type WorkflowPlan,
  type WorkflowTask,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  ensureNoTransaction,
  type KitContext,
  locked,
  readPlan,
  requireHead,
} from "./kit-context.js";

/** Integration journal of E9; while it exists no assignment is created. */
export const INTEGRATION_FILE = "integration.json";

interface ReadyTask {
  id: string;
  kind: TaskKind;
  parallelSafe: boolean;
  title: string;
}

/** `assignment:next`: what may be handed out now and what is assigned. */
export interface AssignmentNext {
  active: AssignmentRecord[];
  blocked: BlockedTask[];
  idle: AssignmentSchedule["idle"];
  maxWorkers: number;
  orchestrated: boolean;
  ready: ReadyTask[];
  scopeId: string | null;
}

/** `assignment:create`: the record and the executor brief. */
export interface AssignmentCreated {
  assignment: AssignmentRecord;
  brief: string;
  /** false when an identical ASSIGNED record was returned (retry). */
  created: boolean;
}

export function activeRecords(
  plan: WorkflowPlan,
  root: string
): AssignmentRecord[] {
  const scopeId = plan.scope?.id;
  return workflowAssignmentFacade
    .list(root)
    .filter(
      (record) =>
        record.scopeId === scopeId && workflowAssignmentFacade.isActive(record)
    );
}

function readyTask(task: WorkflowTask): ReadyTask {
  return {
    id: task.id,
    kind: task.kind,
    parallelSafe: task.parallelSafe === true,
    title: task.title,
  };
}

export function nextAssignments(context: KitContext): AssignmentNext {
  const plan = readPlan(context);
  const active = activeRecords(plan, context.root);
  const schedule = workflowAssignmentFacade.schedule(plan, active);
  return {
    active,
    blocked: schedule.blocked,
    idle: schedule.idle,
    maxWorkers: schedule.maxWorkers,
    orchestrated: schedule.orchestrated,
    ready: schedule.ready.map((id) =>
      readyTask(workflowPlanFacade.task(plan, id))
    ),
    scopeId: plan.scope?.id ?? null,
  };
}

/** Scope ACTIVE and orchestrated; no transaction, no integration, clean tree. */
function ensureCanAssign(context: KitContext, plan: WorkflowPlan): void {
  ensure(
    plan.scope !== null &&
      workflowPlanFacade.execution(plan).strategy === "orchestrated",
    "NOT_ORCHESTRATED",
    "Assignments exist only in an orchestrated scope.",
    {},
    "In a sequential scope run the tasks yourself: scripts/workflow task:start <ID>."
  );
  ensure(
    plan.scope.status === "ACTIVE",
    "SCOPE_NOT_ACTIVE",
    `The scope is ${plan.scope.status}.`
  );
  // No transaction and no integration journal.
  ensureNoTransaction(context);
  const dirty = context.git
    .changes(context.root)
    .all.filter((file) => !context.git.isKitManagedPath(file));
  ensure(
    dirty.length === 0,
    "DIRTY_TREE",
    "Create assignments on a clean main working tree.",
    { paths: dirty },
    "Commit or remove the changes first."
  );
}

/** Dependencies are DONE (the scheduler) and their commits are in the base. */
function ensureDependenciesInBase(
  context: KitContext,
  plan: WorkflowPlan,
  task: WorkflowTask,
  base: string
): void {
  if (task.dependencies.length === 0) {
    return;
  }
  const references = context.git.resolveReferences(
    context.root,
    plan,
    PLAN_PATH
  );
  const missing = task.dependencies.filter((id) => {
    const reference = references.get(id);
    return !(
      reference?.status === "committed" &&
      context.git.isAncestor(context.root, reference.sha, base)
    );
  });
  ensure(
    missing.length === 0,
    "DEPENDENCY_NOT_IN_BASE",
    `The commits of ${missing.join(", ")} are not ancestors of the base ${base}.`,
    { dependencies: missing }
  );
}

function scheduled(schedule: AssignmentSchedule, task: WorkflowTask): void {
  const reason = schedule.blocked.find((item) => item.taskId === task.id);
  ensure(
    !reason,
    reason?.code ?? "ASSIGNMENT_BARRIER",
    reason?.message ?? "",
    { blockedBy: reason?.blockedBy ?? [] },
    "Run `scripts/workflow assignment:next` for the tasks that can be assigned now."
  );
  ensure(
    schedule.ready.includes(task.id),
    "ASSIGNMENT_BARRIER",
    `${task.id} cannot be assigned now.`
  );
}

/** `assignment:create --task <ID>` in main (spec 5.1). The plan does not change. */
export function createAssignment(
  context: KitContext,
  taskId: string
): AssignmentCreated {
  return locked(context, () => {
    const plan = readPlan(context);
    ensureCanAssign(context, plan);
    const base = requireHead(context);
    const task = workflowPlanFacade.task(plan, taskId);
    ensure(
      task.kind === "work" || task.kind === "docs",
      "ASSIGNMENT_KIND",
      `${task.id} is a ${task.kind} task; the orchestrator runs it in main.`,
      {},
      `Run it yourself: scripts/workflow task:start ${task.id}.`
    );
    ensure(
      task.status === "TODO",
      "TASK_NOT_TODO",
      `${task.id} is ${task.status}.`
    );
    const scopeId = plan.scope?.id ?? "NONE";
    const digest = workflowAssignmentFacade.configDigest(context.root);
    const active = activeRecords(plan, context.root);
    const existing = active.find((record) => record.taskId === task.id);
    if (existing) {
      ensure(
        existing.status === "ASSIGNED" &&
          existing.iteration === task.iteration &&
          existing.baseCommit === base &&
          existing.configDigest === digest,
        "ASSIGNMENT_EXISTS",
        `${task.id} already has the active assignment ${existing.id} (${existing.status}).`,
        { id: existing.id, status: existing.status }
      );
      return {
        assignment: existing,
        brief: workflowAssignmentFacade.brief(plan, task, existing),
        created: false,
      };
    }
    scheduled(workflowAssignmentFacade.schedule(plan, active), task);
    ensureDependenciesInBase(context, plan, task, base);
    const record = workflowAssignmentFacade.create({
      baseCommit: base,
      configDigest: digest,
      iteration: task.iteration,
      now: context.now(),
      scopeId,
      taskId: task.id,
    });
    ensure(
      workflowAssignmentFacade.read(context.root, record.id) === null,
      "ASSIGNMENT_EXISTS",
      `The assignment record ${record.id} already exists.`,
      { id: record.id }
    );
    workflowAssignmentFacade.write(context.root, record);
    return {
      assignment: record,
      brief: workflowAssignmentFacade.brief(plan, task, record),
      created: true,
    };
  });
}

/** `assignment:cleanup`: the records it processed, with their cleanup state. */
export interface AssignmentCleanupResult {
  assignments: AssignmentRecord[];
}

/**
 * `assignment:cleanup [--id]` in main (spec 7): removes the worktree and
 * merged branch of one INTEGRATED record, or of every INTEGRATED record whose
 * cleanup is not DONE. A refusal is recorded as PENDING, not an error.
 */
export function cleanupAssignments(
  context: KitContext,
  id?: string
): AssignmentCleanupResult {
  return locked(context, () => {
    let records: AssignmentRecord[];
    if (id === undefined) {
      records = workflowAssignmentFacade
        .list(context.root)
        .filter(
          (record) =>
            record.status === "INTEGRATED" && record.cleanup?.status !== "DONE"
        );
    } else {
      const record = workflowAssignmentFacade.read(context.root, id);
      ensure(
        record,
        "ASSIGNMENT_UNKNOWN",
        `The main checkout has no assignment ${id}.`
      );
      records = [record];
    }
    return {
      assignments: records.map((record) =>
        workflowAssignmentFacade.cleanup(
          context.git,
          context.root,
          record,
          context.now()
        )
      ),
    };
  });
}
