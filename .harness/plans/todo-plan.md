# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "ui-typography-hierarchy-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase6.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — apply one text-hierarchy system across the
  whole UI, then two polish fixes: (1) remove the duplicated model id from every
  provider's model card, (2) keep the "Start New Session" button upright (no
  italic inherited from the sidebar section header).
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

## Confirmed Scope Decisions

- Text hierarchy (delivered): primary roles semi-bold + brighter
  (`--pm-text-primary` `#f1f3f5`); secondary roles italic + thin + dimmed
  (`--pm-text-muted` `#767d86`). Settings layer scoped under `.settings-backdrop`;
  session layer wins via bare-element resets being 0,0,1.
- Polish 1: the model card showed `model-title` (label) and `model-id` (id) which
  duplicate each other (e.g. "Sonnet" / "sonnet"); remove the `model-id` span in
  the Claude, Codex and reference model cards. OpenRouter keeps its `model-id`
  span (it carries routing/metric text, not a duplicate name).
- Polish 2: the "Start New Session" button lives inside `.sidebar-section-header`
  (which is now italic), so it inherited the slant; reset
  `.start-new-session-button` to `font-style: normal`.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Application Shell is UI/client only; it is not source of truth for workflow,
  settings, provider state, reasoning or orchestration. This change is presentation only.
- Any source change updates every related Markdown document in the same commit.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); this plan never includes a separate phase to run gates.
- No release/package build starts as a release decision without explicit user confirmation.
- Verification/package builds for the current implementation scope are allowed when this plan asks for them.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Typography System Implementation (owner: Codex, updated: 2026-06-30)

### Stream: Settings Surface

1. [DONE] `harness-ai.phase1.stream1.task1` Lift tokens and apply the primary semi-bold / secondary italic-thin system across every settings tab (scope: settings-surface.css, session-window.css tokens, provider-settings-ui/module.md; expected commit: `Add text hierarchy to settings surface and global tokens`). Result: Completed in commit `Add text hierarchy to settings surface and global tokens`.
2. [DONE] Git Commit: `Add text hierarchy to settings surface and global tokens` (hash: self)

## Phase 2 - Settings Specificity Fix (owner: Codex, updated: 2026-06-30)

### Stream: Settings Surface

3. [DONE] `harness-ai.phase2.stream1.task1` Scope the settings typography layer under `.settings-backdrop` so primary roles outrank the element weight reset (scope: settings-surface.css, provider-settings-ui/module.md; expected commit: `Scope settings typography layer to outrank the weight reset`). Result: Completed in commit `Scope settings typography layer to outrank the weight reset`.
4. [DONE] Git Commit: `Scope settings typography layer to outrank the weight reset` (hash: self)

## Phase 3 - Session Surface (owner: Codex, updated: 2026-06-30)

### Stream: Session Window

5. [DONE] `harness-ai.phase3.stream1.task1` Apply the same hierarchy to the session interface, message panels and the left sidebar (scope: session-window.css, session-window/module.md; expected commit: `Apply text hierarchy to session window and sidebar`). Result: Completed in commit `Apply text hierarchy to session window and sidebar`.
6. [DONE] Git Commit: `Apply text hierarchy to session window and sidebar` (hash: self)

## Phase 4 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

7. [DONE] `harness-ai.phase4.stream1.task1` Package the app and record typography verification evidence (scope: docs/evidence/**, todo-plan.md; expected commit: `Record UI typography hierarchy verification`). Result: Completed in commit `Record UI typography hierarchy verification`.
8. [DONE] Git Commit: `Record UI typography hierarchy verification` (hash: self)
9. [DONE] `harness-ai.phase4.stream1.task2` User retests the text hierarchy in the packaged app (scope: user workflow; expected commit: none). Result: User accepted the hierarchy ("pока оставим") and raised two polish items handled in Phase 5.

## Phase 5 - Polish Fixes (owner: Codex, updated: 2026-06-30)

### Stream: Provider Settings UI

10. [DONE] `harness-ai.phase5.stream1.task1` Remove the duplicate `model-id` span from the Claude, Codex and reference model cards (label already shows the name; OpenRouter keeps its metric id) (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/claude-default-model-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/codex-default-model-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-controls.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `Remove duplicate model id from provider model cards`). Result: Completed in commit `Remove duplicate model id from provider model cards`.
11. [DONE] Git Commit: `Remove duplicate model id from provider model cards` (hash: self)

### Stream: Session Window

12. [DONE] `harness-ai.phase5.stream1.task2` Reset `.start-new-session-button` to `font-style: normal` so it does not inherit the italic from `.sidebar-section-header` (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `Keep the start-new-session button upright`). Result: Completed in commit `Keep the start-new-session button upright`.
13. [DONE] Git Commit: `Keep the start-new-session button upright` (hash: self)

## Phase 6 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

14. [DONE] `harness-ai.phase6.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record polish verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record model card and button polish verification`). Result: Completed in commit `Record model card and button polish verification`.
15. [DONE] Git Commit: `Record model card and button polish verification` (hash: self)
16. [IN_PROGRESS] `harness-ai.phase6.stream1.task2` User retests the model cards and the Start New Session button in the packaged app (scope: user workflow; expected commit: none).
