# Workflow Recovery Module

## Responsibility

The bounded recovery packet of the Workflow Kit: the working set an agent
needs to continue the plan after a new session, `/clear` or compaction. Its
size depends on the current task, not on the length of the plan. It names
the agent role of the session (planning, self, orchestrator, executor) and
the next step of that role.

It also answers the provider SessionStart hook and the on-demand
`show-task` and `history` commands, and serves the input descriptors of
Kit commands with their compact text (`schema` command and section).

## Public Facade

`WorkflowRecoveryFacade` (class, singleton `workflowRecoveryFacade`). The
constructor takes a `WorkflowGitFacade`; tests pass one with a clean git
environment.

## Contract

- `build(input)` assembles the packet from gathered state. `RecoveryInput`:
  `{event, plan, quality {status, stacks}, budgetBytes, head, transaction,
  changes, taskCommits, verification, readDocument(path), roles?}`;
  `roles` are the role facts below (absent: the plan alone decides).
- Sections in priority order (`*` — mandatory):
  1. `state`* — project, scope, revision, scope and result status, quality
     profile, HEAD, transaction, event, the agent role (see Roles);
  2. `next`* — the step for the role, then one `Role <role>: …` rule line.
     In order: no scope (the planning step), unfinished transaction
     (`repair`), `BLOCKED: <reason>`, the executor step (an executor
     worktree), `READY_FOR_ACCEPTANCE`, `ACCEPTED`, the orchestrator step
     (orchestrated main), otherwise (role self) continue the task in
     progress, start the next ready task, or confirm a `delivery` task with
     the user first (`task:start <ID> --confirmed "…"`);
  3. `objective`* — scope objective and acceptance criteria;
  4. `task`* — the current task, or the next ready one, in full; a `fixes`
     task shows the original task and its short SHA;
  5. `schema`* — present only when the next step takes a JSON input (see
     Input Schemas): an `Input of the next step` line that names
     `scripts/workflow schema <command>`, then the compact text of the
     descriptor;
  6. `upcoming`* — up to three next `TODO` tasks and the remaining count;
  7. `recent`* — the last three `DONE` tasks with short SHAs;
  8. `rounds` — digests: the last three in full, earlier ones in one line;
  9. `decisions` — the last five user decisions of the scope;
  10. `changes`* — working-tree changes outside the task (up to 40 paths)
      and the pending transaction;
  11. `verification` — the last stored check reports; failed checks with
      at most 1 KB of output in total;
  12. `documents` — required documents of the scope (`spec`, `context`) and
      of the task (`context`), one entry per path;
  13. `references`* — everything that did not fit, missing files and
      optional documents.
- Budget (`budgetBytes`, UTF-8):
  - optional sections are added in priority order while the packet fits;
    a section that does not fit moves to `references` with its size and
    how to read it;
  - a document is included whole; otherwise its `heading` section (matched
    by text or slug, with nested headings); otherwise it becomes a
    reference; a section-only inclusion is also listed in references;
  - when mandatory sections exceed the budget, long task fields (`why`,
    `files`, `acceptance`, `context`) are capped step by step (2000 … 60
    bytes) with `[truncated: N bytes, run: scripts/workflow show-task ID]`;
  - the header states `bytes` (of the whole text, header included),
    `budget`, `included`, `omitted` and `(over budget)` when even the
    smallest cap does not fit.
- Process rules and templates are not part of the packet; the header
  points to the managed Workflow Kit section of `AGENTS.md`.
- `RecoveryPacket`: `{schema "harness-workflow-recovery/1", event, budget,
  bytes, overBudget, truncated, included, omitted, references, sections,
  text}`.
- `section(text, heading)` returns a Markdown section or `null`.

## Input Schemas (`recovery-schema.ts`)

- `inputSchemaCommands()` — `workflowPlanFacade.inputSchemaCommands()`
  (`scope:create`, `scope:propose`, `plan:extend`, `task:update`,
  `carryover`, `digest`) followed by `quality:apply`.
- `inputSchema(command)` — the descriptor (a copy) from its owner facade:
  `workflowQualityFacade.inputSchema()` for `quality:apply`,
  `workflowPlanFacade.inputSchema(command)` otherwise; `null` for a command
  without one.
- `schemaText(schema)` — `<command>: <description>`, `fields:` with one
  line per field `- <name> <type> required|optional [<limits>, code
  <CODE>[, limitCode <CODE>]] — <description>` (limits in this order:
  `minItems`, `maxItems`, `maxBytes`, `minLength`, `minimum`, `maximum`,
  `enum a|b`, `pattern`), `rules:` with one line per rule, `example:` and
  the example as one line of JSON. The Kit `schema --format text` command
  prints the same text.
