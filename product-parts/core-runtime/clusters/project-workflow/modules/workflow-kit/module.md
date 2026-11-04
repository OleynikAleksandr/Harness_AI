# Workflow Kit Module

## Responsibility

The cluster facade of `core-runtime/clusters/project-workflow`: every
process operation of the Workflow Kit on one project root. It composes the
facades of the plan, git, quality and recovery modules and keeps the rule
"each status changes through a Kit command; each finished task is one Kit
commit".

It also handles the managed git hooks and owns the command-line dispatcher
`src/workflow-kit-cli.ts`, the entry of the standalone bundle.

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
- `inspect(path)`, `install(path, options)`, `doctor(path, options)`,
  `migrateHarnessPlan(path, options)` — delegated to `workflow-installer` (`installer` exposes it, bound to the same git
  facade).

Scope (`kit-scope.ts`); every change is a Kit commit unless noted:
- `createScope(root, input)` — baseline is HEAD; role `scope-plan`
  (`docs: plan scope <id>`); the commit also takes the specification and
  `context` documents when they are changed. When the configuration has
  `host: "harness"` it fails with `EXECUTION_MODE_REQUIRED` (next action:
  `scope:propose`); without a host it works as before (no execution block,
  `sequential`). Every scope creation (here, `chooseScope` and an automatic
  choice of `proposeScope`) clears the scope proposal record.
- `proposeScope(root, input, recommended, reason)` — `scope:propose`
  (section 4.1 of `WorkflowKitExecutionModes.md`); the record and its rules
  belong to `workflow-execution-mode`:
  - validates the input exactly like `createScope` (the same plan
    transition, with `execution.strategy` set to the recommendation), so a
    scope still open fails with `SCOPE_EXISTS`; nothing is committed;
  - computes `hasParallelWork` on the candidate plan and the options
    (`NO_PARALLEL_WORK` for `orchestrated` without parallel work,
    `PROPOSAL_REASON` for a reason outside 10..300 characters);
  - stores the proposal and returns `{autoChosen: false, generation,
    options, hasParallelWork, recommended, reason, scope: null}`;
  - when the stored record is in refinement (`refining: true`) and the new
    plan has no parallel work, it creates the scope as `sequential` at once
    (approval suffix `| Execution mode chosen automatically: sequential
    ...`, `ownerSession: null`) and returns `autoChosen: true` with the
    `PlanChange` in `scope`.
- `chooseScope(root, {generation, option, session, note})` —
  `scope:choose`: the proposal verification of `workflow-execution-mode`
  runs first (`PROPOSAL_CHANGED` for a stale choice, `NO_PARALLEL_WORK`
  for `orchestrated` without parallel work; nothing is written).
  - `sequential`/`orchestrated` create the scope from the stored input with
    `execution {strategy: option, maxWorkers: input value or 3,
    ownerSession: session}` and the approval
    `<approval> | Execution mode chosen by the user: <option>: <note>`;
  - `refine` drops the stored plan and keeps `refining: true`.
  Returns `{option, generation, refining, execution, scope}`.
- `readProposal(root)` — the stored proposal record or `null` (for status
  and recovery).
- `proposalView(root)` — `scope:proposal`, read-only: the card view of the
  stored proposal without the plan input, or `null`:
  `{generation, recommended, reason, hasParallelWork, options, refining,
  createdAt, scopeId, objective, host}`; `scopeId`/`objective` come from the
  stored input (`null` after `refine`), `host` is `config.host` or `null`.
  Harness Core builds the mode card from it.
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
  working tree outside Kit-managed paths (`DIRTY_TREE`); role `close`;
  clears the scope proposal record.
- `carryover(root, input)` — role `carryover`.
- `block(root, reason)` / `unblock(root)` — write the plan only; the next
  Kit commit records the state.

