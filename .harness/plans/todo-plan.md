# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "settings-surface-restyle-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — apply the accepted Settings visual style
  (neutral graphite, three elevation levels, muted borders, muted teal selection
  fill + thin teal border, in-tone reasoning fields) to all provider tabs, and
  give the active provider tab the same selection treatment as the selected model.
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

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Application Shell is UI/client only; it is not source of truth for workflow,
  settings, provider state, reasoning or orchestration. This change is presentation only.
- Any source change updates every related Markdown document in the same commit.
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

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-29)

### Stream: Build And Evidence

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Run required gates, package the app
   for visual verification, and record evidence
   (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record settings surface restyle verification`).
4. [TODO] Git Commit: `Record settings surface restyle verification` (hash: TBD)

## Phase 3 - User Workflow Acceptance (owner: User, updated: 2026-06-29)

### Stream: Retest

5. [TODO] `harness-ai.phase3.stream1.task1` User retests the restyled settings
   tabs in the packaged app (scope: user workflow; expected commit: none).
