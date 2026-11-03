# Workflow Plan Module

## Responsibility

Owns the Workflow Kit plan:
- the model: scope, rounds, tasks, user decisions and round digests;
- full structural validation;
- the Markdown plan document;
- every state transition of the process described in
  `docs/architecture/workflow-kit/WorkflowKitProcess.md`.

## Public Facade

`WorkflowPlanFacade` (class, singleton `workflowPlanFacade`).

## Model (`plan-model.ts`)

- `WorkflowPlan` has these fields:
  - `schema`: `harness-workflow-plan/1`;
  - `revision`: positive integer, incremented by every transition;
  - `projectId`, `projectName`;
  - `scope`: `null` when the status is `NONE`;
  - `rounds`, `tasks`, `currentTaskId`;
  - `lastClosed`: reference to the previously closed scope.
- `WorkflowScope` has these fields:
  - `id`, `objective`, `acceptance`;
  - `approval` and `decisions`: user decisions with timestamps;
  - `spec`, `context`: document references;
  - `baselineCommit`: full SHA;
  - `status`: `ACTIVE` or `BLOCKED`, with `blockedReason`;
  - `delivery`: `IN_PROGRESS`, `READY_FOR_ACCEPTANCE` or `ACCEPTED`, with
    `acceptanceNote`.
- `WorkflowRound` has `id` (`R1`, `R2`, `R0-legacy`), `kind`
  (`implementation`, `fixes`, `legacy`), `status` (`OPEN`, `CLOSED`) and
  `digest`.
- `WorkflowTask` has these fields:
  - `id`, `roundId`, `kind` (`work`, `quality`, `docs`, `delivery`),
    `status` (`TODO`, `IN_PROGRESS`, `DONE`), `iteration`;
  - `files`: canonical relative paths; Markdown files count as
    documentation;
  - `dependencies`, `acceptance`, `checks`, `context`;
  - `commitMessage`, `fixes`, `docsWaiver`;
  - `confirmation`: user confirmation of a delivery task.

## Validation Rules (`validatePlan`)

Errors are `WorkflowError` codes: `PLAN_SCHEMA`, `TASK_ORDER`, `DOCS_TASK`,
`DELIVERY_ORDER`, `ROUND_DIGEST_REQUIRED`, `ROUND_DIGEST_TOO_LARGE`,
`UNSAFE_PATH`.

- **Without a scope:** there are no rounds, no tasks and no current task.
- **Scope:**
  - identifiers are ASCII (`[A-Za-z0-9][A-Za-z0-9._-]*`);
  - the baseline is a full SHA;
  - a `BLOCKED` scope has a reason and an `ACTIVE` one has none;
  - `acceptanceNote` is present exactly when `ACCEPTED`.
- **Rounds:**
  - at least one;
  - unique ids;
  - only the last round may be `OPEN`;
  - every `CLOSED` round has a valid digest: `result` up to 600 bytes,
    each list up to 8 items of up to 300 bytes.
- **Tasks:**
  - unique ids;
  - one-line commit message and non-empty acceptance criteria;
  - canonical paths;
  - dependencies point only backwards;
  - `fixes` points to an earlier task;
  - tasks of a closed round are `DONE`;
  - only delivery tasks carry `confirmation`.
- **Service tasks:**
  - a non-legacy round has at most one `DOCS-<round>` task;
  - it holds only documentation files and depends on every `work` and
    `quality` task of its round;
  - only delivery tasks follow it, and they depend on it.
- **Progress:**
  - at most one `IN_PROGRESS` task, which equals `currentTaskId`;
  - `delivery` is `IN_PROGRESS` exactly while some task is not `DONE`.

## Owned Paths

- `module.md`
- `src/**`
