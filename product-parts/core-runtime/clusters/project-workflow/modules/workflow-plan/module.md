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
  - a round has a digest exactly when its `DOCS` task is `DONE`, or when it
    is `CLOSED`;
  - a valid digest has `result` up to 600 bytes and each list up to 8 items
    of up to 300 bytes.
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

## Plan Document (`plan-document.ts`)

- `render(plan)` writes the document that lives at `PLAN_PATH`
  (`.harness/plans/todo-plan.md`). It consists of:
  - a title;
  - the JSON state between `<!-- harness-workflow:begin -->` and
    `<!-- harness-workflow:end -->` in one fenced `json` block;
  - a readable projection: state, objective, acceptance, and rounds with
    their tasks and digests.
- `parse(text, {projection})` checks the markers (`PLAN_MARKERS`) and the
  JSON (`PLAN_JSON`), then validates the plan. With `projection` (the
  default) the whole text must equal `render(plan)`. A manual edit fails
  with `PLAN_PROJECTION`, and `repair` rebuilds the text. CRLF line endings
  are accepted.
- `isPlanDocument(text)` distinguishes Workflow Kit plans from legacy plans.
- `read(root)` returns `null` when there is no plan file. `write(root,
  plan)` writes atomically through the platform facade.

## Transitions (`plan-transitions.ts`, `plan-service-tasks.ts`)

Every transition copies the plan, increments `revision` and validates the
result. The caller supplies time, the baseline commit and the
quality-profile state.

- **`createScope(plan, input, {baselineCommit, now, qualityConfigured})`**
  - Fails if:
    - a scope is still open (`SCOPE_EXISTS`);
    - there is no baseline commit (`NO_BASELINE`);
    - the approval is shorter than 10 characters (`SCOPE_APPROVAL`);
    - there are several tasks and no `spec` (`SPEC_REQUIRED`).
  - Normalizes input tasks. Ids default to `T001`, `T002` and so on; the
    input `kind` may only be `work` or `delivery`.
  - Arranges round `R1`:
    1. `QUALITY` goes before the first `work` task with functional files,
       unless the quality profile is configured or a pending `QUALITY` task
       exists. That task gets a dependency on it.
    2. Ordinary tasks.
    3. `DOCS-R1`. Its files are `README.md`, `docs/architecture/OVERVIEW.md`,
       the spec and every Markdown file of the round. It depends on all
       non-delivery tasks of the round.
    4. Delivery tasks, which depend on `DOCS-R1`.
- **`startTask(plan, id, confirmation)`**
  - Repeating the call for the current task changes nothing.
  - Fails if:
    - the scope is not `ACTIVE` (`SCOPE_NOT_ACTIVE`);
    - another task is in progress (`TASK_ALREADY_ACTIVE`);
    - the task is not `TODO` (`TASK_NOT_TODO`);
    - dependencies are unfinished (`DEPENDENCY_PENDING`);
    - a delivery task has no user confirmation (`DELIVERY_CONFIRMATION`).
- **`completeTask(plan, id, digest)`**
  - Works only on the current task (`TASK_NOT_ACTIVE`).
  - A `DOCS` task needs a valid digest and stores it on its round.
  - A round becomes `CLOSED` when all its tasks are `DONE` and the digest
    exists.
  - When every task is `DONE`, `delivery` becomes `READY_FOR_ACCEPTANCE`.
- **`block(plan, reason)` and `unblock(plan)`** switch the scope between
  `ACTIVE` and `BLOCKED`.
- **`nextTask(plan)`** returns the current task, or the first `TODO` task
  whose dependencies are `DONE`. **`task(plan, id)`** throws
  `UNKNOWN_TASK`.

## Rounds Lifecycle (`plan-rounds.ts`)

- **`extend(plan, {round, kind, title, tasks}, context)`** returns `{plan,
  roundId, deferredDocsTaskId}`. Tasks that are already `DONE` never
  change. The result depends on the state of the last round:
  - **The last round is open and its `DOCS` is not done** (the default, or
    `round: "current"`):
    - new work goes before its `DOCS`, or before a not-yet-started task
      named in `before`, which then depends on the new task (`TASK_STARTED`
      otherwise);
    - delivery tasks are appended after `DOCS`;
    - `DOCS` is recomputed;
    - a `DOCS` that is in progress returns to `TODO`, and its id is
      reported so the caller can hand its uncommitted documents over.
  - **The last round is closed or its `DOCS` is done** (or `round: "new"`):
    - a new round `R<n>` opens, of kind `fixes` unless another kind is
      given;
    - unfinished delivery tasks of the old round move into the new round
      after its `DOCS`, and the old round closes;
    - if the old round still has unfinished work, the call fails with
      `ROUND_OPEN`.
  - **In both cases:**
    - a `QUALITY` task is added if needed;
    - a `READY_FOR_ACCEPTANCE` or `ACCEPTED` scope returns to `IN_PROGRESS`
      and loses its acceptance note;
    - a fix task links its original task through `fixes`.
- **`deferDocs(plan)`** returns the current `DOCS` task to `TODO`. It is the
  `defer-docs` repair action.
- **`accept(plan, note, now)`** works only from `READY_FOR_ACCEPTANCE`
  (`NOT_READY`), needs a note (`ACCEPTANCE_NOTE`) and leaves the scope open.
- **`close(plan, scopeId, note, now)`** checks:
  - the scope id matches (`SCOPE_ID`);
  - the scope is `ACCEPTED` (`NOT_ACCEPTED`);
  - the note holds the user's direct command, at least 10 characters
    (`USER_CLOSE_REQUIRED`).

  It returns an empty plan with `lastClosed` set and the revision
  incremented.
- **`carryover(plan, {id, approval, objective?}, context)`** closes the
  current scope and opens a new one:
  - every unfinished non-`DOCS` task moves into round `R1` and is reset to
    `TODO`;
  - dependencies and `fixes` links that point to finished or dropped tasks
    are removed;
  - `QUALITY` and `DOCS` are rebuilt.

## Owned Paths

- `module.md`
- `src/**`
