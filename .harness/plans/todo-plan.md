# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-status-panel-turns-2026-07-18",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase6.stream1.task2",
  "expectedCommitMessage": "chore: package Grok panel Rollback removal build",
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

7. [DONE] `harness-ai.phase4.stream1.task1` User retests the Claude session status panel in the packaged app: the Turns chip appears beside Cache and advances by one per completed user request → agent answer cycle (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — Claude Turns verified in packaged app: chip shows and counts turns correctly Acceptance Commit: `chore: record plan acceptance claude-status-panel-turns-2026-07-18`.

## Phase 5 - Codex Panel Rollback Removal (owner: Codex + User, updated: 2026-07-18)

### Stream: Panel Parity

> Added 2026-07-18 by direct user order after accepting the Claude Turns
> stream: remove the Rollback block from the Codex session status panel so it
> matches the Claude/Kimi panels (Model / effort / Tokens / Cache / Turns).
> Investigation finding: the Rollback button renders solely from
> `statusPanelCapabilities.rollbackPreserveFirstUserTurns !== null`; the same
> `ROLLBACK_PROVIDER_IDS` set also feeds the `Cache: 0` anchor and the
> Cache/Turns visibility, so the sets must be split. Core rollback plumbing
> (`session-rollback.ts`, codex `thread/rollback`) stays wired but unreachable
> from UI; Grok keeps the full Rollback contract.

8. [DONE] `harness-ai.phase5.stream1.task1` Split the rollback-action and cache-anchor provider sets in the Core status-panel capability contract so Codex keeps Cache/Turns and the `Cache: 0` anchor but no longer publishes `rollbackPreserveFirstUserTurns`, update the telemetry facade test, and sync the panel-contract docs (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, docs/architecture/CodexCacheAnchorThread.md`; expected commit: `feat: hide Rollback control from Codex session status panel`). Result: Completed in commit `feat: hide Rollback control from Codex session status panel`.
9. [DONE] Git Commit: `feat: hide Rollback control from Codex session status panel` (hash: self)
10. [DONE] `harness-ai.phase5.stream1.task2` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `chore: package Codex panel Rollback removal build`). Result: Completed in commit `chore: package Codex panel Rollback removal build`.
11. [DONE] Git Commit: `chore: package Codex panel Rollback removal build` (hash: self)
12. [DONE] `harness-ai.phase5.stream1.task3` User retests the Codex session status panel in the packaged app: no Rollback block; Model/effort/Tokens/Cache/Turns chips stay intact with `Cache: 0` from session start (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — Codex panel verified in packaged app: no Rollback block, Cache/Turns intact Acceptance Commit: `chore: record plan acceptance claude-status-panel-turns-2026-07-18`.

## Phase 6 - Grok Panel Rollback Removal (owner: Codex + User, updated: 2026-07-18)

### Stream: Panel Parity

> Added 2026-07-18 by direct user order after accepting the Codex stream ("у
> Grok тоже Rollback надо убрать... Убери, и собери новый пакет!"): hide the
> Rollback block from the Grok session status panel too, so every provider
> panel shows only Model / effort / Tokens / Cache / Turns. The rollback-action
> set becomes empty; the `Cache: 0` anchor and Cache/Turns chips stay for
> Codex and Grok, and all Core rollback plumbing stays wired behind the
> capability.

13. [DONE] `harness-ai.phase6.stream1.task1` Empty the rollback-action provider set in the Core status-panel capability contract so Grok also publishes `rollbackPreserveFirstUserTurns: null`, keep the `Cache: 0` anchor and Cache/Turns chips for Codex/Grok, update the telemetry facade test, and sync the panel-contract docs (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `feat: hide Rollback control from Grok session status panel`). Result: Completed in commit `feat: hide Rollback control from Grok session status panel`.
14. [DONE] Git Commit: `feat: hide Rollback control from Grok session status panel` (hash: self)
15. [IN_PROGRESS] `harness-ai.phase6.stream1.task2` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `chore: package Grok panel Rollback removal build`).
16. [TODO] Git Commit: `chore: package Grok panel Rollback removal build` (hash: TBD)
17. [TODO] `harness-ai.phase6.stream1.task3` User retests the Grok session status panel in the packaged app: no Rollback block; Model/effort/Tokens/Cache/Turns chips stay intact with `Cache: 0` from session start (completion: user-acceptance; scope: user workflow; expected commit: none).
