# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "next-session-mode-ui-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase8.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User-approved prototype for Next Session Mode settings, created during the 2026-06-28 design discussion.
- **Prototype reference:** `.harness/runtime/prototypes/next-session-settings-panel.html` (ignored runtime prototype, not a product source file).
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/` may be read for behavior, but code must be adapted into Harness AI Product Part / Cluster / Module ownership.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/application-shell/clusters/session-interface/cluster.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/cluster.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/core-runtime/clusters/intent-normalization/cluster.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md`
  - `product-parts/provider-runtime/clusters/provider-registry/cluster.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- UI is not source of truth: it may only send user input and display Core/shared read-model data.
- Next Session Mode truth, validation and defaults belong to Core Runtime or shared contract modules.
- The default mode is `Native · Raw`; native mode starts without normalization.
- Managed mode supports either explicit user profile selection or Auto Normalizer profile selection, but the model chooser never selects Native vs Managed for the user.
- The contract must not forbid a future combined mode, such as native instructions/tooling plus normalized user request.
- Use existing Harness AI visual language: current dark theme, product color tokens, current font stack, and standard button border radii. Do not introduce a new design system or one-off palette.
- No visible placeholder controls: if a setting is shown in production UI, it must be backed by Core/shared contracts.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- No release/package build starts as a release decision without explicit user confirmation.
- Verification/package builds for the current implementation scope are allowed because this plan asks for them.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Plan Setup

1. [DONE] `harness-ai.phase1.stream1.task1` Create the active scope plan for Next Session Mode implementation (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start next session mode scope`). Result: Completed in commit `chore: start next session mode scope`.
2. [DONE] Git Commit: `chore: start next session mode scope` (hash: self)

## Phase 2 - Core Mode Contract (owner: Codex, updated: 2026-06-28)

### Stream: Core Source Of Truth

3. [DONE] `harness-ai.phase2.stream1.task1` Add the Core/shared Next Session Mode contract and tests for invocation mode, request preprocessing, managed profile selection, defaults and validation (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/core-runtime/clusters/session-runtime/cluster.md, product-parts/core-runtime/product-part.md`; expected commit: `feat: add next session mode contract`). Result: Completed in commit `feat: add next session mode contract`.
4. [DONE] Git Commit: `feat: add next session mode contract` (hash: self)

## Phase 3 - Managed Profile Registry (owner: Codex, updated: 2026-06-28)

### Stream: Provider-Aware Profiles

5. [DONE] `harness-ai.phase3.stream1.task1` Add provider-aware managed profile descriptors/facade, including Auto Normalizer as the first managed selection option and native baseline metadata for comparison (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/**, product-parts/provider-runtime/clusters/provider-registry/cluster.md, product-parts/provider-runtime/product-part.md`; expected commit: `feat: add managed profile registry`). Result: Completed in commit `feat: add managed profile registry`.
6. [DONE] Git Commit: `feat: add managed profile registry` (hash: self)

## Phase 4 - Next Session Mode UI (owner: Codex, updated: 2026-06-28)

### Stream: Product UI

7. [DONE] `harness-ai.phase4.stream1.task1` Implement the sidebar `Next Session Mode` summary and settings panel from the approved prototype, using existing product colors, typography and button radii (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/**, product-parts/application-shell/clusters/session-interface/modules/session-window/**, product-parts/application-shell/clusters/session-interface/cluster.md`; expected commit: `feat: add next session mode picker`). Result: Completed in commit `feat: add next session mode picker`.
8. [DONE] Git Commit: `feat: add next session mode picker` (hash: self)

## Phase 5 - Runtime Wiring (owner: Codex, updated: 2026-06-28)

### Stream: Session Creation

9. [DONE] `harness-ai.phase5.stream1.task1` Wire selected Next Session Mode into session creation through Core, persist next-session defaults in settings, and expose read-only mode metadata for started sessions (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/application-shell/clusters/session-interface/modules/session-window/**`; expected commit: `feat: wire next session mode selection`). Result: Completed in commit `feat: wire next session mode selection`.
10. [DONE] Git Commit: `feat: wire next session mode selection` (hash: self)

## Phase 6 - Documentation And Product Tree (owner: Codex, updated: 2026-06-28)

### Stream: Architecture Sync

11. [DONE] `harness-ai.phase6.stream1.task1` Update architecture documentation and product tree projections for the Next Session Mode contract, profile registry and UI ownership (scope: `docs/architecture/**, .harness/product-tree/**, product-parts/**/module.md`; expected commit: `docs: document next session mode architecture`). Result: Completed in commit `docs: document next session mode architecture`.
12. [DONE] Git Commit: `docs: document next session mode architecture` (hash: self)

## Phase 7 - Tooling Verification And Package (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

13. [DONE] `harness-ai.phase7.stream1.task1` Run required gates, record evidence, build `dist/`, and package the macOS app for user testing (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify next session mode app`). Result: Completed in commit `chore: verify next session mode app`.
14. [DONE] Git Commit: `chore: verify next session mode app` (hash: self)

## Phase 8 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

15. [IN_PROGRESS] `harness-ai.phase8.stream1.task1` User retests the packaged Harness AI app and verifies the next-session mode workflow visually and behaviorally (scope: user workflow; expected commit: none).
