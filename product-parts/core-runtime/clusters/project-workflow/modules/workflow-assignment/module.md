# Workflow Assignment Module

## Responsibility

Assignments of orchestrated scopes (sections 5.1, 5.2 and 6 of
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`):
- the assignment records of the main checkout,
  `.harness/workflow/local/assignments/<id>.json`;
- the scheduler: which tasks can be handed out to executors now;
- the executor brief, the ready text for the Claude subagent.

The command preconditions (`assignment:create`), the plan and git checks
belong to `workflow-kit`; attaching a worktree, the executor plan and the
integration come later and update these records.

## Public Facade

`WorkflowAssignmentFacade` (class, singleton `workflowAssignmentFacade`) in
`src/workflow-assignment-facade.ts`. Types: `AssignmentRecord`,
`AssignmentStatus`, `AssignmentSchedule`, `BlockedTask`,
`ScheduleBlockCode`.

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
files, acceptance and context of the task, commits with
`scripts/workflow commit --task <ID>` (`--digest <file.json>` for a DOCS
task) repeating it after a fixed check failure, and replies with the commit
SHA. Rules: never touch the main checkout, the plan or other tasks; do not
set the git identity; do not create nested executors.

## Dependencies

`workflow-platform` (files, errors), `workflow-git` (`localPath`),
`workflow-plan` (types, `execution`, `compatibleTasks`),
`workflow-quality` (the configuration file path). Node built-ins only.

## Tests

`src/workflow-assignment-facade.test.mjs` — the scheduler matrix
(sequential and blocked scopes, QUALITY and delivery excluded, dependencies
including assigned ones, DOCS after the work of its round, the barrier in
both directions, overtaking a waiting parallel task, path conflicts with
active and ready tasks, integrated and foreign records ignored, capacity),
ids, record create/write/read/list order, `ASSIGNMENT_ID`,
`ASSIGNMENT_RECORD`, the configuration digest and the brief of a work and a
DOCS task.

## Owned Paths

- `module.md`
- `src/**`
