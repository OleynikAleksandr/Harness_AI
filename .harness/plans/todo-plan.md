# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reasoning-menu-opacity-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "Record reasoning menu opacity verification",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — the reasoning-level dropdown menu renders
  with a transparent background, so the settings UI shows through it; make it
  fully opaque. Check across all providers.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`

## Confirmed Scope Decisions

- Root cause: `ReasoningEffortSelect` renders its menu via
  `createPortal(..., document.body)`, outside `.settings-backdrop`. The `--ss-*`
  design tokens are declared only on `.settings-backdrop`, so inside the portal
  `var(--ss-card)` / `var(--ss-card-border)` do not resolve and the menu
  background falls back to `transparent`.
- Fix is one shared CSS class (`.settings-reasoning-menu`) used by all providers
  (Claude + Codex), so a single edit covers every provider tab.
- Add opaque fallbacks matching the token values: `background: var(--ss-card,
  #232527)`, `border: 1px solid var(--ss-card-border, #3b3f42)`. No global
  `--pm-*`/`--ss-*` token changes; the rest of the surface is untouched.

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

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record reasoning menu opacity evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record reasoning menu opacity verification`).
4. [TODO] Git Commit: `Record reasoning menu opacity verification` (hash: TBD)
5. [TODO] `harness-ai.phase2.stream1.task2` User retests the reasoning menu across provider tabs in the packaged app (scope: user workflow; expected commit: none).
