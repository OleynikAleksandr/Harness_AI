# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reasoning-effort-ui-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task3",
  "expectedCommitMessage": "feat: filter reasoning effort levels per claude model",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — fix reasoning-effort dropdown overlay (Claude + Codex) and align reasoning levels with real Claude CLI capabilities.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md`
- **Verified facts (Claude CLI v2.1.195 + official docs):** Opus efforts = low/medium/high/xhigh/max; Sonnet = low/medium/high/max (no xhigh); Haiku = no effort selection. "Ultracode" is a session orchestration mode (xhigh + dynamic workflows), not a model effort level, but appears in the /effort menu for xhigh-capable models (Opus). User decisions: add Ultracode as a menu item only for Opus; filter levels per model.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- No release/package build starts as a release decision without explicit user confirmation (user already authorized the repackage for this scope).
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Reasoning Effort Fix (owner: Codex, updated: 2026-06-28)

### Stream: Implementation

1. [DONE] `harness-ai.phase1.stream1.task1` Add `ultracode` to the Core `ReasoningEffort` contract and validation whitelist (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.ts`; docs: settings-store `module.md`, settings-and-localization `cluster.md`, core-runtime `product-part.md`; expected commit: `feat: add ultracode reasoning effort to core contract`). Result: Completed in commit `feat: add ultracode reasoning effort to core contract`.
2. [DONE] Git Commit: `feat: add ultracode reasoning effort to core contract` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task2` Render the reasoning-effort menu through a React portal (fixes overlay clipping for Claude and Codex), add the `Ultracode` catalog option, and accept an optional per-model `values` prop (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/reasoning-effort-select.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-model-options.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css`; docs: provider-settings-ui `module.md`, settings-surface `cluster.md`, application-shell `product-part.md`; expected commit: `fix: render reasoning effort menu in a portal`). Result: Completed in commit `fix: render reasoning effort menu in a portal`.
4. [DONE] Git Commit: `fix: render reasoning effort menu in a portal` (hash: self)
5. [IN_PROGRESS] `harness-ai.phase1.stream1.task3` Add the Core per-model effort capability map and wire Claude/Codex cards to it (Opus full + ultracode, Sonnet without xhigh, Haiku hides the selector; Codex keeps its set without ultracode) (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/claude-default-model-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/codex-default-model-card.tsx`; docs: settings-store `module.md`, provider-settings-ui `module.md`; expected commit: `feat: filter reasoning effort levels per claude model`).
6. [TODO] Git Commit: `feat: filter reasoning effort levels per claude model` (hash: TBD)

## Phase 2 - Tooling Verification (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

7. [TODO] `harness-ai.phase2.stream1.task1` Run required gates, then `npm run build` and `npm run package:mac`, record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reasoning effort ui and repackage app`).
8. [TODO] Git Commit: `chore: verify reasoning effort ui and repackage app` (hash: TBD)

## Phase 3 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

9. [TODO] `harness-ai.phase3.stream1.task1` User reopens Settings, verifies the reasoning dropdown overlays correctly for Claude and Codex, and confirms per-model levels (scope: user workflow; expected commit: none).