Assignments (`kit-assignment.ts`; records, scheduler and brief belong to
`workflow-assignment`; section 5.1 of `WorkflowKitExecutionModes.md`):
- `nextAssignments(root)` — `assignment:next`, read-only: `{orchestrated,
  idle, scopeId, maxWorkers, active, ready, blocked}`; `active` holds the
  active records of the current scope, `ready` the tasks
  (`{id, kind, parallelSafe, title}`) the scheduler hands out now, `blocked`
  the other candidates with `DEPENDENCY_PENDING`, `ASSIGNMENT_BARRIER`,
  `ASSIGNMENT_CONFLICT` or `ASSIGNMENT_CAPACITY` and the tasks they wait for.
- `createAssignment(root, taskId)` — `assignment:create` in main, under the
  project lock; fails in this order:
  1. `NOT_ORCHESTRATED` — no scope or strategy `sequential`;
     `SCOPE_NOT_ACTIVE` — a blocked scope;
  2. `TRANSACTION_PENDING`; `INTEGRATION_ACTIVE` while
     `.harness/workflow/local/integration.json` exists;
  3. `DIRTY_TREE` — changes outside Kit-managed paths (`details.paths`);
  4. `NO_COMMITS`; the base is HEAD;
  5. `UNKNOWN_TASK`; `ASSIGNMENT_KIND` for QUALITY and delivery tasks (the
     orchestrator runs them in main); `TASK_NOT_TODO`;
  6. an active record of the task: the same `ASSIGNED` record (same
     iteration, base and configuration digest) is returned with
     `created: false`; anything else is `ASSIGNMENT_EXISTS`
     (`details {id, status}`);
  7. the scheduler: the candidate's code (`DEPENDENCY_PENDING`,
     `ASSIGNMENT_BARRIER`, `ASSIGNMENT_CONFLICT`, `ASSIGNMENT_CAPACITY`) with
     `details.blockedBy`; a task outside `ready` is `ASSIGNMENT_BARRIER`;
  8. `DEPENDENCY_NOT_IN_BASE` — a dependency commit (from the task-to-commit
     mapping of `workflow-git`) is not an ancestor of the base;
  9. `ASSIGNMENT_EXISTS` — a record file with the new id already exists
     (for example an integrated one).
  It writes the `ASSIGNED` record (`baseCommit` HEAD, `configDigest` of the
  configuration) and returns `{assignment, brief, created: true}`. The task
  stays `TODO` and nothing is committed: the plan changes only on
  integration.

Executor worktree (`kit-executor.ts`; sections 5.1–5.3 of
`WorkflowKitExecutionModes.md`). A checkout with
`.harness/workflow/local/assignment.json` is an executor worktree
(`executorAssignment(root)` returns that record, `null` elsewhere):
- `attachAssignment(root, id)` — `assignment:attach <id>`, run in the linked
  worktree Claude created for the subagent, under the worktree's lock:
  1. `ASSIGNMENT_LAYOUT` / `ASSIGNMENT_WORKTREE` — the location checks of
     `workflow-assignment` (the main checkout is refused);
  2. `ASSIGNMENT_UNKNOWN` — main has no record `<id>`;
  3. `ASSIGNMENT_ATTACHED` — this worktree is attached to another id, or the
     record names another worktree;
  4. a worktree already attached to this id (both records written) returns
     `{attached: false, planCommit: null}` without any change;
  5. `ASSIGNMENT_STATUS` — the record is not `ASSIGNED` (and not attached to
     this worktree); `TRANSACTION_PENDING`;
  6. `ASSIGNMENT_DIRTY` — any change in the worktree (`details.paths`);
  7. HEAD equals `baseCommit`: the executor plan (built from
     `git show <base>:.harness/plans/todo-plan.md`) is committed as a Kit
     service commit with role `assignment-plan`, only the plan file, message
     `docs: plan assignment <id>`, trailers `Workflow-Scope:
     assignment-<id>`, `Workflow-Task`, `Workflow-Iteration` and
     `Workflow-Assignment: <id>`; HEAD that already is this plan commit (one
     commit on the base with that role and trailer) continues an interrupted
     attach; any other HEAD is `ASSIGNMENT_BASE` (`details {base, head}`);
  8. writes the main record (`worktree` real path, `branch` or `null` when
     detached, status `READY`, `updatedAt`) and then the worktree record.
  Returns `{assignment, attached: true, planCommit, worktree}`.
