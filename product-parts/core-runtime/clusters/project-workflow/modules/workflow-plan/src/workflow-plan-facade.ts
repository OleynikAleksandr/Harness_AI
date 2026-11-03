import path from "node:path";
import { workflowPlatformFacade } from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  isWorkflowPlanDocument,
  parsePlanDocument,
  renderPlanDocument,
} from "./plan-document.js";
import {
  emptyPlan,
  PLAN_PATH,
  type RoundDigest,
  type WorkflowPlan,
  type WorkflowTask,
} from "./plan-model.js";
import {
  acceptScope,
  type CarryoverInput,
  carryoverScope,
  closeScope,
  deferDocs,
  type ExtendInput,
  type ExtendResult,
  extendPlan,
} from "./plan-rounds.js";
import {
  blockScope,
  completeTask,
  createScope,
  findTask,
  nextReadyTask,
  type ScopeInput,
  startTask,
  type TransitionContext,
  unblockScope,
} from "./plan-transitions.js";
import { validateDigest, validatePlan } from "./plan-validation.js";

export type {
  DeliveryStatus,
  DocumentRef,
  RoundDigest,
  RoundKind,
  ScopeStatus,
  TaskKind,
  TaskStatus,
  UserDecision,
  WorkflowPlan,
  WorkflowRound,
  WorkflowScope,
  WorkflowTask,
} from "./plan-model.js";
export {
  docsTaskId,
  functionalFiles,
  isDocumentationPath,
  PLAN_PATH,
  PLAN_SCHEMA,
} from "./plan-model.js";

/**
 * Public boundary of the workflow-plan module: the plan model, its
 * validation, the Markdown document and every state transition.
 */
export class WorkflowPlanFacade {
  createEmpty(projectId: string, projectName: string): WorkflowPlan {
    return emptyPlan(projectId, projectName);
  }

  validate(plan: WorkflowPlan): WorkflowPlan {
    return validatePlan(plan);
  }

  validateDigest(digest: unknown): void {
    validateDigest(digest as never);
  }

  render(plan: WorkflowPlan): string {
    return renderPlanDocument(plan);
  }

  parse(text: string, options?: { projection?: boolean }): WorkflowPlan {
    return parsePlanDocument(text, options);
  }

  isPlanDocument(text: string): boolean {
    return isWorkflowPlanDocument(text);
  }

  planFile(root: string): string {
    return path.join(root, ...PLAN_PATH.split("/"));
  }

  /** Reads the project plan; returns null when the project has no plan file. */
  read(root: string, options?: { projection?: boolean }): WorkflowPlan | null {
    const text = workflowPlatformFacade.readTextIfExists(this.planFile(root));
    return text === null ? null : parsePlanDocument(text, options);
  }

  createScope(
    plan: WorkflowPlan,
    input: ScopeInput,
    context: TransitionContext
  ): WorkflowPlan {
    return createScope(plan, input, context);
  }

  startTask(
    plan: WorkflowPlan,
    taskId: string,
    confirmation: string | null = null
  ): WorkflowPlan {
    return startTask(plan, taskId, confirmation);
  }

  completeTask(
    plan: WorkflowPlan,
    taskId: string,
    digest: RoundDigest | null = null
  ): WorkflowPlan {
    return completeTask(plan, taskId, digest);
  }

  block(plan: WorkflowPlan, reason: string): WorkflowPlan {
    return blockScope(plan, reason);
  }

  unblock(plan: WorkflowPlan): WorkflowPlan {
    return unblockScope(plan);
  }

  extend(
    plan: WorkflowPlan,
    input: ExtendInput,
    context: TransitionContext
  ): ExtendResult {
    return extendPlan(plan, input, context);
  }

  deferDocs(plan: WorkflowPlan): WorkflowPlan {
    return deferDocs(plan);
  }

  accept(plan: WorkflowPlan, note: string, now: string): WorkflowPlan {
    return acceptScope(plan, note, now);
  }

  close(
    plan: WorkflowPlan,
    scopeId: string,
    note: string,
    now: string
  ): WorkflowPlan {
    return closeScope(plan, scopeId, note, now);
  }

  carryover(
    plan: WorkflowPlan,
    input: CarryoverInput,
    context: TransitionContext
  ): WorkflowPlan {
    return carryoverScope(plan, input, context);
  }

  task(plan: WorkflowPlan, taskId: string): WorkflowTask {
    return findTask(plan, taskId);
  }

  /** The current task, or the first TODO task whose dependencies are DONE. */
  nextTask(plan: WorkflowPlan): WorkflowTask | null {
    return nextReadyTask(plan);
  }

  write(root: string, plan: WorkflowPlan): string {
    const text = renderPlanDocument(plan);
    workflowPlatformFacade.writeFileAtomic(this.planFile(root), text);
    return text;
  }
}

export const workflowPlanFacade = new WorkflowPlanFacade();
