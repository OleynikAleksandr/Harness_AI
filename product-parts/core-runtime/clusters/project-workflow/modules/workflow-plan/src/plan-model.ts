export const PLAN_SCHEMA = "harness-workflow-plan/1";
export const PLAN_PATH = ".harness/plans/todo-plan.md";

export type ScopeStatus = "ACTIVE" | "BLOCKED";
export type DeliveryStatus =
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "READY_FOR_ACCEPTANCE";
export type TaskStatus = "DONE" | "IN_PROGRESS" | "TODO";
export type TaskKind = "delivery" | "docs" | "quality" | "work";
export type RoundKind = "fixes" | "implementation" | "legacy";
export type RoundStatus = "CLOSED" | "OPEN";
export type ExecutionStrategy = "orchestrated" | "sequential";

export interface DocumentRef {
  heading?: string;
  path: string;
  required: boolean;
}

export interface UserDecision {
  at: string;
  text: string;
}

export interface RoundDigest {
  contracts: string[];
  decisions: string[];
  references: string[];
  result: string;
}

export interface WorkflowRound {
  digest: RoundDigest | null;
  id: string;
  kind: RoundKind;
  status: RoundStatus;
  title: string;
}

export interface WorkflowTask {
  acceptance: string[];
  checks: string[];
  commitMessage: string;
  confirmation: string | null;
  context: DocumentRef[];
  dependencies: string[];
  docsWaiver: string | null;
  files: string[];
  fixes: string | null;
  id: string;
  iteration: number;
  kind: TaskKind;
  /** Absent means false; only `work` tasks may set it. */
  parallelSafe?: boolean;
  roundId: string;
  status: TaskStatus;
  title: string;
  why: string;
}

/** Execution block of a scope; an absent block means `sequential`. */
export interface WorkflowExecution {
  maxWorkers: number;
  ownerSession: string | null;
  strategy: ExecutionStrategy;
}

export interface WorkflowScope {
  acceptance: string[];
  acceptanceNote: UserDecision | null;
  approval: UserDecision;
  baselineCommit: string;
  blockedReason: string | null;
  context: DocumentRef[];
  decisions: UserDecision[];
  delivery: DeliveryStatus;
  execution?: WorkflowExecution;
  id: string;
  objective: string;
  spec: string | null;
  status: ScopeStatus;
}

export interface ClosedScopeRef {
  closedAt: string;
  scopeId: string;
}

export interface WorkflowPlan {
  currentTaskId: string | null;
  lastClosed: ClosedScopeRef | null;
  projectId: string;
  projectName: string;
  revision: number;
  rounds: WorkflowRound[];
  schema: typeof PLAN_SCHEMA;
  scope: WorkflowScope | null;
  tasks: WorkflowTask[];
}

export const DIGEST_RESULT_MAX_BYTES = 600;
export const DIGEST_ITEM_MAX_BYTES = 300;
export const DIGEST_MAX_ITEMS = 8;
const DOCS_TASK_PREFIX = "DOCS-";

const MARKDOWN_PATTERN = /\.(?:md|markdown)$/iu;

export function isDocumentationPath(file: string): boolean {
  return MARKDOWN_PATTERN.test(file);
}

export function functionalFiles(task: Pick<WorkflowTask, "files">): string[] {
  return task.files.filter((file) => !isDocumentationPath(file));
}

export function docsTaskId(roundId: string): string {
  return `${DOCS_TASK_PREFIX}${roundId}`;
}

export function emptyPlan(
  projectId: string,
  projectName: string
): WorkflowPlan {
  return {
    currentTaskId: null,
    lastClosed: null,
    projectId,
    projectName,
    revision: 1,
    rounds: [],
    schema: PLAN_SCHEMA,
    scope: null,
    tasks: [],
  };
}
