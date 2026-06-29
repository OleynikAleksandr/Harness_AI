# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-dialog-bubbles-visual-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — port the reference (CodeAI Hub) session
  dialog visuals into Harness AI: first the message bubbles, then the panel
  backdrop / chrome.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - Reference visual source (read-only): `CodeAI-Hub/media/session-view.css`
    (`.session-dialog__message*` and `.session-panel` rules).

## Confirmed Scope Decisions

- Palette: exact copy of the reference provider palette (user `#2c3b52`,
  Claude `#ff9105`, Codex `#01f0d8`, Kimi `#77d6ff`, thinking muted). Providers
  without a reference tint use the neutral assistant background. Deliberate
  departure from the unified Teal Studio accent in the dialog zone only.
- Fonts: reference system-ui stack in the dialog zone; sizes/weights 1:1.
- Membership: bubble visuals only (plain text, thinking always expanded, no
  markdown).
- Panel backdrop (all four `.session-panel` surfaces — id bar, dialog, input,
  status): reference grey `rgba(40,41,42,1)` background, clean `1px solid
  rgba(67,68,70,1)` chrome, no `box-shadow` (the previous inset ring read as a
  double outline). Outer app shell background is unchanged.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/client only. It is not source of truth for workflow,
  settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Dialog Bubble Visual Port (owner: Codex, updated: 2026-06-29)

### Stream: Dialog Bubbles

1. [DONE] `harness-ai.phase1.stream1.task1` Port the reference dialog Result: Completed in commit `Port reference dialog bubble visuals to session window`.
   bubble visual contract into the session window: replace `.session-message*`
   rules with the reference `.session-dialog__message*` rules (scroll geometry,
   user/system/assistant + provider tint, thinking visuals, header/role/content/
   timestamp, system-ui font in the dialog zone), update `MessageBubble` /
   `DialogPanel` to emit the new classes and resolve thinking + provider tint,
   and thread `providerId` from the facade
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`,
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`,
   plus `module.md`; expected commit: `Port reference dialog bubble visuals to session window`).
2. [DONE] Git Commit: `Port reference dialog bubble visuals to session window` (hash: self)

## Phase 2 - Session Panel Backdrop (owner: Codex, updated: 2026-06-29)

### Stream: Panel Backdrop

1. [DONE] `harness-ai.phase2.stream1.task1` Align the shared Result: Completed in commit `Align session panels with reference grey backdrop and 1px chrome`.
   `.session-panel` surface (all four session panels) with the reference: grey
   `rgba(40,41,42,1)` background, clean `1px solid rgba(67,68,70,1)` border, and
   remove the `box-shadow` (inset ring + drop shadow) so the chrome reads as a
   single 1px outline
   (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`,
   plus `module.md`; expected commit: `Align session panels with reference grey backdrop and 1px chrome`).
2. [DONE] Git Commit: `Align session panels with reference grey backdrop and 1px chrome` (hash: self)

## Phase 3 - Tooling Verification (owner: Codex, updated: 2026-06-29)

### Stream: Build And Evidence

3. [IN_PROGRESS] `harness-ai.phase3.stream1.task1` Run required gates/build and record
   evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected
   commit: `Record dialog visual port verification`).
4. [TODO] Git Commit: `Record dialog visual port verification` (hash: TBD)

## Phase 4 - User Workflow Acceptance (owner: User, updated: 2026-06-29)

### Stream: Retest

5. [TODO] `harness-ai.phase4.stream1.task1` User retests the dialog visuals in
   the packaged app (scope: user workflow; expected commit: none).
