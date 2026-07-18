# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-status-panel-turns-2026-07-18",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-18 — bring the Claude session
  status panel to parity with Kimi by adding the Turns info chip (one
  user request → final agent answer = one turn).
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.test.mjs`
- Investigation finding: Claude already emits `turn_completed` per user turn
  and Core already accumulates `telemetry.turnCount`; the chip is hidden only
  by `providerStatusPanelCapabilities("claude").showTurns === false`. The
  renderer chip and the `session.status.turns` localization key are generic
  and need no changes.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- A final user-verification task uses `completion: user-acceptance` and
  `expected commit: none`. Explicit positive acceptance is recorded with
  `npm run plan:accept -- "<short acceptance note>"`; this marks only that task
  done, creates its acceptance commit and leaves the scope ACTIVE.
- User acceptance does not authorize `plan:archive`. Archival remains a later,
  separate direct user command; after `plan:accept`, ordinary archival must not
  require `--force`.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Claude Status Panel Turns (owner: Codex, updated: 2026-07-18)

### Stream: Capability Contract

1. [DONE] `harness-ai.phase1.stream1.task1` Enable the Turns chip for Claude sessions in the Core status-panel capability contract, cover the capability and the `turn_completed` increment in the telemetry facade test, and sync the module documentation (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md`; expected commit: `feat: show Turns chip in Claude session status panel`). Result: Completed in commit `feat: show Turns chip in Claude session status panel`.
2. [DONE] Git Commit: `feat: show Turns chip in Claude session status panel` (hash: self)

## Phase 2 - Package (owner: Codex, updated: 2026-07-18)

### Stream: Package And Retest

3. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `chore: package Claude status panel Turns build`). Result: Completed in commit `chore: package Claude status panel Turns build`.
4. [DONE] Git Commit: `chore: package Claude status panel Turns build` (hash: self)

## Phase 3 - Plan Orchestrator Multi-Line Hardening (owner: Codex, updated: 2026-07-18)

### Stream: Logical Task Rows

> Plan migration 2026-07-18 (user-approved, variant 2): the plan orchestrator
> silently dropped `expected commit` / `completion: user-acceptance` markers
> written on continuation lines of wrapped task rows and inserted `Result:`
> mid-text. Fix the parser to treat a task row as its first line plus indented
> continuation lines instead of documenting a single-line rule in AGENTS.md.

5. [DONE] `harness-ai.phase3.stream1.task1` Parse multi-line task rows in the plan orchestrator (logical row = first line + indented continuation lines for `NEXT_TASK_REGEX`, `markCommitDone` and `markAcceptanceDone`; `Result:`/acceptance records append at the end of the logical row), cover wrapped-row parsing/Result placement with tests, and sync the plan-format docs (scope: `scripts/plan.mjs, scripts/plan-multiline.test.mjs, AGENTS.md, .harness/plans/todo-plan.template.md`; expected commit: `fix: parse multi-line task rows in plan orchestrator`). Result: Completed in commit `fix: parse multi-line task rows in plan orchestrator`.
6. [DONE] Git Commit: `fix: parse multi-line task rows in plan orchestrator` (hash: self)

## Phase 4 - User Acceptance (owner: User, updated: 2026-07-18)

### Stream: Packaged Retest

7. [IN_PROGRESS] `harness-ai.phase4.stream1.task1` User retests the Claude session status panel in the packaged app: the Turns chip appears beside Cache and advances by one per completed user request → agent answer cycle (completion: user-acceptance; scope: user workflow; expected commit: none).