- The `schema` section names the descriptor of the next step:
  - no scope: `scope:propose` when `roles.harness`, else `scope:create`;
    none while a proposal waits for the user's choice (not `refining`);
  - none while a transaction is unfinished or the scope is `BLOCKED`;
  - delivery `READY_FOR_ACCEPTANCE` or `ACCEPTED` outside an executor
    worktree: `plan:extend` (defects become a fixes round);
  - the step task — the executor's own task in an executor worktree, else
    the current or next ready task, not `DONE`: kind `quality` —
    `quality:apply`; kind `docs` — `digest`, except in orchestrated main,
    where DOCS goes to an executor;
  - otherwise no section.
  The section is mandatory when present: it is never moved to references.

## Roles (`recovery-roles.ts`, spec section 9)

Role facts (`RoleFacts`): `{harness, proposal, executor, unattachedWorktree,
assignments, integration}`, gathered by `gatherRoleFacts(git, root, plan,
harness, warnings)`:
- `harness` — `config.host` is `harness`;
- `executor` — the worktree record `.harness/workflow/local/assignment.json`
  exists: `{id, taskId, status}`, the status read from the main record
  (`null` without it); nothing else is gathered then;
- without a scope: `proposal` — `{generation, recommended, refining}` of the
  stored scope proposal, or `null`;
- an orchestrated scope: `unattachedWorktree` — this checkout is a linked
  worktree (`locateWorktree` succeeds) without a worktree record; otherwise
  (main) `assignments` — the records of the scope that are active plus every
  record with cleanup `PENDING`, as `{id, scopeId, taskId, status, worktree,
  sourceCommit, cleanupPending}` — and `integration` — the integration
  journal `.harness/workflow/local/integration.json` of `integration:start`
  as `{assignmentId, phase}` (`assignmentId`, else `id`; an unreadable
  journal is phase `UNKNOWN`);
- an unreadable record becomes a `state` warning and empty facts.

`agentRole(input)`: `executor` with an executor record or an unattached
worktree; `planning` without a scope; `orchestrator` for strategy
`orchestrated`; otherwise `self`.

`state` lines: `role: planning|self`; `role: executor (assignment <id>, task
<ID>, <status>)` or `role: executor (not attached)` — only the own task, no
assignment list; in orchestrated main `role: orchestrator`, `assignments:`
(`none`, or one `- <id> <task> <status> <worktree|not attached>[, cleanup
PENDING]` line each) and `integration: <id> <phase>|none`. Every list holds
at most 10 items, then `… N more`.

Steps:
- planning: a pending proposal — `No active scope: the scope proposal
  (generation N, recommended M) is waiting for the user's choice on the
  card`, end the turn; after `refine` — discuss, update spec and plan, then
  `scope:propose` again; otherwise in a Harness project write the spec and
  a plan with `parallelSafe` labels, `scope:propose --input <plan.json>
  --recommended sequential|orchestrated --reason "<why>"` and end the turn;
  without Harness `scope:create --input <plan.json>`;
- executor: not attached — `assignment:attach <id>` with the id from the
  brief; task `DONE` — report the SHA (`taskCommits`) and end the turn;
  `IN_PROGRESS` — continue, then `commit --task <ID>` (`--digest` for DOCS);
  record `NEEDS_SETUP` — `assignment:setup`, then `task:start`; otherwise
  `task:start <ID>`, commit, report the SHA;
- orchestrator: an integration journal comes alone — `CONFLICT` and
  `CHECKS_FAILED` name fixing within the task files and
  `integration:continue --id <id>`, other phases finishing with it (and
  `integration:status`); otherwise, in this order: `Integrate first, one at
  a time:` with `integration:start --id <id> --source <short sha>` for each
  `READY_FOR_INTEGRATION` record; the main task in progress (`Continue <ID>
  in main`) or a ready QUALITY task (`task:start` in main) or a delivery
  task once every other task is `DONE` and no assignment is active; the
  scheduler's `ready` tasks to hand out (`assignment:create --task <ID>`, a
  Claude subagent with `isolation: "worktree"` and the brief, wait for the
  SHA); when none of these applies, `Waiting for executors: <id> (<task>,
  <status>), …`; then `Finish cleanups: assignment:cleanup --id <id>` for
  pending cleanups; with nothing at all `No task is ready`.