- `assignmentStatus(root)` — `assignment:status`: `{assignment (the main
  record or null), worktree (the worktree record), scopeId, head, task {id,
  kind, status, title, files}}`; `ASSIGNMENT_NOT_ATTACHED` outside an
  executor worktree.
- `task:start` in an executor worktree sets the main record to `RUNNING`;
  a successful `commit --task` sets `READY_FOR_INTEGRATION` and
  `sourceCommit` to the new commit (written through `mainRoot`; nothing
  happens when the main record is missing).
- Executor commits carry `Workflow-Assignment: <id>`. Before any transaction
  `commit --task` checks the selected files plus the plan with the contract
  guard of `workflow-assignment` (`ASSIGNMENT_CONTRACT`, `ASSIGNMENT_SCOPE`);
  Kit-managed paths are excluded from the selection as usual.

Tasks (`kit-task.ts`):
- `startTask(root, id, confirmation?)` — in an orchestrated scope (section 6
  of `WorkflowKitExecutionModes.md`; the executor plan is sequential) a
  `work` or `DOCS` task fails with `ORCHESTRATED_MAIN_READ_ONLY` (next action:
  `assignment:next`, `assignment:create --task <ID>`) and a delivery task
  with `DELIVERY_NOT_READY` (`details {pending, active}`) while an earlier
  task is not `DONE` or an assignment of the scope is active; `QUALITY`
  starts as usual and sequential scopes are unchanged. Then assigned checks
  must exist in the profile (`CHECK_UNKNOWN`); the plan module checks scope, status,
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
  4. adds the selected files to `task.files` and completes the task in the
     candidate plan; in an executor worktree the contract guard runs here;
  5. runs the `prepare` stage on the selected files (`CHECK_FAILED`
     stops before any transaction);
  6. commits the candidate through the transaction: role `docs` for a DOCS task,
     `implementation` otherwise; commit-stage checks run in the git hook;
  7. stores the prepare report in the commit evidence.
  Returns `{commit, prepare, preexisting, nextTask}`.
- `commitDocs(root, files, message?)` — `docs:commit`: documentation files
  only — Markdown and `.harness/product-tree/**` (`DOCS_ONLY`), never while a task is in progress (`TASK_IN_PROGRESS`);
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
  - in an executor worktree, checks every staged path (`git diff --cached
    --name-only HEAD`) and the candidate plan with the contract guard
    (`ASSIGNMENT_CONTRACT`, `ASSIGNMENT_SCOPE`), so a transaction that
    bypasses `commit --task` is refused as well;
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
  - `ASSIGNMENT_READ_ONLY` in an executor worktree: executors never push;
  - `TRANSACTION_PENDING` while a journal exists;
  - `DOCS_PENDING` while the DOCS task of the last round with a finished
    task is not done;
  - runs the required `push` checks (`CHECK_FAILED`).
- Any other name fails with `UNKNOWN_HOOK`; unexpected errors are reported
  with their code instead of a stack trace.

## Command Line (`workflow-kit-cli.ts`, `kit-cli-args.ts`, `kit-cli-text.ts`, `kit-cli-execution.ts`, `kit-cli-assignment.ts`)

- `runCli(argv, io, kit?)` returns the exit code; `io` is `{cwd, env,
  readStdin, stdout, stderr}`. The file runs `runCli` itself when it is the
  program entry (the bundle or the compiled file), and not when imported.
- The project root is `--root`, else `HARNESS_WORKFLOW_ROOT`, else the git
  top level of the working directory, else the working directory. Input
  files resolve against the working directory.
