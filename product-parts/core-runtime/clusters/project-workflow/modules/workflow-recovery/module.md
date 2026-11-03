# Workflow Recovery Module

## Responsibility

The bounded recovery packet of the Workflow Kit: the working set an agent
needs to continue the plan after a new session, `/clear` or compaction. Its
size depends on the current task, not on the length of the plan.

Gathering the state from a project, the session-start hook output and the
`show-task`/`history` helpers are added by a later task of the active plan.

## Public Facade

`WorkflowRecoveryFacade` (class, singleton `workflowRecoveryFacade`).

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

## Dependencies

`workflow-plan` (plan types, plan path). Node built-ins only.

## Tests

`src/workflow-recovery-packet.test.mjs` — full packet, tight and tiny
budgets, heading sections, task truncation, every `next` variant, heading
extraction.
