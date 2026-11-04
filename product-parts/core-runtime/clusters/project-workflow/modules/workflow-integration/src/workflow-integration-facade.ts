import type { AssignmentRecord } from "../../workflow-assignment/src/workflow-assignment-facade.js";
import {
  type WorkflowGitFacade,
  workflowGitFacade,
} from "../../workflow-git/src/workflow-git-facade.js";
import { type IntegrationProof, proveSource } from "./integration-proof.js";

export type { IntegrationProof, ProvenCheck } from "./integration-proof.js";

/**
 * Public boundary of the workflow-integration module: integration of
 * executor results into main (spec section 7). For now it proves a source.
 */
export class WorkflowIntegrationFacade {
  readonly git: WorkflowGitFacade;

  constructor(git: WorkflowGitFacade = workflowGitFacade) {
    this.git = git;
  }

  /** Proves an executor source of an assignment or throws the first failure. */
  proveSource(
    mainRoot: string,
    assignment: AssignmentRecord,
    sourceSha: string
  ): IntegrationProof {
    return proveSource(this.git, mainRoot, assignment, sourceSha);
  }
}

export const workflowIntegrationFacade = new WorkflowIntegrationFacade();
