import {
  type WorkflowGitFacade,
  workflowGitFacade,
} from "../../workflow-git/src/workflow-git-facade.js";
import { workflowPlanFacade } from "../../workflow-plan/src/workflow-plan-facade.js";
import { assemblePacket, extractHeading } from "./recovery-budget.js";
import {
  type HistoryEntry,
  type HookClient,
  historyText,
  hookEvent,
  sessionStartResponse,
  showTaskText,
  workflowHistory,
} from "./recovery-commands.js";
import { type GatherNotes, gatherRecovery } from "./recovery-gather.js";
import type {
  RecoveryEvent,
  RecoveryInput,
  RecoveryPacket,
} from "./recovery-model.js";

export type { HistoryEntry, HookClient } from "./recovery-commands.js";
export { HOST_RECOVERY_VARIABLE } from "./recovery-commands.js";
export type {
  PacketSection,
  RecoveryEvent,
  RecoveryInput,
  RecoveryPacket,
  TransactionSummary,
  VerificationSummary,
} from "./recovery-model.js";

/**
 * Public facade of the workflow-recovery module: the bounded recovery
 * packet, the session-start hook and on-demand task history.
 */
export class WorkflowRecoveryFacade {
  readonly git: WorkflowGitFacade;

  constructor(git: WorkflowGitFacade = workflowGitFacade) {
    this.git = git;
  }

  /** Builds the packet from already gathered state. */
  build(input: RecoveryInput): RecoveryPacket {
    return assemblePacket(input);
  }

  /** Markdown section under a heading, matched by text or slug. */
  section(text: string, heading: string): string | null {
    return extractHeading(text, heading);
  }

  /** Reads plan, configuration, git state and evidence of a project. */
  gather(root: string, event: RecoveryEvent = "startup"): RecoveryInput {
    const notes: GatherNotes = { warnings: [] };
    const input = gatherRecovery(this.git, root, event, notes);
    return { ...input, warnings: notes.warnings };
  }

  packet(root: string, event: RecoveryEvent = "startup"): RecoveryPacket {
    return assemblePacket(this.gather(root, event));
  }

  /** `recover --format text|json`. */
  render(packet: RecoveryPacket, format: "json" | "text" = "text"): string {
    return format === "json"
      ? `${JSON.stringify(packet, null, 2)}\n`
      : packet.text;
  }

  /**
   * `hook session-start --client claude|codex`: reads the hook input and
   * answers in the SessionStart format. Errors never block the session.
   */
  sessionStart(
    root: string,
    options: { client: HookClient; env?: NodeJS.ProcessEnv; stdin: string }
  ): string {
    const event = hookEvent(options.stdin);
    return sessionStartResponse(() => {
      try {
        return this.packet(root, event).text;
      } catch (error) {
        const { code, message } = error as { code?: string; message: string };
        return `Workflow Kit could not build the recovery packet (${code ?? "error"}): ${message}\nRun \`scripts/workflow doctor\`.`;
      }
    }, options.env ?? process.env);
  }

  /** `show-task <ID>`: the full task text with its commit when done. */
  showTask(root: string, taskId: string): string {
    const input = this.gather(root);
    return showTaskText(input.plan, taskId, input.taskCommits);
  }

  /** `history [--task ID] [--round R]`: workflow commits from git. */
  history(
    root: string,
    filter: { round?: string; task?: string } = {}
  ): { entries: HistoryEntry[]; text: string } {
    const plan =
      workflowPlanFacade.read(root) ??
      workflowPlanFacade.createEmpty("unknown", "Project");
    const entries = workflowHistory(this.git, root, plan, filter);
    return { entries, text: historyText(entries) };
  }
}

export const workflowRecoveryFacade = new WorkflowRecoveryFacade();
