# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "native-capture-artifact-cleanup-2026-07-09",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request to make Native Request Capture artifacts
  readable and profile-verification oriented across native and universal-client
  providers.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/cluster.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving
  `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting
  a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed
  when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-07-09)

### Stream: Recovery Owner

1. [DONE] `harness-ai.phase0.stream1.task1` Create the active scope for Native Request Capture artifact cleanup (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: create native capture artifact cleanup scope`). Result: Completed in commit `plan: create native capture artifact cleanup scope`.
2. [DONE] Git Commit: `plan: create native capture artifact cleanup scope` (hash: self)

## Phase 1 - Capture Artifact Contract (owner: Codex, updated: 2026-07-09)

### Stream: Readable Profile Payloads

3. [DONE] `harness-ai.phase1.stream1.task1` Separate raw captured upstream request records from diagnostic records, render markdown around profile-relevant groups with readable text formatting, and align Settings copy with forward-transit capture behavior (scope: `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-markdown-format.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts.test.mjs, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/module.md, product-parts/core-runtime/clusters/provider-network-capture/cluster.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, product-parts/core-runtime/product-part.md, docs/architecture/SessionProfilesV2.md, docs/DOCUMENTATION_INDEX.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`; expected commit: `fix: clarify native capture artifacts`). Result: Completed in commit `fix: clarify native capture artifacts`.
4. [DONE] Git Commit: `fix: clarify native capture artifacts` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-09)

### Stream: Package And Retest

5. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification after explicit user confirmation (`npm run package:mac`) and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record native capture artifact retest`). Result: Completed in commit `docs: record native capture artifact retest`.
6. [DONE] Git Commit: `docs: record native capture artifact retest` (hash: self)
7. [DONE] `harness-ai.phase2.stream1.task2` User retests Native Request Capture in the packaged app for Codex app-server and profile-selectable providers (scope: user workflow; expected commit: none). Result: User confirmed the generated artifacts are much clearer and asked to move to Profile Creator cleanup.

## Phase 3 - Profile Creator Provider Scope (owner: Codex, updated: 2026-07-09)

### Stream: Provider-Specific Authoring

8. [DONE] `harness-ai.phase3.stream1.task1` Add the active plan slice for removing universal profile creation and making Profile Creator provider-specific (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add profile creator provider scope`). Result: Completed in commit `plan: add profile creator provider scope`.
9. [DONE] Git Commit: `plan: add profile creator provider scope` (hash: self)
10. [DONE] `harness-ai.phase3.stream1.task2` Remove universal profile creation from Profile Creator, require a provider for new profiles, show every active provider id in the provider picker, remove universal first-access seeds, and align authoring/catalog/docs/tests with provider-scoped profile creation only (scope: `product-parts/application-shell/clusters/settings-surface/modules/profile-settings-ui/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-authoring/src/**, product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/**, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/**, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-session-profile-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-session-profile-events.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/session-profiles/cluster.md, product-parts/core-runtime/clusters/session-profiles/modules/profile-authoring/module.md, product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/module.md, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md, product-parts/application-shell/clusters/settings-surface/modules/profile-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, docs/architecture/SessionProfilesV2.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`; expected commit: `fix: make profile creator provider scoped`). Result: Completed in commit `fix: make profile creator provider scoped`.
11. [DONE] Git Commit: `fix: make profile creator provider scoped` (hash: self)

## Phase 4 - Codex 5.6 Model Catalog (owner: Codex, updated: 2026-07-11)

### Stream: Provider Catalog And Reasoning

