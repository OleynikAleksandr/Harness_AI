# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "ui-typography-hierarchy-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task1",
  "expectedCommitMessage": "Apply text hierarchy to session window and sidebar",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — apply one text-hierarchy system across the
  whole UI (all settings tabs, the session interface, panels, and the left
  sidebar). Reference chosen from prototypes: primary text semi-bold, brighter,
  consistent size; secondary text italic, thin, dimmed but readable.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

## Confirmed Scope Decisions

- One shared system, applied to both UI CSS files (`settings-surface.css` and
  `session-window.css`); no new dependencies, no font pinned.
- Primary text (section titles, model/provider names, select values, tab labels,
  checkbox labels): `font-weight: 500`, brighter via `--pm-text-primary`
  (`#e7eaee` -> `#f1f3f5`). Sizes kept roughly equal across labels; targeted size
  bumps only happen later on explicit user request.
- Secondary text (descriptions, helper copy, hints, meta, status notes): italic,
  `font-weight: 300`, dimmed via `--pm-text-muted` (`#a8b0ba` -> `#767d86`),
  still readable on the dark surface.
- Field labels (e.g. "Reasoning", "UI Translation Engine") stay semi-bold and
  mid-dim (an anchor), not italic, so a field is easy to locate.
- Specificity: the settings layer is scoped under `.settings-backdrop` to outrank
  the `.settings-backdrop button/h*/strong { font-weight: 300 }` reset (0,1,1).
  The session-window reset uses bare element selectors (0,0,1), so plain class
  selectors there already win without a prefix.
- Italic on secondary may render as synthetic slant depending on the installed
  font (stack starts with Space Grotesk, which has no italic); verified visually
  in the packaged app, including localized (Cyrillic) text.

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

1. [DONE] `harness-ai.phase1.stream1.task1` Lift `--pm-text-primary` and dim `--pm-text-muted` tokens, then apply the primary semi-bold / secondary italic-thin system across every settings tab (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `Add text hierarchy to settings surface and global tokens`). Result: Completed in commit `Add text hierarchy to settings surface and global tokens`.
2. [DONE] Git Commit: `Add text hierarchy to settings surface and global tokens` (hash: self)

## Phase 2 - Settings Specificity Fix (owner: Codex, updated: 2026-06-30)

### Stream: Settings Surface

3. [DONE] `harness-ai.phase2.stream1.task1` Scope the settings typography layer under `.settings-backdrop` so primary roles (tab labels, h-level titles) outrank the element-level `font-weight: 300` reset and actually go semi-bold (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `Scope settings typography layer to outrank the weight reset`). Result: Completed in commit `Scope settings typography layer to outrank the weight reset`.
4. [DONE] Git Commit: `Scope settings typography layer to outrank the weight reset` (hash: self)

## Phase 3 - Session Surface (owner: Codex, updated: 2026-06-30)

### Stream: Session Window

5. [IN_PROGRESS] `harness-ai.phase3.stream1.task1` Apply the same hierarchy to the session interface, message panels and the left sidebar (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `Apply text hierarchy to session window and sidebar`).
6. [TODO] Git Commit: `Apply text hierarchy to session window and sidebar` (hash: TBD)

## Phase 4 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

7. [TODO] `harness-ai.phase4.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record typography verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record UI typography hierarchy verification`).
8. [TODO] Git Commit: `Record UI typography hierarchy verification` (hash: TBD)
9. [TODO] `harness-ai.phase4.stream1.task2` User retests the text hierarchy across all tabs, the session interface and the sidebar in the packaged app (scope: user workflow; expected commit: none).
