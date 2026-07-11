# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "native-capture-reasoning-selection-2026-07-11",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream3.task1",
  "expectedCommitMessage": "fix: apply native capture reasoning to providers",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request to make Native Request Capture reasoning an
  explicit per-provider/per-model command input for Claude and Codex, include
  the selected effort in artifact filenames, verify Codex Ultra at the
  app-server boundary, and rebuild the macOS package.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/cluster.md`
  - `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`

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
  a fresh empty plan; it may only suggest it and wait for the user's direct order.
- Verification/package builds for this scope are explicitly user-approved.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); this plan does not duplicate them as separate tasks.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-07-11)

### Stream: Recovery Owner

1. [DONE] `harness-ai.phase0.stream1.task1` Create the active scope for Native Request Capture reasoning selection, reasoning-aware filenames, verification, and packaging (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add native capture reasoning selection scope`). Result: Completed in commit `plan: add native capture reasoning selection scope`.
2. [DONE] Git Commit: `plan: add native capture reasoning selection scope` (hash: self)

## Phase 1 - Core Capture Reasoning Contract (owner: Codex, updated: 2026-07-11)

### Stream: Catalog And Command Validation

3. [DONE] `harness-ai.phase1.stream1.task1` Extend the Core-owned capture catalog with per-model reasoning capabilities/defaults for Claude and Codex, validate an explicit capture reasoning value in Core, and return the capability surface to the UI (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, related focused tests, provider-descriptor/core-runtime-process module docs, docs/architecture/SessionProfilesV2.md`; expected commit: `feat: add native capture reasoning contract`). Result: Completed in commit `feat: add native capture reasoning contract`.
4. [DONE] Git Commit: `feat: add native capture reasoning contract` (hash: self)

### Stream: Orchestration And Artifact Identity

5. [DONE] `harness-ai.phase1.stream2.task1` Carry the validated reasoning effort through the provider-neutral capture context and encode it immediately after the model in JSONL, diagnostics JSONL, and Markdown artifact filenames (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, related focused tests and module/cluster docs, docs/architecture/SessionProfilesV2.md`; expected commit: `feat: identify native captures by reasoning`). Result: Completed in commit `feat: identify native captures by reasoning`.
6. [DONE] Git Commit: `feat: identify native captures by reasoning` (hash: self)
7. [DONE] `harness-ai.phase1.stream2.task2` Pass the Core-validated capture reasoning effort into the provider-neutral orchestrator command so production artifact identity and provider context use the same explicit intent (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `fix: pass native capture reasoning command`). Result: Completed in commit `fix: pass native capture reasoning command`.
8. [DONE] Git Commit: `fix: pass native capture reasoning command` (hash: self)

### Stream: Provider Application

9. [IN_PROGRESS] `harness-ai.phase1.stream3.task1` Apply the explicit capture reasoning effort in the Claude interactive CLI (`--effort`) and Codex app-server `turn/start`, record it in provider diagnostics, and prove the provider boundaries with focused tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-native-request-capture-service.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-interactive-cli-runner.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts, related focused tests and provider module/cluster docs, docs/architecture/SessionProfilesV2.md`; expected commit: `fix: apply native capture reasoning to providers`).
10. [TODO] Git Commit: `fix: apply native capture reasoning to providers` (hash: TBD)

## Phase 2 - Native Capture UI (owner: Codex, updated: 2026-07-11)

### Stream: Provider And Model Controls

11. [TODO] `harness-ai.phase2.stream1.task1` Add a model-aware reasoning selector to the Native Request Capture card for Claude and Codex, submit the selected Core-declared value, and cover the renderer contract without deriving provider truth in UI (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/native-capture-card.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, focused UI tests, provider-settings-ui module docs`; expected commit: `feat: select reasoning for native capture`).
12. [TODO] Git Commit: `feat: select reasoning for native capture` (hash: TBD)

## Phase 3 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-11)

### Stream: Live Proof And Package

13. [TODO] `harness-ai.phase3.stream1.task1` Prove a GPT-5.6 Sol Ultra capture records `turn/start.effort=ultra` while preserving the provider-normalized upstream payload, verify reasoning-aware artifact filenames, run the explicitly approved macOS package build, inspect `app.asar`, launch-smoke the app, and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record native capture reasoning package`).
14. [TODO] Git Commit: `docs: record native capture reasoning package` (hash: TBD)
15. [TODO] `harness-ai.phase3.stream1.task2` User retests reasoning selection and capture artifacts in the packaged app for Claude and Codex (scope: user workflow; expected commit: none).
