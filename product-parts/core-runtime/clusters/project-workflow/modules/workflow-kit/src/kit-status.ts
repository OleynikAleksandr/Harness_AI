import type { AutopilotProjectStatus } from "../../workflow-autopilot/src/workflow-autopilot-facade.js";
import {
  PLAN_PATH,
  type WorkflowTask,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  type DriftReport,
  workflowQualityFacade,
} from "../../workflow-quality/src/workflow-quality-facade.js";
import type { TransactionSummary } from "../../workflow-recovery/src/workflow-recovery-facade.js";
import type { KitContext } from "./kit-context.js";

export interface TaskBrief {
  id: string;
  kind: WorkflowTask["kind"];
  roundId: string;
  status: WorkflowTask["status"];
  title: string;
}

export interface KitStatus {
  changes: string[];
  currentTask: TaskBrief | null;
  head: string | null;
  installed: boolean;
  nextTask: TaskBrief | null;
  progress: { done: number; total: number };
  project: { id: string; name: string } | null;
  quality: { drift: DriftReport; stacks: string[]; status: string };
  revision: number;
  rounds: { id: string; kind: string; status: string }[];
  scope: {
    blockedReason: string | null;
    delivery: string;
    id: string;
    objective: string;
    status: string;
  } | null;
  transaction: TransactionSummary | null;
}

export interface ValidationReport {
  errors: { code: string; message: string }[];
  ok: boolean;
}

function brief(task: WorkflowTask | null | undefined): TaskBrief | null {
  return task
    ? {
        id: task.id,
        kind: task.kind,
        roundId: task.roundId,
        status: task.status,
        title: task.title,
      }
    : null;
}

function transactionOf(context: KitContext): TransactionSummary | null {
  const journal = context.git.transactions.journal(context.root);
  return journal
    ? {
        error: journal.error,
        id: journal.id,
        phase: journal.phase,
        role: journal.role,
        taskId: journal.taskId,
      }
    : null;
}

/** Project status for the CLI, Core and the interface. */
export function readStatus(context: KitContext): KitStatus {
  const plan = workflowPlanFacade.read(context.root);
  const config = workflowQualityFacade.readConfig(context.root);
  const repository = context.git.isRepository(context.root);
  const changes = repository
    ? context.git
        .changes(context.root)
        .all.filter((file) => !context.git.isKitManagedPath(file))
    : [];
  const tasks = plan?.tasks ?? [];
  return {
    changes,
    currentTask: brief(tasks.find((task) => task.id === plan?.currentTaskId)),
    head: repository ? context.git.head(context.root) : null,
    installed: plan !== null,
    nextTask: plan ? brief(workflowPlanFacade.nextTask(plan)) : null,
    progress: {
      done: tasks.filter((task) => task.status === "DONE").length,
      total: tasks.length,
    },
    project: plan ? { id: plan.projectId, name: plan.projectName } : null,
    quality: {
      drift: workflowQualityFacade.drift(context.root, config),
      stacks: config.quality.stacks,
      status: config.quality.status,
    },
    revision: plan?.revision ?? 0,
    rounds: (plan?.rounds ?? []).map(({ id, kind, status }) => ({
      id,
      kind,
      status,
    })),
    scope: plan?.scope
      ? {
          blockedReason: plan.scope.blockedReason,
          delivery: plan.scope.delivery,
          id: plan.scope.id,
          objective: plan.scope.objective,
          status: plan.scope.status,
        }
      : null,
    transaction: repository ? transactionOf(context) : null,
  };
}

/** The status shape the autopilot decision reads. */
export function autopilotStatus(context: KitContext): AutopilotProjectStatus {
  const status = readStatus(context);
  return {
    blockedReason: status.scope?.blockedReason ?? null,
    delivery: (status.scope?.delivery ??
      null) as AutopilotProjectStatus["delivery"],
    head: status.head,
    nextTask: status.nextTask,
    revision: status.revision,
    scope: (status.scope?.status ?? "NONE") as AutopilotProjectStatus["scope"],
    transactionPending: status.transaction !== null,
  };
}

function collect(
  errors: ValidationReport["errors"],
  action: () => void
): boolean {
  try {
    action();
    return true;
  } catch (error) {
    const { code, message } = error as { code?: string; message: string };
    errors.push({ code: code ?? "ERROR", message });
    return false;
  }
}

/** `validate`: plan document, plan rules and the task-to-commit mapping. */
export function validateProject(context: KitContext): ValidationReport {
  const errors: ValidationReport["errors"] = [];
  let plan = null as ReturnType<typeof workflowPlanFacade.read>;
  collect(errors, () => {
    plan = workflowPlanFacade.read(context.root);
  });
  collect(errors, () => workflowQualityFacade.readConfig(context.root));
  if (plan) {
    const current = plan;
    collect(errors, () =>
      context.git.resolveReferences(context.root, current, PLAN_PATH)
    );
  } else if (errors.length === 0) {
    errors.push({
      code: "NOT_INSTALLED",
      message: `${PLAN_PATH} does not exist.`,
    });
  }
  return { errors, ok: errors.length === 0 };
}
