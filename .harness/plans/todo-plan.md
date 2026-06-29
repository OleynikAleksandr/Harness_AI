# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-dialog-bubbles-visual-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase12.stream1.task1",
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

3. [DONE] `harness-ai.phase4.stream1.task1` Expose `stopTurn` through the Result: Completed in commit `Expose stopTurn through the electron-host core bridge`.
   electron-host bridge: add the `harness-ai:core:stop-turn` IPC→RPC mapping, the
   `harnessCore.stopTurn` preload method, and the renderer `harnessCore` type
   (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`,
   `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`,
   plus module docs; expected commit: `Expose stopTurn through the electron-host core bridge`).
4. [DONE] Git Commit: `Expose stopTurn through the electron-host core bridge` (hash: self)

## Phase 5 - Input Panel Visual (owner: Codex, updated: 2026-06-29)

### Stream: Input Visual

5. [DONE] `harness-ai.phase5.stream1.task1` Port the reference input field + Result: Completed in commit `Port reference input field and play/stop button visuals`.
   play/stop button visuals and the wait-copy overlay
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-input-textarea.tsx`,
   plus module docs; expected commit: `Port reference input field and play/stop button visuals`).
6. [DONE] Git Commit: `Port reference input field and play/stop button visuals` (hash: self)

## Phase 6 - Stop Wiring (owner: Codex, updated: 2026-06-29)

### Stream: Wiring

7. [DONE] `harness-ai.phase6.stream1.task1` Wire the running-session state and Result: Completed in commit `Wire Stop button to Core stopTurn`.
   the Stop button to `harnessCore.stopTurn`
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`;
   expected commit: `Wire Stop button to Core stopTurn`).
8. [DONE] Git Commit: `Wire Stop button to Core stopTurn` (hash: self)

## Phase 7 - Fix Turn Stop (closeSession + resume) (owner: Codex, updated: 2026-06-29)

### Stream: Stop Rework

9. [DONE] `harness-ai.phase7.stream1.task1` Rework Stop to match the Result: Completed in commit `Rework turn stop to close provider session and resume on next message`.
   reference: `stopTurn` unsubscribes, calls `adapter.closeSession` (which really
   interrupts the in-flight turn — Claude `interrupt`, Kimi `cancel`) and
   invalidates the runtime binding; `sendMessage` rebinds by `resumeSession`
   (oneshot + resume) when the binding is gone; `bindProviderSession` resumes by
   `providerSessionId` instead of always creating. Drop the unused cancel/ignore
   path and `interruptTurn` contract hook
   (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`,
   `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-turn-stop.ts`,
   `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts`,
   plus module docs; expected commit: `Rework turn stop to close provider session and resume on next message`).
10. [DONE] Git Commit: `Rework turn stop to close provider session and resume on next message` (hash: self)

## Phase 8 - Repo Cleanup (owner: Codex, updated: 2026-06-29)

### Stream: Cleanup

11. [DONE] `harness-ai.phase8.stream1.task1` Remove the stray duplicate Result: Completed in commit `Remove stray duplicate preload.cjs from repo root`.
    `preload.cjs` from the repo root (an untracked pre-session copy of the real
    `app-bootstrap/src/preload.cjs`, unused, pulled in by `git add -A`)
    (scope: `preload.cjs`; expected commit: `Remove stray duplicate preload.cjs from repo root`).
12. [DONE] Git Commit: `Remove stray duplicate preload.cjs from repo root` (hash: self)

## Phase 9 - Wait-Copy Visibility (owner: Codex, updated: 2026-06-29)

### Stream: Wait Copy

13. [DONE] `harness-ai.phase9.stream1.task1` Make the "Agent is working…" Result: Completed in commit `Make wait-copy overlay readable on the dark input field`.
    wait-copy overlay readable: brighter colour and higher pulse opacity (it was
    grey 140 at opacity 0.2–0.4 on the dark field, nearly invisible)
    (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
    plus module docs; expected commit: `Make wait-copy overlay readable on the dark input field`).
14. [DONE] Git Commit: `Make wait-copy overlay readable on the dark input field` (hash: self)

## Phase 10 - Disabled Field Opacity (owner: Codex, updated: 2026-06-29)

### Stream: Input Field

15. [DONE] `harness-ai.phase10.stream1.task1` Stop the input field from Result: Completed in commit `Keep input field opaque while the agent works`.
    fading while the agent works: drop the `opacity: 0.55` on the disabled
    textarea (a leftover not in the reference) so the field keeps its dark colour
    and stays visible under the wait-copy overlay
    (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
    plus module docs; expected commit: `Keep input field opaque while the agent works`).
16. [DONE] Git Commit: `Keep input field opaque while the agent works` (hash: self)

## Phase 11 - Fix Kimi Resume Id (owner: Codex, updated: 2026-06-29)

### Stream: Kimi Resume

17. [DONE] `harness-ai.phase11.stream1.task1` Fix resume after Stop for Result: Completed in commit `Normalize Kimi runtime session id prefix on resume`.
    Kimi: `resumeSession` received the runtime `kimi:`-prefixed id and sent it
    straight to the ACP `session/resume`, which only knows the bare provider id
    (`Unknown sessionId: kimi:session_...`). Normalize the `kimi:` prefix in the
    Kimi session lifecycle resume so it matches what `send`/`close` already use
    (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/session/kimi-session-lifecycle.ts`,
    plus module docs; expected commit: `Normalize Kimi runtime session id prefix on resume`).
18. [DONE] Git Commit: `Normalize Kimi runtime session id prefix on resume` (hash: self)

## Phase 12 - Tooling Verification (owner: Codex, updated: 2026-06-29)

### Stream: Build And Evidence

19. [IN_PROGRESS] `harness-ai.phase12.stream1.task1` Run required gates/build and record
    evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected
    commit: `Record input panel and turn stop verification`).
20. [TODO] Git Commit: `Record input panel and turn stop verification` (hash: TBD)

## Phase 13 - User Workflow Acceptance (owner: User, updated: 2026-06-29)

### Stream: Retest

21. [TODO] `harness-ai.phase13.stream1.task1` User retests input visuals + Stop in
    the packaged app (scope: user workflow; expected commit: none).
