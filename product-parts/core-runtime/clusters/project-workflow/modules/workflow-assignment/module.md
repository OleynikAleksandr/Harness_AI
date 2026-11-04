# Workflow Assignment Module

## Responsibility

Assignments of orchestrated scopes (sections 5.1, 5.2 and 6 of
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`):
- the assignment records of the main checkout,
  `.harness/workflow/local/assignments/<id>.json`;
- the scheduler: which tasks can be handed out to executors now;
- the executor brief, the ready text for the Claude subagent;
- the executor side (sections 5.1 and 5.3): locating the main checkout of a
  linked worktree, the worktree record
  `.harness/workflow/local/assignment.json`, the one-task executor plan and
  the contract guard of executor commits.

The command preconditions (`assignment:create`, `assignment:attach`), the
commits and the git hooks belong to `workflow-kit`; the integration comes
later and updates these records.

## Public Facade

`WorkflowAssignmentFacade` (class, singleton `workflowAssignmentFacade`) in
`src/workflow-assignment-facade.ts`. Types: `AssignmentRecord`,
`AssignmentStatus`, `AssignmentSchedule`, `BlockedTask`,
`ScheduleBlockCode`, `WorktreeAssignment`, `WorktreeLocation`,
`ExecutorChange`.

## Contract

Records (`assignment-records.ts`):
- `id(scopeId, taskId, iteration)` — the stable readable id
  `<scopeId>-<taskId>-<iteration>`; characters outside `[A-Za-z0-9._-]`
  become `-`.
- `recordFile(root, id)` — the record path through the local-path helper of
  `workflow-git`; an id that does not match `[A-Za-z0-9][A-Za-z0-9._-]*`
  fails with `ASSIGNMENT_ID`. `root` is the main checkout.
- `create({scopeId, taskId, iteration, baseCommit, configDigest, now})`
  builds a new record without writing it: `version: 1`, the id above,
  `status: "ASSIGNED"`, `worktree`, `branch`, `sourceCommit`,
  `integrationCommit` and `cleanup` all `null`, `createdAt` and
  `updatedAt` equal to `now`.
- Statuses: `ASSIGNED`, `NEEDS_SETUP`, `READY`, `RUNNING`,
  `READY_FOR_INTEGRATION`, `INTEGRATED`. `isActive(record)` is true for every
  status except `INTEGRATED`.
- `read(root, id)` — the record, `null` when the file is missing; a file
  that is not JSON or not a version-1 record with the same id, string scope,
  task and base, an integer iteration and a known status fails with
  `ASSIGNMENT_RECORD` (the Kit never guesses an assignment state).
- `list(root)` — every record of the directory, oldest first (`createdAt`,
  then id); an unreadable record fails the same way.
- `write(root, record)` — atomic two-space JSON.
- `configDigest(root)` — sha256 (hex) of the text of
  `.harness/workflow/config.json`, `null` without the file.

Scheduler (`assignment-schedule.ts`), pure:
`schedule(plan, assignments)` takes the plan and records
(`{scopeId, taskId, status}`) and returns
`{orchestrated, idle, maxWorkers, active, ready, blocked}`.
- Only active records of the plan's scope count; `active` lists their task
  ids.
- `idle` is `NOT_ORCHESTRATED` without a scope or with strategy
  `sequential`, `SCOPE_NOT_ACTIVE` for a blocked scope; then `ready` and
  `blocked` are empty.
- Candidates are `TODO` tasks of kind `work` or `docs` without an active
  assignment, visited in plan order. `QUALITY` and delivery tasks are never
  assignments: the orchestrator runs them in main.
- Each candidate gets the first failing rule, as `{taskId, code, message,
  blockedBy}`:
  1. `DEPENDENCY_PENDING` — a dependency is not `DONE`; a `DOCS` task also
     waits for every `work` task of its round;
  2. `ASSIGNMENT_BARRIER` — a task without `parallelSafe` needs every
     earlier task `DONE` and nothing taken; a `parallelSafe` task never
     overtakes an earlier unfinished task without `parallelSafe` and never
     runs beside a taken task without `parallelSafe`;
  3. `ASSIGNMENT_CONFLICT` — a `parallelSafe` task must be compatible
     (`workflowPlanFacade.compatibleTasks`) with every taken task;
  4. `ASSIGNMENT_CAPACITY` — the taken tasks already fill `maxWorkers`.
- "Taken" means the active assignments plus the candidates already found
  ready in this pass, so the whole `ready` list may be assigned together and
  a later candidate yields its slot to an earlier one.

Brief: `brief(plan, task, record)` returns the English text for the
executor subagent: it executes task `<ID>` of the scope (assignment id),
works only in its own git worktree, first runs
`scripts/workflow assignment:attach <id>` there, then
`scripts/workflow task:start <ID>`, implements within the title, why,
files, acceptance and context of the task, changes only the listed files or
paths nested inside a listed directory (anything else fails with
`ASSIGNMENT_SCOPE`; commit a subset with `--files`) and never edits
`.harness/workflow/**`, the launchers `scripts/workflow*` or the plan
(`ASSIGNMENT_CONTRACT`), commits with
`scripts/workflow commit --task <ID>` (`--digest <file.json>` for a DOCS
task) repeating it after a fixed check failure, and replies with the commit
SHA. Rules: only `status`, `validate`, `recover`, `show-task`, `task:start`,
`commit`, `repair`, `task:block`, `assignment:status` and
`assignment:attach` (retry) work in the worktree, anything else fails with
`ASSIGNMENT_READ_ONLY`; never push; never touch the main checkout, the plan
or other tasks; do not set the git identity; do not create nested
executors.

Executor side (`assignment-attach.ts`):
- `locateWorktree(git, root)` returns `{mainRoot, worktree, branch}`:
  `worktree` is the real path of the git top level, `mainRoot` the parent of
  the common git directory (`git rev-parse --git-common-dir`), `branch` the
  current branch name or `null` when HEAD is detached. Errors:
  - `ASSIGNMENT_LAYOUT` — a bare repository, or a common git directory that
    is not a `.git` folder of a main checkout;
  - `ASSIGNMENT_WORKTREE` — not a repository, or the main checkout itself
    (git directory equal to the common one).
- `worktreeRecord(root)` reads `.harness/workflow/local/assignment.json`:
  `{version: 1, id, mainRoot, scopeId, taskId, baseCommit}` (`scopeId` is the
  scope of main); `null` without the file, `ASSIGNMENT_RECORD` for an
  unreadable one. `writeWorktreeRecord(root, record, mainRoot)` writes it
  atomically from the main record.
- `executorPlan(base, record, now)` builds the plan of the worktree from the
  plan of the base commit: the base scope must be the record's scope and the
  task `TODO` with the record's iteration (`ASSIGNMENT_BASE`). The result has
  revision `base + 1`, scope `assignment-<id>` (baseline the base commit,
  objective `<title>: <why>` or the title, acceptance and context of the
  task, the base spec, approval `Assignment <id>: task <ID> of scope <scope>`
  at `now`, `execution {strategy: sequential, maxWorkers: 1, ownerSession:
  null}`), one open round copied from the task's round without digest, and
  one task: a copy of the assigned task with `dependencies: []` and `fixes:
  null`. It is validated like every plan.

Contract guard (`assignment-guard.ts`): `checkExecutorChange({headPlan,
candidatePlan, paths, planPath})` checks one commit of an executor worktree
against the committed executor plan (`headPlan`, the plan at HEAD), in this
order:
1. `ASSIGNMENT_CONTRACT` (`details.paths`) — a path under
   `.harness/workflow/` or `.harness/plans/` other than the plan file, or a
   launcher (`scripts/workflow`, `scripts/workflow.cmd`,
   `scripts/workflow.ps1`); also when HEAD has no one-task plan;
2. `ASSIGNMENT_SCOPE` (`details.paths`, `details.files`) — a path that is
   neither equal to nor nested (by path segment) in a `files` entry of the
   task, so a task may list a module directory (without a trailing slash) to
   own its tests and `module.md`;
3. `ASSIGNMENT_CONTRACT` — the plan file changes, but the candidate is not
   the Kit's own transition of the single task: started, `files` extended
   only by in-scope paths after the original entries, and completed (with
   the candidate round digest of a DOCS task); the rendered documents must
   be equal.

## Dependencies

`workflow-platform` (files, errors, paths), `workflow-git` (`localPath`,
the git runner of the facade passed by the Kit), `workflow-plan` (types,
`execution`, `compatibleTasks`, parse, render, validate, `startTask`,
`completeTask`),
`workflow-quality` (the configuration file path). Node built-ins only.

## Tests

`src/workflow-assignment-facade.test.mjs` — the scheduler matrix
(sequential and blocked scopes, QUALITY and delivery excluded, dependencies
including assigned ones, DOCS after the work of its round, the barrier in
both directions, overtaking a waiting parallel task, path conflicts with
active and ready tasks, integrated and foreign records ignored, capacity),
ids, record create/write/read/list order, `ASSIGNMENT_ID`,
`ASSIGNMENT_RECORD`, the configuration digest and the brief of a work and a
DOCS task (scope rule, contract, command whitelist, no push). The executor
side is tested with real git worktrees in
`workflow-kit/src/workflow-kit-executor.test.mjs`.

## Owned Paths

- `module.md`
- `src/**`
