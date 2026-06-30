# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reasoning-menu-opacity-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task1",
  "expectedCommitMessage": "Record reasoning menu contrast verification",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — visual polish of the reasoning-level
  dropdown menu: (1) make it fully opaque, then (2) lift its surface/border above
  the model cards so it no longer blends into the surface below it. Check across
  all providers.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`

## Confirmed Scope Decisions

- Root cause (opacity): `ReasoningEffortSelect` renders its menu via
  `createPortal(..., document.body)`, outside `.settings-backdrop`, so the
  `--ss-*` tokens declared there do not resolve and the background fell back to
  `transparent`.
- Fix is one shared CSS class (`.settings-reasoning-menu`) used by all providers
  (Claude + Codex), so a single edit covers every provider tab.
- Because the menu always renders in the portal (tokens never resolve), it uses
  literal popup-elevation values, not `--ss-*` tokens: surface `#313438` and
  border `#4d5258`, a few steps lighter than the model cards (`#232527`), so the
  popup reads above the surface below it. No global `--pm-*`/`--ss-*` token
  changes; the rest of the surface is untouched.

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

## Phase 1 - Reasoning Menu Opacity Fix (owner: Codex, updated: 2026-06-30)

### Stream: Provider Settings UI

1. [DONE] `harness-ai.phase1.stream1.task1` Give the portal-rendered reasoning menu opaque `--ss-*` fallbacks so its background and border stay solid outside `.settings-backdrop` for every provider (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `Make reasoning effort menu opaque via token fallbacks`). Result: Completed in commit `Make reasoning effort menu opaque via token fallbacks`.
2. [DONE] Git Commit: `Make reasoning effort menu opaque via token fallbacks` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

3. [DONE] `harness-ai.phase2.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record reasoning menu opacity evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record reasoning menu opacity verification`). Result: Completed in commit `Record reasoning menu opacity verification`.
4. [DONE] Git Commit: `Record reasoning menu opacity verification` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` User retests the reasoning menu across provider tabs in the packaged app (scope: user workflow; expected commit: none). Result: User confirmed the menu is opaque in the packaged app (screenshot).

## Phase 3 - Reasoning Menu Contrast (owner: Codex, updated: 2026-06-30)

### Stream: Provider Settings UI

6. [DONE] `harness-ai.phase3.stream1.task1` Lighten the reasoning menu surface (#313438) and border (#4d5258) a few steps above the model cards so the popup reads above the surface below it, for every provider (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `Lighten reasoning menu surface and border for contrast`). Result: Completed in commit `Lighten reasoning menu surface and border for contrast`.
7. [DONE] Git Commit: `Lighten reasoning menu surface and border for contrast` (hash: self)

## Phase 4 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

8. [IN_PROGRESS] `harness-ai.phase4.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record reasoning menu contrast evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record reasoning menu contrast verification`).
9. [TODO] Git Commit: `Record reasoning menu contrast verification` (hash: TBD)
10. [TODO] `harness-ai.phase4.stream1.task2` User retests the reasoning menu contrast in the packaged app (scope: user workflow; expected commit: none).
