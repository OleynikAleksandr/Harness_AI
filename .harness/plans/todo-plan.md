# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "settings-surface-restyle-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — (1) apply the accepted Settings visual
  style to all provider tabs, and (2) align the plan phase model so plans no
  longer carry a redundant gate-verification phase (gates already run on every
  commit).
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`

## Confirmed Scope Decisions

- Style lives in the shared `settings-surface.css` (all providers use the same
  classes: `.settings-card`, `.settings-model-row(.active)`,
  `.settings-reasoning-trigger`, `.settings-tab.active`), so one CSS file
  restyles every tab.
- New colours are scoped via local `--ss-*` custom properties on
  `.settings-backdrop`; global `--pm-*` tokens in `session-window.css` are NOT
  changed, so the rest of the app (session UI) is untouched.
- Three elevation levels: dialog/content (darkest, `#141516`) -> section block
  `.settings-card` (`#1c1d1e`) -> model cards `.settings-model-row` (`#232527`).
- Selected model: muted teal fill `#20302a` + thin muted teal border `#356a59`
  + teal radio dot. The bright `#42c9a2` 2px-style border is removed.
- Reasoning field: in-tone with its row (one step lighter than the card), no
  near-black `#0e1521`; teal-tinted variant on the active model.
- Active provider tab (`.settings-tab.active`) gets the same selection treatment.
- Model id row is left as-is (content, out of this visual scope).
- Plan phase model: quality gates run automatically on every commit, so plans do
  not include a separate gate-run phase; the final phase is package + user
  acceptance, used only when the change is visible in the packaged app.

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

## Phase 1 - Settings Surface Restyle (owner: Codex, updated: 2026-06-29)

### Stream: Provider Settings UI

1. [DONE] `harness-ai.phase1.stream1.task1` Restyle the shared settings Result: Completed in commit `Restyle provider settings surface with neutral elevation and muted teal selection`.
   surface: neutral graphite palette with three elevation levels, muted/value-matched
   borders, muted teal selection fill + thin teal border + teal radio for the
   selected model, in-tone reasoning fields (no near-black), borderless toggle
   rows, and the same selection treatment for the active provider tab
   (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css`,
   plus module docs; expected commit: `Restyle provider settings surface with neutral elevation and muted teal selection`).
2. [DONE] Git Commit: `Restyle provider settings surface with neutral elevation and muted teal selection` (hash: self)

## Phase 2 - Planning Model Alignment (owner: Codex, updated: 2026-06-30)

### Stream: Plan Process

3. [DONE] `harness-ai.phase2.stream1.task1` Drop the redundant gate-verification phase from the plan template and current plan, and align AGENTS.md section 6 so plans run gates on every commit and keep only a package + acceptance final phase (scope: `.harness/plans/todo-plan.template.md, AGENTS.md, .harness/plans/todo-plan.md`; expected commit: `Align plan phase model: drop redundant gate verification phase`). Result: Completed in commit `Align plan phase model: drop redundant gate verification phase`.
4. [DONE] Git Commit: `Align plan phase model: drop redundant gate verification phase` (hash: self)

## Phase 3 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

5. [DONE] `harness-ai.phase3.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record settings restyle visual verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record settings surface restyle verification`). Result: Completed in commit `Record settings surface restyle verification`.
6. [DONE] Git Commit: `Record settings surface restyle verification` (hash: self)
7. [IN_PROGRESS] `harness-ai.phase3.stream1.task2` User retests the restyled settings tabs in the packaged app (scope: user workflow; expected commit: none).