12. [DONE] `harness-ai.phase4.stream1.task1` Add the active plan slice for the Codex 5.6 picker, reasoning capability, Native Request Capture propagation, and live provider verification (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add codex 5.6 model scope`). Result: Completed in commit `plan: add codex 5.6 model scope`.
13. [DONE] Git Commit: `plan: add codex 5.6 model scope` (hash: self)
14. [DONE] `harness-ai.phase4.stream1.task2` Replace the retired Codex GPT-5.2 settings contract with the provider-visible GPT-5.6 Luna/Terra/Sol catalog, add the provider `ultra` effort value, preserve normalized per-model settings, and align focused tests/docs (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md`; expected commit: `fix: update codex 5.6 settings contract`). Result: Completed in commit `fix: update codex 5.6 settings contract`.
15. [DONE] Git Commit: `fix: update codex 5.6 settings contract` (hash: self)
16. [DONE] `harness-ai.phase4.stream1.task3` Update the Codex Settings picker labels/descriptions and reasoning option labels for GPT-5.6 Luna/Terra/Sol, including Ultra only for Terra/Sol, with focused UI contract coverage and documentation (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-model-options.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/codex-default-model-card.test.mjs, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `fix: show codex 5.6 models and ultra reasoning`). Result: Completed in commit `fix: show codex 5.6 models and ultra reasoning`.
17. [DONE] Git Commit: `fix: show codex 5.6 models and ultra reasoning` (hash: self)
18. [DONE] `harness-ai.phase4.stream1.task4` Align the Codex provider capability types/catalog and adapter construction with GPT-5.6 reasoning efforts so normal sessions and diagnostic adapters accept max/ultra safely (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/types/index.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/types/codex-model-capabilities.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md, product-parts/provider-runtime/clusters/provider-adapters/cluster.md`; expected commit: `fix: align codex 5.6 runtime capabilities`). Result: Completed in commit `fix: align codex 5.6 runtime capabilities`.
19. [DONE] Git Commit: `fix: align codex 5.6 runtime capabilities` (hash: self)
20. [DONE] `harness-ai.phase4.stream1.task5` Replace the Codex Native Request Capture picker catalog with the provider-visible GPT-5.6 models and cover the Core-returned catalog (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-readiness.test.mjs, product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/module.md, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `fix: expose codex 5.6 capture models`). Result: Completed in commit `fix: expose codex 5.6 capture models`.
21. [DONE] Git Commit: `fix: expose codex 5.6 capture models` (hash: self)
22. [DONE] `harness-ai.phase4.stream1.task6` Resolve the selected Codex model's normalized reasoning setting in Core and pass it into the dedicated Native Request Capture adapter, with focused RPC coverage and runtime documentation (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `fix: apply codex reasoning to native capture`). Result: Completed in commit `fix: apply codex reasoning to native capture`.
23. [DONE] Git Commit: `fix: apply codex reasoning to native capture` (hash: self)
24. [DONE] `harness-ai.phase4.stream1.task7` Verify the updated catalog and reasoning propagation with focused tests/build plus live app-server calls to GPT-5.6 Luna max, Terra ultra, and Sol ultra, then record redacted response evidence and documentation-index linkage (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, docs/architecture/SessionProfilesV2.md`; expected commit: `docs: record codex 5.6 model verification`). Result: Completed in commit `docs: record codex 5.6 model verification`.
25. [DONE] Git Commit: `docs: record codex 5.6 model verification` (hash: self)

## Phase 5 - Codex 5.6 Package (owner: Codex, updated: 2026-07-11)

### Stream: Package And Handoff

26. [DONE] `harness-ai.phase5.stream1.task1` Add the explicitly user-approved macOS package slice for the Codex 5.6 catalog and Native Request Capture reasoning changes (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add codex 5.6 package scope`). Result: Completed in commit `plan: add codex 5.6 package scope`.
27. [DONE] Git Commit: `plan: add codex 5.6 package scope` (hash: self)
28. [DONE] `harness-ai.phase5.stream1.task2` Run `npm run package:mac`, verify the unsigned macOS app and packaged `app.asar` contain the GPT-5.6 model catalog plus Ultra/capture-reasoning runtime, and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record codex 5.6 package`). Result: Completed in commit `docs: record codex 5.6 package`.
29. [DONE] Git Commit: `docs: record codex 5.6 package` (hash: self)