- Rule lines: planning — spec, labels, no functional changes before the
  scope, end the turn after proposing; self — tasks in order in main,
  helper subagents work in main without their own worktree and never
  commit, no assignments; orchestrator — work and DOCS tasks go to
  executors and their SHAs to `integration:start`, never implemented in
  main, QUALITY and delivery in main, CONFLICT/CHECKS_FAILED fixed within
  the task files then `integration:continue`; executor — only this worktree
  and paths equal to or nested in the task files, never main, the plan or
  other tasks, no nested executors, no push.

## Project Commands (`recovery-gather.ts`, `recovery-commands.ts`)

- `gather(root, event)` reads:
  - the plan (an empty plan when the file is absent; parse errors throw);
  - the configuration (`budget.recoveryBytes`, quality status and stacks);
  - git: HEAD, the pending transaction journal, changes outside the task
    in progress (its declared files and Kit-managed paths are left out) and
    the commit of every done task;
  - the last verification evidence;
  - the role facts (`gatherRoleFacts`);
  - documents through `readDocument`, inside the project only.
  Problems that do not stop the packet become `warnings` shown in the
  `state` section: not a git repository, inconsistent commit references.
- `packet(root, event)` = `build(gather(root, event))`;
  `render(packet, "text" | "json")` is `recover --format`.
- `sessionStart(root, {client, stdin, env})` is `hook session-start`:
  - the event is the `source` of the hook input (`startup`, `resume`,
    `clear`, `compact`; anything else is `startup`);
  - the answer is `{continue: true, hookSpecificOutput: {hookEventName:
    "SessionStart", additionalContext}}`;
  - with `HARNESS_WORKFLOW_RECOVERY=host` (`HOST_RECOVERY_VARIABLE`) the
    answer has no `additionalContext`, because Harness delivered it;
  - errors never block the session: the context then names the error code
    and points to `scripts/workflow doctor`.
- `showTask(root, id)` — the full task text with `committed: <sha>` for a
  done task; `UNKNOWN_TASK` otherwise.
- `history(root, {task?, round?})` — commits since the scope baseline as
  `{sha, role, taskId, subject}` from the `Workflow-*` trailers (commits
  without them are `external`), filtered by task or by the tasks of a
  round, plus a one-line-per-commit text.

## Dependencies

- `workflow-plan` — plan types, reading the plan, plan input descriptors.
- `workflow-git` — HEAD, changes, history, journal, commit references.
- `workflow-quality` — configuration (`host`), verification evidence and
  the `quality:apply` descriptor.
- `workflow-assignment` — assignment records, the worktree record,
  `locateWorktree`, the scheduler.
- `workflow-execution-mode` — the stored scope proposal.
- `workflow-platform` — files inside the project, `WorkflowError`.

Node built-ins only.

## Tests

- `src/workflow-recovery-packet.test.mjs` — full packet, tight and tiny
  budgets, heading sections, task truncation, every `next` variant, heading
  extraction.
- `src/workflow-recovery-schema.test.mjs` — the descriptor catalog and
  compact text, and the `schema` section for every case: no scope with and
  without Harness, a waiting and a refining proposal, QUALITY, DOCS,
  acceptance and accepted, a work task, a transaction, a blocked scope, an
  executor DOCS task, orchestrated main, a done executor task, and a tight
  budget that keeps the section.
- `src/workflow-recovery-roles.test.mjs` — every role and step from built
  inputs: planning (Harness, without Harness, pending proposal, refine, no
  facts), self, orchestrator (state lines, integrate first, hand out,
  cleanups, every integration phase, waiting, QUALITY, delivery), executor
  (state, setup, start, continue, report, acceptance of the executor plan
  ignored, not attached) and a bounded list within a 3000-byte budget.
- `src/workflow-recovery-worktree.test.mjs` — a real repository through the
  Kit: planning, the pending proposal, the orchestrator before and after
  QUALITY and with an assignment, an executor worktree before and after
  `assignment:attach`, its started and committed task, and main asking to
  integrate the reported SHA.
- `src/workflow-recovery-project.test.mjs` — a git project: packet without
  a repository, changes outside the task, JSON output, the SessionStart
  hook with and without host delivery and with a broken plan, `show-task`,
  `history`.

Test repositories use the real local identity `workflow@harness-ai.test`:
Kit commits refuse placeholder identities (`GIT_IDENTITY_REQUIRED`).
