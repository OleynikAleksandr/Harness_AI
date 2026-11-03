# Workflow Kit Module

## Responsibility

The cluster facade of `core-runtime/clusters/project-workflow`: every
process operation of the Workflow Kit on one project root. It composes the
facades of the plan, git, quality and recovery modules and keeps the rule
"each status changes through a Kit command; each finished task is one Kit
commit".

It also handles the managed git hooks. The command-line dispatcher and the
bundle entry are added to this module by later tasks of the active plan.

## Public Facade

`WorkflowKitFacade` (class, singleton `workflowKitFacade`). The constructor
takes `{git?, env?, now?}`; tests pass a git facade with a clean git
environment and a deterministic clock. `recovery` exposes the recovery
facade bound to the same git facade.

## Operations

Every mutating operation runs under the project lock
`.harness/workflow/local/kit.lock` and refuses to start while a commit
transaction is unfinished (`TRANSACTION_PENDING`). A project without a plan
file fails with `NOT_INSTALLED`.

State (`kit-status.ts`):
- `status(root)` — project, scope (status, result, blocked reason,
  objective), revision, current and next task, progress, rounds, quality
  (status, stacks, drift), HEAD, pending transaction, changes outside
  Kit-managed paths, `installed`.
- `autopilotStatus(root)` — the status shape of the autopilot decision.
- `validate(root)` — `{ok, errors[]}`: plan document and projection,
  configuration, and the task-to-commit mapping of `workflow-git`.
- `recover(root, event)`, `showTask(root, id)`, `history(root, filter)`,
  `sessionStart(root, client, stdin)` — delegated to `workflow-recovery`.

Scope (`kit-scope.ts`); every change is a Kit commit unless noted:
- `createScope(root, input)` — baseline is HEAD; role `scope-plan`
  (`docs: plan scope <id>`); the commit also takes the specification and
  `context` documents when they are changed.
- `extend(root, input, expectedRevision?)` — role `scope-plan`
  (`docs: extend scope <id> (<round>)`); `REVISION_MISMATCH` when the plan
  moved on.
- `updateTask(root, id, patch, expectedRevision?)` — `task:update`: a `TODO`
  task may change `title`, `why`, `files`, `dependencies`, `acceptance`,
  `checks`, `context`, `commitMessage`, `docsWaiver`; a task in progress
  only `acceptance`, `checks`, `docsWaiver`, `files`; a `DONE` task never
  (`TASK_PATCH`). Role `scope-plan` (`docs: update task <id>`).
- `accept(root, note)` — role `acceptance`; the scope stays open.
- `close(root, scopeId, note)` — only from `ACCEPTED` and on a clean
  working tree outside Kit-managed paths (`DIRTY_TREE`); role `close`.
- `carryover(root, input)` — role `carryover`.
- `block(root, reason)` / `unblock(root)` — write the plan only; the next
  Kit commit records the state.

Tasks (`kit-task.ts`):
- `startTask(root, id, confirmation?)` — assigned checks must exist in the
  profile (`CHECK_UNKNOWN`); the plan module checks scope, status,
  dependencies and delivery confirmation; the git module records the
  snapshot of earlier changes. Returns `{task, preexisting, warnings}`;
  a warning reports more functional files than
  `policy.taskFileSoftLimit`.
- `commitTask(root, id, {files?, digest?})`:
  1. the task must be in progress (`TASK_NOT_ACTIVE`); a QUALITY task is
     completed by `qualityApply` (`USE_QUALITY_APPLY`); a DOCS task needs a
     digest (`ROUND_DIGEST_REQUIRED`);
  2. selects the task files (changed since the start, or `files`);
  3. functional files need a commit-stage command check
     (`NOT_CONFIGURED`);
  4. runs the `prepare` stage on the selected files (`CHECK_FAILED`
     stops before any transaction);
  5. adds the selected files to `task.files`, completes the task and
     commits through the transaction: role `docs` for a DOCS task,
     `implementation` otherwise; commit-stage checks run in the git hook;
  6. stores the prepare report in the commit evidence.
  Returns `{commit, prepare, preexisting, nextTask}`.
- `commitDocs(root, files, message?)` — `docs:commit`: Markdown files only
  (`DOCS_ONLY`), never while a task is in progress (`TASK_IN_PROGRESS`);
  role `docs`.

Quality and repair (`kit-quality.ts`):
- `qualityDetect(root, stacks?)` — the proposal of `workflow-quality`.
- `qualityApply(root, input)` — installs approved tools, writes the
  `CONFIGURED` profile and commits it with role `quality` together with the
  files changed by the installation. A QUALITY task in progress is
  completed by this commit (its changes since the start are included).
- `qualityStatus(root)` — status, stacks, check ids by stage, drift.
- `repair(root, {apply?, cancel?})` — dry run, apply or cancel through
  `workflow-git`.

## Git Hooks (`kit-hooks.ts`)

`gitHook(root, name, args)` returns `{exitCode, code, message}`; the hook
scripts print the message and exit with the code. `GIT_HOOKS` lists the
managed hooks.
- `pre-commit`:
  - requires a prepared Kit transaction whose candidate tree equals the
    index; otherwise `MANAGED_COMMIT_REQUIRED` (a direct `git commit`);
  - runs the `commit` stage on the selected files: role `implementation`
    runs the required and assigned checks, every other role (service
    commits, DOCS, QUALITY) only the documentation builtins; the task's
    `docsWaiver` comes from the candidate plan;
  - stores the report as pending evidence of the transaction;
  - `CHECK_MODIFIED_CANDIDATE` when a check changed the index tree or a
    selected file; `CHECK_FAILED` with the failed checks and their output
    tail otherwise. The transaction then rolls back the plan and index and
    keeps the edits (`COMMIT_FAILED`, retryable).
- `commit-msg` — the message must carry the `Workflow-Transaction` trailer
  of the pending journal (`MANAGED_COMMIT_REQUIRED`).
- `post-commit` — nothing to do; the transaction confirms the commit.
- `pre-push`:
  - `TRANSACTION_PENDING` while a journal exists;
  - `DOCS_PENDING` while the DOCS task of the last round with a finished
    task is not done;
  - runs the required `push` checks (`CHECK_FAILED`).
- Any other name fails with `UNKNOWN_HOOK`; unexpected errors are reported
  with their code instead of a stack trace.

## Dependencies

`workflow-platform`, `workflow-plan`, `workflow-git`, `workflow-quality`,
`workflow-recovery`, `workflow-autopilot` (types). Node built-ins only.

## Tests

- `src/workflow-kit-lifecycle.test.mjs` — a whole scope on a temporary
  repository: `docs:commit` without a scope, scope creation with its
  specification, QUALITY through `quality:apply`, task snapshots and
  excluded changes, prepare checks and evidence, block/unblock,
  `task:update`, DOCS digests, a fixes round with revision check, history,
  acceptance, close on a clean tree, recovery and repair after closing.
- `src/workflow-kit-hooks.test.mjs` — real git hooks through a runner: a
  direct commit is rejected, service commits run documentation builtins
  only, a failing check rolls back and keeps edits, evidence of the commit
  stage, a check that changes the candidate, DOCS before push, push checks,
  `commit-msg` without a transaction, unknown hooks.