- Commands: `status`, `autopilot:status` (the status the Harness Core
  autopilot decides on), `validate`, `recover [--event]`, `show-task <ID>`,
  `history [--task] [--round]`, `scope:create --input`,
  `scope:propose --input --recommended sequential|orchestrated --reason`,
  `scope:choose --generation <N> --option sequential|orchestrated|refine
  --session <id> --note`, `scope:proposal` (all three defined in
  `kit-cli-execution.ts`; an
  invalid `--recommended`, `--option` or a non-positive `--generation` is
  `USAGE`),
  `assignment:next`, `assignment:create --task <ID>`,
  `assignment:attach <id>`, `assignment:status` (all defined in
  `kit-cli-assignment.ts`),
  `plan:extend --input [--expected-revision]`,
  `task:update <ID> --input [--expected-revision]`, `accept --note`,
  `close --scope --note`, `carryover --input`,
  `task:start <ID> [--confirmed]`, `task:block --reason`, `task:unblock`,
  `commit --task [--files] [--digest]`, `docs:commit --files [--message]`,
  `quality:detect [--stack]`, `quality:apply --input`, `quality:status`,
  `repair [--apply|--cancel]`, `inspect [<path>]`,
  `install [<path>] [--name] [--update] [--host harness] [--bundle]`,
  `doctor [<path>] [--fix] [--bundle]`,
  `migrate:harness-plan [<path>] [--message] [--objective] [--spec]
  [--name]`, `help`. `install` and
  `doctor --fix` copy their own bundle file unless `--bundle` names another
  and record the running executable as the project runtime (`electron`
  mode under Electron).
  `--files` and `--stack` take a JSON list or a comma-separated list.
- Output: `{ok: true, command, result}` as JSON, or `--format text`
  (status, validation, inspection, recovery, task and history texts; for
  `scope:propose` the generation, recommendation, reason, options and the
  next step; for `scope:choose` the choice and the created scope; for
  `assignment:next` the scope and workers, one line per active, ready and
  blocked task and the next `assignment:create`, or `assignments: none
  (<idle code>)`; for `assignment:create` the id, task, short base and
  whether it was created, followed by the brief; for `assignment:attach`
  the id, whether it was attached now, task, status, worktree and branch
  (`detached`), main, the short plan commit and the next `task:start`; for
  `assignment:status` the id with the main status, scope, short base and
  head, the task line and the source commit; for
  `scope:proposal` the generation and state, the scope, reason and options
  or `proposal: none`; JSON
  otherwise). `inspect` text lists `path`, `state`, `action`,
  `kit version`, `git` (repository and short head), `identity`, `stacks`,
  `transaction`, plus `nested in` and `damaged` when present.
- Executor worktree: only `status`, `validate`, `recover`, `show-task`,
  `task:start`, `commit`, `repair`, `task:block`, `assignment:status`,
  `assignment:attach` (retry), `help`, `hook` and `git-hook` run; every other
  known command fails with `ASSIGNMENT_READ_ONLY` (`details.allowed`) before
  it runs.
- Errors: `{ok: false, code, message, nextAction, details}` on stdout with
  exit code 1 (`--format text`: `CODE: message` on stderr). Argument errors
  are `USAGE`, unknown commands `UNKNOWN_COMMAND`, unreadable inputs
  `INPUT_UNREADABLE` / `INPUT_JSON`, unexpected errors `INTERNAL`.
- `hook session-start --client claude|codex` prints the raw SessionStart
  JSON from stdin input; `git-hook <name> [args]` prints the hook message
  on stderr and exits with the hook code.

## Bundle

