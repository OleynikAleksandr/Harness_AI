import type {
  WorkflowPlan,
  WorkflowTask,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  type AssignmentRecord,
  assignmentId,
  configDigest,
  isActiveRecord,
  listRecords,
  type NewAssignment,
  newRecord,
  readRecord,
  recordFile,
  writeRecord,
} from "./assignment-records.js";
import {
  type AssignmentSchedule,
  type ScheduledAssignment,
  scheduleAssignments,
} from "./assignment-schedule.js";

export type {
  AssignmentRecord,
  AssignmentStatus,
} from "./assignment-records.js";
export type {
  AssignmentSchedule,
  BlockedTask,
  ScheduleBlockCode,
} from "./assignment-schedule.js";

function bullets(items: readonly string[]): string[] {
  return items.length > 0
    ? items.map((item) => `   - ${item}`)
    : ["   - (none)"];
}

/** The ready text of the executor subagent for one assignment. */
function executorBrief(
  plan: WorkflowPlan,
  task: WorkflowTask,
  record: AssignmentRecord
): string {
  const commit =
    task.kind === "docs"
      ? `scripts/workflow commit --task ${task.id} --digest <file.json> (the round digest: result, decisions, contracts, references)`
      : `scripts/workflow commit --task ${task.id}`;
  const context = task.context.map((ref) =>
    ref.heading ? `${ref.path} (${ref.heading})` : ref.path
  );
  const lines = [
    `You are the executor of task ${task.id} of scope ${record.scopeId}${plan.projectName ? ` (project ${plan.projectName})` : ""}; assignment ${record.id}.`,
    "Your working directory is your own git worktree. Work only there.",
    "",
    `1. FIRST run in your worktree: scripts/workflow assignment:attach ${record.id}`,
    `2. Then run: scripts/workflow task:start ${task.id}`,
    "3. Implement the task within its files and acceptance criteria:",
    `   Title: ${task.title}`,
    ...(task.why ? [`   Why: ${task.why}`] : []),
    "   Files:",
    ...bullets(task.files),
    "   Acceptance:",
    ...bullets(task.acceptance),
    ...(context.length > 0 ? ["   Context:", ...bullets(context)] : []),
    `4. Commit through the Kit: ${commit}`,
    "   If a check fails, fix the cause and repeat the same command.",
    "5. Reply with the SHA of that commit.",
    "",
    "Rules:",
    "- Never touch the main checkout, the plan or other tasks.",
    "- Do not set the git identity (no git config user.name / user.email).",
    "- Do not create nested executors.",
    "",
  ];
  return lines.join("\n");
}

/**
 * Public boundary of the workflow-assignment module: assignment records of
 * the main checkout, the scheduler of orchestrated scopes and the executor
 * brief (sections 5.1, 5.2 and 6 of WorkflowKitExecutionModes.md).
 */
export class WorkflowAssignmentFacade {
  id(scopeId: string, taskId: string, iteration: number): string {
    return assignmentId(scopeId, taskId, iteration);
  }

  recordFile(root: string, id: string): string {
    return recordFile(root, id);
  }

  read(root: string, id: string): AssignmentRecord | null {
    return readRecord(root, id);
  }

  list(root: string): AssignmentRecord[] {
    return listRecords(root);
  }

  write(root: string, record: AssignmentRecord): void {
    writeRecord(root, record);
  }

  create(input: NewAssignment): AssignmentRecord {
    return newRecord(input);
  }

  isActive(record: Pick<AssignmentRecord, "status">): boolean {
    return isActiveRecord(record);
  }

  configDigest(root: string): string | null {
    return configDigest(root);
  }

  schedule(
    plan: WorkflowPlan,
    assignments: readonly ScheduledAssignment[]
  ): AssignmentSchedule {
    return scheduleAssignments(plan, assignments);
  }

  brief(
    plan: WorkflowPlan,
    task: WorkflowTask,
    record: AssignmentRecord
  ): string {
    return executorBrief(plan, task, record);
  }
}

export const workflowAssignmentFacade = new WorkflowAssignmentFacade();
