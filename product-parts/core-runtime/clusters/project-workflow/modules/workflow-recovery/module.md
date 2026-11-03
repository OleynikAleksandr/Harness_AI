# Workflow Recovery Module

## Responsibility

The bounded recovery packet of the Workflow Kit: the working set an agent
needs to continue the plan after a new session, `/clear` or compaction. Its
size depends on the current task, not on the length of the plan.

It also answers the provider SessionStart hook and the on-demand
`show-task` and `history` commands.

## Public Facade

`WorkflowRecoveryFacade` (class, singleton `workflowRecoveryFacade`). The
constructor takes a `WorkflowGitFacade`; tests pass one with a clean git
environment.

## Contract

- `build(input)` assembles the packet from gathered state. `RecoveryInput`:
  `{event, plan, quality {status, stacks}, budgetBytes, head, transaction,
  changes, taskCommits, verification, readDocument(path)}`.
- Sections in priority order (`*` — mandatory):
  1. `state`* — project, scope, revision, scope and result status, quality
     profile, HEAD, transaction, event;
  2. `next`* — one instruction: no scope, unfinished transaction (`repair`),
     `BLOCKED: <reason>`, `READY_FOR_ACCEPTANCE`, `ACCEPTED`, continue the
     task in progress, start the next ready task, or confirm a `delivery`
     task with the user first;
  3. `objective`* — scope objective and acceptance criteria;
  4. `task`* — the current task, or the next ready one, in full; a `fixes`
     task shows the original task and its short SHA;
  5. `upcoming`* — up to three next `TODO` tasks and the remaining count;
  6. `recent`* — the last three `DONE` tasks with short SHAs;
  7. `rounds` — digests: the last three in full, earlier ones in one line;
  8. `decisions` — the last five user decisions of the scope;
  9. `changes`* — working-tree changes outside the task (up to 40 paths)
     and the pending transaction;
  10. `verification` — the last stored check reports; failed checks with
      at most 1 KB of output in total;
  11. `documents` — required documents of the scope (`spec`, `context`) and
      of the task (`context`), one entry per path;
  12. `references`* — everything that did not fit, missing files and
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

## Project Commands (`recovery-gather.ts`, `recovery-commands.ts`)

- `gather(root, event)` reads:
  - the plan (an empty plan when the file is absent; parse errors throw);
  - the configuration (`budget.recoveryBytes`, quality status and stacks);
  - git: HEAD, the pending transaction journal, changes outside the task
    in progress (its declared files and Kit-managed paths are left out) and
    the commit of every done task;
  - the last verification evidence;
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

- `workflow-plan` — plan types, reading the plan.
- `workflow-git` — HEAD, changes, history, journal, commit references.
- `workflow-quality` — configuration and verification evidence.
- `workflow-platform` — files inside the project, `WorkflowError`.

Node built-ins only.

## Tests

- `src/workflow-recovery-packet.test.mjs` — full packet, tight and tiny
  budgets, heading sections, task truncation, every `next` variant, heading
  extraction.
- `src/workflow-recovery-project.test.mjs` — a git project: packet without
  a repository, changes outside the task, JSON output, the SessionStart
  hook with and without host delivery and with a broken plan, `show-task`,
  `history`.
