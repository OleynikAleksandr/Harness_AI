import {
  type AutopilotDecision,
  type AutopilotProjectStatus,
  type AutopilotState,
  type AutopilotTurn,
  autopilotMessage,
  DEFAULT_MAX_CONTINUES,
  decideAutopilot,
  nextAutopilotState,
} from "./autopilot-decision.js";

export type {
  AutopilotDecision,
  AutopilotProjectStatus,
  AutopilotState,
  AutopilotTurn,
  StopReason,
} from "./autopilot-decision.js";

/**
 * Public facade of the workflow-autopilot module: the pure decision whether
 * the host continues the workflow with another turn.
 */
export class WorkflowAutopilotFacade {
  initialState(
    maxContinues = DEFAULT_MAX_CONTINUES,
    enabled = false
  ): AutopilotState {
    return { continues: 0, enabled, maxContinues };
  }

  decide(
    state: AutopilotState,
    status: AutopilotProjectStatus,
    turn: AutopilotTurn
  ): AutopilotDecision {
    return decideAutopilot(state, status, turn);
  }

  advance(state: AutopilotState, decision: AutopilotDecision): AutopilotState {
    return nextAutopilotState(state, decision);
  }

  message(
    decision: Extract<AutopilotDecision, { action: "continue" }>,
    packet: string | null
  ): string {
    return autopilotMessage(decision, packet);
  }
}

export const workflowAutopilotFacade = new WorkflowAutopilotFacade();
