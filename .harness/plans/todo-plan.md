# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-subagent-sessions-2026-07-13",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task1",
  "expectedCommitMessage": "feat: make subagent timeline card informational",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `docs/architecture/ClaudeSubagentSessions.md`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/ClaudeSubagentSessions.md`
  - `docs/architecture/SubagentSessions.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md`

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
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.
- Core subagent contracts (`provider-adapter-contract`, `session-request-handler`,
  `session-event-stream`) and `session-sidebar` are NOT modified in this scope:
  provider work lives inside the `claude-provider` module. The shared
  `session-window` timeline card is modified ONLY by the Phase 4 info-panel task.
  Any other shared-module change requires a new plan line first.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-13)

### Stream: Design Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Fix the design: commit `docs/architecture/ClaudeSubagentSessions.md`, the `docs/DOCUMENTATION_INDEX.md` entry, the Codex-only boundary note update in `docs/architecture/SubagentSessions.md`, and this active plan (scope: `docs/architecture/ClaudeSubagentSessions.md, docs/DOCUMENTATION_INDEX.md, docs/architecture/SubagentSessions.md`; expected commit: `plan: bootstrap claude subagent sessions scope`). Result: Completed in commit `plan: bootstrap claude subagent sessions scope`.
2. [DONE] Git Commit: `plan: bootstrap claude subagent sessions scope` (hash: self)

## Phase 2 - Claude Subagent File Source And Normalization (owner: Codex, updated: 2026-07-13)

### Stream: Provider File Layer

3. [DONE] `harness-ai.phase2.stream1.task1` Add the subagent file layer: directory scan of `<sessionId>/subagents/**`, meta.json parsing, incremental JSONL tail (agent transcript + parent toolUseResult extraction) with unit test (scope: `claude-provider/src/reference/subagents/claude-subagent-files.ts, claude-provider/src/reference/subagents/claude-subagent-files.test.mjs, claude-provider/module.md`; expected commit: `feat: add claude subagent file reader`). Result: Completed in commit `feat: add claude subagent file reader`.
4. [DONE] Git Commit: `feat: add claude subagent file reader` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` Add the pure normalizer: meta.json -> subagent_control(spawn)/subagent_session, toolUseResult -> terminal subagent_status, agent JSONL records -> child-channel transcript message events, with unit test (scope: `claude-provider/src/reference/subagents/claude-subagent-event-normalizer.ts, claude-provider/src/reference/subagents/claude-subagent-event-normalizer.test.mjs, claude-provider/module.md`; expected commit: `feat: normalize claude subagent transcript events`). Result: Completed in commit `feat: normalize claude subagent transcript events`.
6. [DONE] Git Commit: `feat: normalize claude subagent transcript events` (hash: self)
7. [DONE] `harness-ai.phase2.stream1.task3` Add the observer coordinator: turn-scoped polling lifecycle, hydration scan on subscribe/resume, serialized hydration and replay-once sets, with unit test (scope: `claude-provider/src/reference/subagents/claude-subagent-observer.ts, claude-provider/src/reference/subagents/claude-subagent-observer.test.mjs, claude-provider/module.md`; expected commit: `feat: add claude subagent observer with hydration`). Result: Completed; committed together with `feat: wire claude subagent events into adapter` (repair note: the knip gate rejects an observer without a consumer, so the observer files landed in the wiring commit).
8. [DONE] Git Commit: `feat: add claude subagent observer with hydration` (hash: superseded — files landed in `feat: wire claude subagent events into adapter`)

## Phase 3 - Adapter Wiring And Cleanup (owner: Codex, updated: 2026-07-13)

### Stream: Adapter Integration

9. [DONE] `harness-ai.phase3.stream1.task1` Wire the observer into `ClaudeProviderAdapter`: observer per bound session, subagent events into the parent channel, transcript into child channels via `dispatchMessage`, pseudo-resume for `agent-<agentId>` child ids (scope: `claude-provider/src/reference/provider/claude-provider-adapter.ts, claude-provider/src/reference/provider/claude-provider-adapter.test.mjs, claude-provider/module.md`; expected commit: `feat: wire claude subagent events into adapter`). Result: Completed in commit `feat: wire claude subagent events into adapter`.
10. [DONE] Git Commit: `feat: wire claude subagent events into adapter` (hash: self)
11. [DONE] `harness-ai.phase3.stream1.task2` Extend transcript cleanup: parent deletion removes the `<sessionId>/` directory (subagents included), child `agent-<agentId>` deletion removes its file pair; update the existing cleanup test (scope: `claude-provider/src/reference/provider/claude-transcript-cleanup.ts, claude-provider/src/reference/provider/claude-transcript-cleanup.test.mjs, claude-provider/module.md`; expected commit: `feat: cascade claude subagent artifact cleanup`). Result: Completed in commit `feat: cascade claude subagent artifact cleanup`.
12. [DONE] Git Commit: `feat: cascade claude subagent artifact cleanup` (hash: self)

## Phase 4 - Subagent Timeline Info Panel (owner: Codex, updated: 2026-07-13)

### Stream: Dialog Card Simplification

13. [IN_PROGRESS] `harness-ai.phase4.stream1.task1` Replace the interactive subagent call card in the dialog timeline (both providers) with a text-only info panel: subagent count + delegated task list; remove open/detach buttons, per-child status rings and metadata rows; controls remain in the sidebar tree only. This task deliberately spans 4 functional files (scope: `session-window/src/session-subagent-timeline.tsx, session-window/src/session-subagent-timeline.test.mjs, session-window/src/session-dialog-panel.tsx, session-window/src/session-window.css` + docs `session-window/module.md, docs/architecture/SubagentSessions.md, docs/architecture/ClaudeSubagentSessions.md`; expected commit: `feat: make subagent timeline card informational`).
14. [TODO] Git Commit: `feat: make subagent timeline card informational` (hash: TBD)

## Phase 5 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-13)

### Stream: Package And Retest

15. [TODO] `harness-ai.phase5.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/claude-subagent-sessions-package-2026-07-13.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record claude subagent sessions package`).
16. [TODO] Git Commit: `docs: record claude subagent sessions package` (hash: TBD)
17. [TODO] `harness-ai.phase5.stream1.task2` User retests in the packaged app: Claude subagent visibility (live spawn info panel, sidebar tree, read-only child dialog, restart recovery, cascade delete) and the informational card for both providers (scope: user workflow; expected commit: none).