`npm run build:workflow-kit` (`scripts/build-workflow-kit.mjs`, part of
`npm run build` and `npm run dev`) bundles `workflow-kit-cli.ts` with
`vite.workflow-kit.config.ts` (Vite SSR library mode, target Node 22, not
minified) into `dist/workflow-kit/workflow.mjs`. Every cluster module is
inlined; only `node:` built-ins stay external. The script fails when the
bundle imports anything else, then smoke-tests it in a temporary folder:
`help`, `status` of a folder without the Kit (`installed: false`) and
`validate` reporting `NOT_INSTALLED`, and an installation into a new git
project (temporary global git identity) whose bootstrap commit runs the
installed hooks and launcher, followed by `scripts/workflow validate` and
`scripts/workflow doctor`.

## Dependencies

`workflow-platform`, `workflow-plan`, `workflow-git`, `workflow-quality`,
`workflow-recovery`, `workflow-installer`, `workflow-execution-mode`,
`workflow-assignment`, `workflow-autopilot` (types).
Node built-ins only.

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
- `src/workflow-kit-execution-mode.test.mjs` — propose without and with
  parallel work, `NO_PARALLEL_WORK`, validation like `scope:create`,
  orchestrated refused without parallel work, `PROPOSAL_CHANGED` for
  another generation and a changed stored plan, refine then the automatic
  sequential scope, the `proposalView` card view (open and refining),
  `SCOPE_EXISTS`, close clears the record, the
  orchestrated choice with `maxWorkers` and owner session, and in a
  `host: "harness"` project `EXECUTION_MODE_REQUIRED` plus the CLI
  propose/proposal/choose path with text output and usage errors.
- `src/workflow-kit-assignment.test.mjs` — a sequential scope
  (`NOT_ORCHESTRATED`), then an orchestrated scope with `maxWorkers: 2`:
  QUALITY first (`DEPENDENCY_PENDING`, `ASSIGNMENT_KIND`), the schedule
  after QUALITY (ready, conflict, capacity, barrier, DOCS pending),
  `DIRTY_TREE`, `INTEGRATION_ACTIVE`, `SCOPE_NOT_ACTIVE`, a created record
  and brief with an unchanged plan and HEAD, the idempotent retry,
  `ASSIGNMENT_CONFLICT`/`CAPACITY`/`BARRIER` against an active assignment,
  the CLI (JSON and text `assignment:next`, `assignment:create`, `USAGE`),
  `ASSIGNMENT_EXISTS` for another status or base and an integrated record
  freeing its worker.
- `src/workflow-kit-executor.test.mjs` — real `git worktree add` worktrees of
  a temporary repository whose absolute `core.hooksPath` (shared by all
  worktrees) runs the hooks through a runner: QUALITY in main,
  `ORCHESTRATED_MAIN_READ_ONLY` for work and DOCS, `DELIVERY_NOT_READY`
  for pending tasks and later for active assignments, then delivery after
  integration; attach refused in main (`ASSIGNMENT_WORKTREE`), on another
  base, dirty and unknown; the attach records, the `assignment-plan` commit
  (only the plan file, parent and trailers) and the executor plan; the
  idempotent retry and `ASSIGNMENT_ATTACHED`; the command whitelist,
  `assignment:status` text and `pre-push`; `RUNNING`; `ASSIGNMENT_SCOPE`,
  `ASSIGNMENT_CONTRACT` for a launcher and, through the hook, for the
  configuration and a plan edit; `READY_FOR_INTEGRATION` with
  `sourceCommit` and the trailer; a branch worktree attached through the
  CLI whose directory entry owns nested files (`src/modx.ts` stays outside).
- `src/workflow-kit-cli.test.mjs` — help, usage and unknown-command
  envelopes, inspection (JSON and text) and update of a folder without the
  Kit, an invalid `install --host`, text errors, a folder without the Kit, a
  whole task from a
  subdirectory, text output, recovery events, SessionStart and git-hook
  dispatch, the compiled file run as a program.

Test repositories use the real local identity `workflow@harness-ai.test`:
Kit commits refuse placeholder identities (`GIT_IDENTITY_REQUIRED`).
