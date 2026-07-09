# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "native-capture-artifact-cleanup-2026-07-09",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "docs: record native capture artifact retest",
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

5. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Package the app for user verification after explicit user confirmation (`npm run package:mac`) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `docs: record native capture artifact retest`).
6. [TODO] Git Commit: `docs: record native capture artifact retest` (hash: TBD)
7. [TODO] `harness-ai.phase2.stream1.task2` User retests Native Request Capture in the packaged app for Codex app-server and profile-selectable providers (scope: user workflow; expected commit: none).
