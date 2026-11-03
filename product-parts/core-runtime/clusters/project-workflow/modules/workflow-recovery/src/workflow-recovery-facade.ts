import { assemblePacket, extractHeading } from "./recovery-budget.js";
import type { RecoveryInput, RecoveryPacket } from "./recovery-model.js";

export type {
  PacketSection,
  RecoveryEvent,
  RecoveryInput,
  RecoveryPacket,
  TransactionSummary,
  VerificationSummary,
} from "./recovery-model.js";

/** Public facade of the workflow-recovery module: the bounded recovery packet. */
export class WorkflowRecoveryFacade {
  /** Builds the packet from already gathered state. */
  build(input: RecoveryInput): RecoveryPacket {
    return assemblePacket(input);
  }

  /** Markdown section under a heading, matched by text or slug. */
  section(text: string, heading: string): string | null {
    return extractHeading(text, heading);
  }
}

export const workflowRecoveryFacade = new WorkflowRecoveryFacade();
