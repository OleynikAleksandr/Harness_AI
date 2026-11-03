export type StopReason =
  | "blocked"
  | "delivery-confirmation"
  | "disabled"
  | "limit"
  | "no-progress"
  | "no-scope"
  | "ready-for-acceptance"
  | "transaction-pending"
  | "turn-error"
  | "user-message";

export const DEFAULT_MAX_CONTINUES = 40;
const KIT_COMMAND = "scripts/workflow";

/** Per-session autopilot state kept by the host. */
export interface AutopilotState {
  continues: number;
  enabled: boolean;
  maxContinues: number;
}

/** The project status after the turn, as reported by the Workflow Kit. */
export interface AutopilotProjectStatus {
  blockedReason: string | null;
  delivery: "ACCEPTED" | "IN_PROGRESS" | "READY_FOR_ACCEPTANCE" | null;
  head: string | null;
  nextTask: {
    id: string;
    kind: string;
    status: "DONE" | "IN_PROGRESS" | "TODO";
    title: string;
  } | null;
  revision: number;
  scope: "ACTIVE" | "BLOCKED" | "NONE";
  /** An unfinished commit transaction or a failed commit check. */
  transactionPending: boolean;
}

export interface AutopilotTurn {
  /** Plan revision and HEAD when the turn started. */
  before: { head: string | null; revision: number };
  outcome: "cancelled" | "completed" | "error";
  /** The user queued or sent a message of their own. */
  userMessage: boolean;
}

export type AutopilotDecision =
  | { action: "continue"; taskId: string; text: string }
  | { action: "stop"; detail: string; reason: StopReason };

const stop = (reason: StopReason, detail: string): AutopilotDecision => ({
  action: "stop",
  detail,
  reason,
});

function continueText(
  task: NonNullable<AutopilotProjectStatus["nextTask"]>
): string {
  if (task.status === "IN_PROGRESS") {
    return `Continue the workflow: task ${task.id} is in progress; implement it and commit with \`${KIT_COMMAND} commit --task ${task.id}\`.`;
  }
  return `Continue the workflow: run \`${KIT_COMMAND} task:start ${task.id}\` if it is not started, then implement it and commit.`;
}

/**
 * Decides whether the host sends the next turn. Pure: the same inputs give
 * the same decision. Checks run from the most to the least specific reason.
 */
export function decideAutopilot(
  state: AutopilotState,
  status: AutopilotProjectStatus,
  turn: AutopilotTurn
): AutopilotDecision {
  if (!state.enabled) {
    return stop("disabled", "Autopilot is off for this session.");
  }
  if (turn.outcome !== "completed") {
    return stop(
      "turn-error",
      turn.outcome === "cancelled"
        ? "The turn was cancelled."
        : "The turn ended with a provider error."
    );
  }
  if (turn.userMessage) {
    return stop(
      "user-message",
      "The user wrote a message; the autopilot yields the turn."
    );
  }
  if (status.scope === "NONE") {
    return stop("no-scope", "There is no active scope.");
  }
  if (status.scope === "BLOCKED") {
    return stop("blocked", status.blockedReason ?? "The scope is blocked.");
  }
  if (status.transactionPending) {
    return stop(
      "transaction-pending",
      `A commit transaction or check failed; run \`${KIT_COMMAND} repair\` or fix the check.`
    );
  }
  if (
    status.delivery === "READY_FOR_ACCEPTANCE" ||
    status.delivery === "ACCEPTED"
  ) {
    return stop(
      "ready-for-acceptance",
      status.delivery === "ACCEPTED"
        ? "The result is accepted; the user decides when to close the scope."
        : "All tasks are done; the user accepts the result."
    );
  }
  const task = status.nextTask;
  if (!task) {
    return stop("blocked", "No task is ready to start.");
  }
  if (task.kind === "delivery" && task.status === "TODO") {
    return stop(
      "delivery-confirmation",
      `Task ${task.id} is a delivery task and needs the user's confirmation.`
    );
  }
  if (
    status.revision === turn.before.revision &&
    status.head === turn.before.head
  ) {
    return stop("no-progress", "The turn changed neither the plan nor HEAD.");
  }
  if (state.continues >= state.maxContinues) {
    return stop(
      "limit",
      `The limit of ${state.maxContinues} consecutive continues is reached.`
    );
  }
  return { action: "continue", taskId: task.id, text: continueText(task) };
}

/** State after a decision: a continue counts, a user message resets. */
export function nextAutopilotState(
  state: AutopilotState,
  decision: AutopilotDecision
): AutopilotState {
  if (decision.action === "continue") {
    return { ...state, continues: state.continues + 1 };
  }
  return decision.reason === "user-message"
    ? { ...state, continues: 0 }
    : state;
}

/** The user message the host sends: the instruction plus a fresh packet. */
export function autopilotMessage(
  decision: Extract<AutopilotDecision, { action: "continue" }>,
  packet: string | null
): string {
  return packet
    ? `${decision.text}\n\n<workflow-recovery>\n${packet.trimEnd()}\n</workflow-recovery>\n`
    : `${decision.text}\n`;
}
