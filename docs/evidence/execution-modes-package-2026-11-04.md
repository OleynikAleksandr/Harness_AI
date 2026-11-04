# Execution modes package — 2026-11-04

Scope: `execution-modes-2026-11-04`, delivery task `D1`. Source commit:
`9465dd51` (`docs: reconcile documentation for R1`). Confirmation: the user's
instruction "Все задачи вплоть до сборки нового релиза выполняй сам."

## Build

- `npm run build` → exit 0 (typecheck, runtime, Workflow Kit bundle with its
  smoke install, renderer); `npm run check:links`, `check:security` (0
  vulnerabilities) and `check:dup` pass. The workspace duplication check
  passed only after the 51 leftover `pending-*.json` verification files of
  this repository's previous Kit bundle were removed from
  `.harness/workflow/local/verification/` (the defect fixed by task E12).
- `npm run package:mac` → exit 0; `release/mac-arm64/Harness AI.app`
  (unsigned, default icon); `app.asar` 32 MB;
  `Resources/workflow-kit/workflow.mjs` 384 KB with `KIT_VERSION = "2.1.0"`
  and the commands `scope:propose`, `assignment:attach`, `integration:start`.
- `app.asar` contains `core-workflow-watch.js`, the mode choice route in
  `core-project-workflow-rpc.js`, and the execution mode card and plan panel
  in the renderer bundle.
- `open "release/mac-arm64/Harness AI.app"` → main and helper processes start.

## Kit bundle smoke on a temporary project

With the built `dist/workflow-kit/workflow.mjs` on a new repository with a
real local identity:

- `install --host harness` → ok, `"host": "harness"` in the config;
- `scope:create` → `EXECUTION_MODE_REQUIRED`;
- `scope:propose` (two parallel-safe tasks, recommended orchestrated) →
  options `orchestrated, sequential, refine`;
- `scope:choose --option orchestrated` → scope created; `assignment:next`
  waits for QUALITY (`DEPENDENCY_PENDING`, `ASSIGNMENT_BARRIER`);
- all Kit commits are signed with the repository-local identity.

## Tests

The whole orchestrated route on real worktrees is covered by
`workflow-integration/src/orchestration-scenario.test.mjs` (parallel
executors, barrier, failed merged checks, crash after the merge commit,
cleanup, DOCS by an executor, delivery in main). The card and the sidebar
plan in the packaged UI and a live Claude orchestrator with subagents are
left to the user's check.
