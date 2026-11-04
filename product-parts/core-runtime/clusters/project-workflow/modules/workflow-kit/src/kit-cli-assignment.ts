import { type ParsedArgs, requiredFlag } from "./kit-cli-args.js";
import type {
  AssignmentCreated,
  AssignmentNext,
  WorkflowKitFacade,
} from "./workflow-kit-facade.js";

interface AssignmentCommandContext {
  args: ParsedArgs;
  kit: WorkflowKitFacade;
  root: string;
}

interface AssignmentCommandSpec {
  run: (context: AssignmentCommandContext) => unknown;
  text: (result: unknown) => string;
  usage: string;
}

function nextText(value: unknown): string {
  const result = value as AssignmentNext;
  if (result.idle !== null) {
    const why =
      result.idle === "NOT_ORCHESTRATED"
        ? "the scope is not orchestrated"
        : "the scope is not active";
    return `assignments: none (${result.idle}): ${why}.\n`;
  }
  const lines = [
    `assignments: scope ${result.scopeId ?? "NONE"}, ${result.active.length} of ${result.maxWorkers} workers active`,
  ];
  for (const record of result.active) {
    lines.push(`active: ${record.taskId} ${record.id} ${record.status}`);
  }
  for (const task of result.ready) {
    lines.push(
      `ready: ${task.id} — ${task.title} (${task.parallelSafe ? "parallel" : "sequential"})`
    );
  }
  for (const item of result.blocked) {
    lines.push(
      `blocked: ${item.taskId} ${item.code} (waits for ${item.blockedBy.join(", ") || "none"})`
    );
  }
  const first = result.ready[0];
  lines.push(
    first
      ? `next: scripts/workflow assignment:create --task ${first.id}`
      : "next: nothing to assign now; wait for the active assignments."
  );
  return `${lines.join("\n")}\n`;
}

function createText(value: unknown): string {
  const result = value as AssignmentCreated;
  const record = result.assignment;
  return [
    `assignment: ${record.id} for ${record.taskId}, base ${record.baseCommit.slice(0, 12)}, ${result.created ? "created" : "already assigned"}`,
    "next: start a Claude subagent with isolation worktree and give it this brief:",
    "",
    result.brief,
  ].join("\n");
}

/** `assignment:next` and `assignment:create`: orchestrated assignments (spec 5.1). */
export const ASSIGNMENT_COMMANDS: Readonly<
  Record<string, AssignmentCommandSpec>
> = {
  "assignment:create": {
    run: ({ args, kit, root }) =>
      kit.createAssignment(root, requiredFlag(args, "task")),
    text: createText,
    usage: "assignment:create --task <ID>",
  },
  "assignment:next": {
    run: ({ kit, root }) => kit.nextAssignments(root),
    text: nextText,
    usage: "assignment:next",
  },
};
