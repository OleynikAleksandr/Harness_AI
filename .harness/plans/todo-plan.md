# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-dialog-bubbles-visual-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — port the reference (CodeAI Hub) session
  dialog visuals into Harness AI: bubbles, panel backdrop, then the input field
  + play/stop buttons + wait-copy overlay, with a working Stop turn action.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - Reference visual source (read-only): `CodeAI-Hub/media/session-view.css`
    (`.session-input*`), `CodeAI-Hub/src/client/ui/src/session/input-panel.tsx`,
    `input-play-stop-button.tsx`, `input-panel-placeholders.ts`.

## Confirmed Scope Decisions

- Dialog bubbles + panel backdrop: DONE (phases 1-2).
- Input field + play/stop buttons: exact copy of the reference `.session-input*`
  visuals (compact textarea padding 10/12, font 13/lh20, bg rgba(30,30,30,1),
  radius 4, focused bg rgba(32,32,32,1), orange drag overlay, 36px action button,
  play ▶ / red stop square).
- Wait-copy overlay: pulsing "Agent is working… Please wait." over the field
  while the turn runs.
- Stop turn: WORKING via a Core-owned cancel — Stop marks the turn cancelled,
  flips turn-state to idle (input unlocks), and Core drops the late provider
  output for that turn until the next user message. The adapter contract gains an
  optional `interruptTurn` hook; real per-provider process/transport interruption
  is a later per-adapter increment (the 7 adapters are closed working modules).

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/client only; Core owns turn/session state. Stop is a
  Core action; the renderer only sends the intent and reflects turn-state.
- Any source change updates every related Markdown document in the same commit.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Dialog Bubble Visual Port (owner: Codex, updated: 2026-06-29)

### Stream: Dialog Bubbles

1. [DONE] `harness-ai.phase1.stream1.task1` Port reference dialog bubble visuals (provider tint, thinking, system-ui). Result: commit `Port reference dialog bubble visuals to session window`.
2. [DONE] Git Commit: `Port reference dialog bubble visuals to session window` (hash: self)

## Phase 2 - Session Panel Backdrop (owner: Codex, updated: 2026-06-29)

### Stream: Panel Backdrop

1. [DONE] `harness-ai.phase2.stream1.task1` Reference grey panel backdrop + 1px chrome. Result: commit `Align session panels with reference grey backdrop and 1px chrome`.
2. [DONE] Git Commit: `Align session panels with reference grey backdrop and 1px chrome` (hash: self)

## Phase 3 - Turn Stop Backend (owner: Codex, updated: 2026-06-29)

### Stream: Core Stop

1. [DONE] `harness-ai.phase3.stream1.task1` Add a Core-owned `stopTurn`: Result: Completed in commit `Add Core-owned turn stop with adapter interrupt hook`.
   mark the turn cancelled, publish idle turn-state, drop late provider output
   for the cancelled turn until the next user message, call an optional adapter
   `interruptTurn` hook, route a `stop-turn` RPC method, and decompose the
   over-500-line handler by extracting turn cancellation and live-tail display
   projection into helper modules
   (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`,
   `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-turn-cancellation.ts`,
   `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-live-tail-dedupe.ts`,
   `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts`,
   `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`,
   plus module docs; expected commit: `Add Core-owned turn stop with adapter interrupt hook`).
2. [DONE] Git Commit: `Add Core-owned turn stop with adapter interrupt hook` (hash: self)

## Phase 4 - Stop IPC Bridge (owner: Codex, updated: 2026-06-29)

### Stream: Bridge

3. [IN_PROGRESS] `harness-ai.phase4.stream1.task1` Expose `stopTurn` through the
   electron-host bridge: add the `harness-ai:core:stop-turn` IPC→RPC mapping and
   the `harnessCore.stopTurn` preload method
   (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`,
   `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs`,
   plus module docs; expected commit: `Expose stopTurn through the electron-host core bridge`).
4. [TODO] Git Commit: `Expose stopTurn through the electron-host core bridge` (hash: TBD)

## Phase 5 - Input Panel Visual (owner: Codex, updated: 2026-06-29)

### Stream: Input Visual

5. [TODO] `harness-ai.phase5.stream1.task1` Port the reference input field +
   play/stop button visuals and the wait-copy overlay
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-input-textarea.tsx`,
   plus module docs; expected commit: `Port reference input field and play/stop button visuals`).
6. [TODO] Git Commit: `Port reference input field and play/stop button visuals` (hash: TBD)

## Phase 6 - Stop Wiring (owner: Codex, updated: 2026-06-29)

### Stream: Wiring

7. [TODO] `harness-ai.phase6.stream1.task1` Wire the running-session state and
   the Stop button to `harnessCore.stopTurn`
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`;
   expected commit: `Wire Stop button to Core stopTurn`).
8. [TODO] Git Commit: `Wire Stop button to Core stopTurn` (hash: TBD)

## Phase 7 - Tooling Verification (owner: Codex, updated: 2026-06-29)

### Stream: Build And Evidence

9. [TODO] `harness-ai.phase7.stream1.task1` Run required gates/build and record
   evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected
   commit: `Record input panel and turn stop verification`).
10. [TODO] Git Commit: `Record input panel and turn stop verification` (hash: TBD)

## Phase 8 - User Workflow Acceptance (owner: User, updated: 2026-06-29)

### Stream: Retest

11. [TODO] `harness-ai.phase8.stream1.task1` User retests input visuals + Stop in
    the packaged app (scope: user workflow; expected commit: none).
