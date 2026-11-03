import path from "node:path";
import { workflowPlatformFacade } from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  isWorkflowPlanDocument,
  parsePlanDocument,
  renderPlanDocument,
} from "./plan-document.js";
import { emptyPlan, PLAN_PATH, type WorkflowPlan } from "./plan-model.js";
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

  write(root: string, plan: WorkflowPlan): string {
    const text = renderPlanDocument(plan);
    workflowPlatformFacade.writeFileAtomic(this.planFile(root), text);
    return text;
  }
}

export const workflowPlanFacade = new WorkflowPlanFacade();
