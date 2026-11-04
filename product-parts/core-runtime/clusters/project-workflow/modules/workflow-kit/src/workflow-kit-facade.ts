import type { AutopilotProjectStatus } from "../../workflow-autopilot/src/workflow-autopilot-facade.js";
import {
  type ExecutionModeOption,
  type ScopeProposal,
  workflowExecutionModeFacade,
} from "../../workflow-execution-mode/src/workflow-execution-mode-facade.js";
import {
  type CommitResult,
  type RepairOutcome,
  type RepairPlan,
  type WorkflowGitFacade,
  workflowGitFacade,
} from "../../workflow-git/src/workflow-git-facade.js";
import {
  type DoctorOptions,
  type DoctorReport,
  type InspectResult,
  type InstallOptions,
  type InstallOutcome,
  type MigrateOptions,
  type MigrateOutcome,
  WorkflowInstallerFacade,
} from "../../workflow-installer/src/workflow-installer-facade.js";
import type {
  ExecutionStrategy,
  RoundDigest,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import type {
  ProfileInput,
  QualityProposal,
} from "../../workflow-quality/src/workflow-quality-facade.js";
import {
  type HistoryEntry,
  type HookClient,
  type RecoveryEvent,
  type RecoveryPacket,
  WorkflowRecoveryFacade,
} from "../../workflow-recovery/src/workflow-recovery-facade.js";
import type { KitContext } from "./kit-context.js";
import { type HookResult, runGitHook } from "./kit-hooks.js";
import {
  applyQuality,
  detectQuality,
  type QualityApplied,
  qualityStatus,
  repair,
} from "./kit-quality.js";
import {
  acceptScope,
  type CarryoverInput,
  carryoverScope,
  chooseScope,
  closeScope,
  createScope,
  type ExtendInput,
  extendScope,
  type PlanChange,
  proposeScope,
  type ScopeChoiceResult,
  type ScopeInput,
  type ScopeProposalResult,
  setBlocked,
  type TaskPatch,
  updateTask,
} from "./kit-scope.js";
import {
  autopilotStatus,
  type KitStatus,
  readStatus,
  type ValidationReport,
  validateProject,
} from "./kit-status.js";
import {
  commitDocs,
  commitTask,
  startTask,
  type TaskCommit,
  type TaskStart,
} from "./kit-task.js";

export type {
  ExecutionModeOption,
  ScopeProposal,
} from "../../workflow-execution-mode/src/workflow-execution-mode-facade.js";
export type { GitHookName, HookResult } from "./kit-hooks.js";
export { GIT_HOOKS } from "./kit-hooks.js";
export type { QualityApplied } from "./kit-quality.js";
export type {
  CarryoverInput,
  ExtendInput,
  PlanChange,
  ScopeChoiceResult,
  ScopeInput,
  ScopeProposalResult,
  TaskPatch,
} from "./kit-scope.js";
export type { KitStatus, TaskBrief, ValidationReport } from "./kit-status.js";
export type { TaskCommit, TaskStart } from "./kit-task.js";

export interface WorkflowKitOptions {
  env?: NodeJS.ProcessEnv;
  git?: WorkflowGitFacade;
  now?: () => string;
}

/**
 * Cluster facade of `core-runtime/clusters/project-workflow`: every process
 * operation of the Workflow Kit on one project root.
 */
export class WorkflowKitFacade {
  readonly env: NodeJS.ProcessEnv;
  readonly git: WorkflowGitFacade;
  readonly installer: WorkflowInstallerFacade;
  readonly recovery: WorkflowRecoveryFacade;
  private readonly now: () => string;

  constructor(options: WorkflowKitOptions = {}) {
    this.env = options.env ?? process.env;
    this.git = options.git ?? workflowGitFacade;
    this.now = options.now ?? (() => new Date().toISOString());
    this.recovery = new WorkflowRecoveryFacade(this.git);
    this.installer = new WorkflowInstallerFacade(this.git);
  }

  private context(root: string): KitContext {
    return { env: this.env, git: this.git, now: this.now, root };
  }

  /** `inspect <path>`: folder state and the action to offer. */
  inspect(folder: string): InspectResult {
    return this.installer.inspect(folder);
  }

  /** `doctor [--fix]`: project health; fixes only fixable findings. */
  doctor(folder: string, options: DoctorOptions = {}): DoctorReport {
    return this.installer.doctor(folder, { env: this.env, ...options });
  }

  /** `migrate:harness-plan`: a legacy Harness plan becomes a Kit plan. */
  migrateHarnessPlan(
    folder: string,
    options: Omit<MigrateOptions, "now">
  ): MigrateOutcome {
    return this.installer.migrateHarnessPlan(folder, {
      ...options,
      now: this.now(),
    });
  }

  /** `install <path> [--update]`. */
  install(folder: string, options: InstallOptions): InstallOutcome {
    return this.installer.install(folder, options);
  }

  status(root: string): KitStatus {
    return readStatus(this.context(root));
  }

  validate(root: string): ValidationReport {
    return validateProject(this.context(root));
  }

  autopilotStatus(root: string): AutopilotProjectStatus {
    return autopilotStatus(this.context(root));
  }

  recover(root: string, event: RecoveryEvent = "startup"): RecoveryPacket {
    return this.recovery.packet(root, event);
  }

  showTask(root: string, taskId: string): string {
    return this.recovery.showTask(root, taskId);
  }

  history(
    root: string,
    filter: { round?: string; task?: string } = {}
  ): { entries: HistoryEntry[]; text: string } {
    return this.recovery.history(root, filter);
  }

  sessionStart(root: string, client: HookClient, stdin: string): string {
    return this.recovery.sessionStart(root, { client, env: this.env, stdin });
  }

  createScope(root: string, input: ScopeInput): PlanChange {
    return createScope(this.context(root), input);
  }

  /** `scope:propose`: validates the plan and stores the proposal of the mode card. */
  proposeScope(
    root: string,
    input: ScopeInput,
    recommended: ExecutionStrategy,
    reason: string
  ): ScopeProposalResult {
    return proposeScope(this.context(root), { input, reason, recommended });
  }

  /** `scope:choose`: the user's answer to the proposal of `generation`. */
  chooseScope(
    root: string,
    choice: {
      generation: number;
      note: string;
      option: ExecutionModeOption;
      session: string;
    }
  ): ScopeChoiceResult {
    return chooseScope(this.context(root), choice);
  }

  /** The stored scope proposal, or `null`. */
  readProposal(root: string): ScopeProposal | null {
    return workflowExecutionModeFacade.readProposal(root);
  }

  extend(
    root: string,
    input: ExtendInput,
    expectedRevision?: number
  ): ReturnType<typeof extendScope> {
    return extendScope(this.context(root), input, expectedRevision);
  }

  updateTask(
    root: string,
    taskId: string,
    patch: TaskPatch,
    expectedRevision?: number
  ): PlanChange {
    return updateTask(this.context(root), taskId, patch, expectedRevision);
  }

  accept(root: string, note: string): PlanChange {
    return acceptScope(this.context(root), note);
  }

  close(root: string, scopeId: string, note: string): PlanChange {
    return closeScope(this.context(root), scopeId, note);
  }

  carryover(root: string, input: CarryoverInput): PlanChange {
    return carryoverScope(this.context(root), input);
  }

  block(root: string, reason: string): PlanChange {
    return setBlocked(this.context(root), reason);
  }

  unblock(root: string): PlanChange {
    return setBlocked(this.context(root), null);
  }

  startTask(
    root: string,
    taskId: string,
    confirmation: string | null = null
  ): TaskStart {
    return startTask(this.context(root), taskId, confirmation);
  }

  commitTask(
    root: string,
    taskId: string,
    options: { digest?: RoundDigest | null; files?: string[] } = {}
  ): TaskCommit {
    return commitTask(this.context(root), taskId, options);
  }

  commitDocs(root: string, files: string[], message?: string): CommitResult {
    return commitDocs(this.context(root), files, message);
  }

  qualityDetect(root: string, stacks?: string[]): QualityProposal {
    return detectQuality(this.context(root), stacks);
  }

  qualityApply(root: string, input: ProfileInput): QualityApplied {
    return applyQuality(this.context(root), input);
  }

  qualityStatus(root: string): ReturnType<typeof qualityStatus> {
    return qualityStatus(this.context(root));
  }

  /** `git-hook <name>`: handlers of the managed git hooks. */
  gitHook(root: string, name: string, args: string[] = []): HookResult {
    return runGitHook(this.context(root), name, args);
  }

  repair(
    root: string,
    options: { apply?: string; cancel?: string } = {}
  ): RepairOutcome | RepairPlan {
    return repair(this.context(root), options);
  }
}

export const workflowKitFacade = new WorkflowKitFacade();
