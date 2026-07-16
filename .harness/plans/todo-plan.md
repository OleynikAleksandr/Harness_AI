# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-model-selection-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task2",
  "expectedCommitMessage": "feat: route selected Kimi model",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-16 — expose all three models
  verified for the current Kimi Coding Plan key (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`) in Settings and every existing model
  display/selection surface, and route the selected session model to Kimi.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/UniversalClient.md`
  - `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/module.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Application Shell displays and edits the Core/provider-runtime model truth;
  it does not invent accepted Kimi model ids.
- Any source change updates every related Markdown document in the same commit.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- Scope closeout/archival is user-directed only.
- The packaged build is part of this user-requested visible application change;
  user acceptance remains a separate task and does not close the scope.
- Quality gates run automatically on every commit; do not add a separate gate task.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-16)

### Stream: Plan Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the Kimi model-selection scope (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: bootstrap Kimi model selection scope`). Result: Completed in commit `plan: bootstrap Kimi model selection scope`.
2. [DONE] Git Commit: `plan: bootstrap Kimi model selection scope` (hash: self)

## Phase 2 - Core Kimi Model Contract (owner: Codex, updated: 2026-07-16)

### Stream: Catalog And Routing

3. [DONE] `harness-ai.phase2.stream1.task1` Replace the single-model Kimi assumption with the verified three-model provider catalog and normalize persisted defaults against that catalog; cover the contract with focused tests and synchronize the provider/settings architecture docs (scope: `provider-descriptor/src/provider-descriptor-facade.ts, settings-store/src/settings-normalization.ts` + paired tests/docs; expected commit: `feat: add Kimi coding model catalog`). Result: Completed in commit `feat: add Kimi coding model catalog`.
4. [DONE] Git Commit: `feat: add Kimi coding model catalog` (hash: self)
5. [IN_PROGRESS] `harness-ai.phase2.stream1.task2` Route the immutable Core session model through the Kimi universal-client adapter instead of pinning every turn to `kimi-for-coding`; cover default and explicit-model requests and synchronize adapter/runtime docs (scope: `kimi-client-provider/src/kimi-client-provider-facade.ts, kimi-client-provider/src/kimi-client-provider.test.mjs, core-runtime-process/src/core-provider-adapter-registration.ts` + related docs; expected commit: `feat: route selected Kimi model`).
6. [TODO] Git Commit: `feat: route selected Kimi model` (hash: TBD)

## Phase 3 - Kimi Model Selection UI (owner: Codex, updated: 2026-07-16)

### Stream: Settings And Session Picker

7. [TODO] `harness-ai.phase3.stream1.task1` Add the three Core-owned Kimi options to the Settings default-model card and make the new-session provider card display/use the selected Kimi default; cover both surfaces with focused tests and synchronize UI docs (scope: `provider-settings-ui/src/settings-model-options.ts, provider-settings-ui/src/settings-tab-content.tsx, session-window/src/provider-picker.tsx` + paired tests/docs; expected commit: `feat: add Kimi model selection controls`).
8. [TODO] Git Commit: `feat: add Kimi model selection controls` (hash: TBD)

## Phase 4 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-16)

### Stream: Package And Retest

9. [TODO] `harness-ai.phase4.stream1.task1` Package the app for user verification (`npm run package:mac`) and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi model selection build`).
10. [TODO] Git Commit: `chore: package Kimi model selection build` (hash: TBD)
11. [TODO] `harness-ai.phase4.stream1.task2` User retests all three Kimi choices in Settings and confirms the selected model appears in the new-session card and is used by a live session (completion: user-acceptance; scope: user workflow; expected commit: none).
