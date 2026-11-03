import { emptyPlan, type WorkflowPlan } from "./plan-model.js";
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
}

export const workflowPlanFacade = new WorkflowPlanFacade();
