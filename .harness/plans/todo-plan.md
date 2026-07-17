# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-native-request-capture-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-16 — add Kimi and its three
  current Coding Plan models (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`) to Settings -> General -> Native
  Request Capture so the diagnostic path records the original Kimi CLI
  system instructions and native tool schemas, not Harness universal-client
  prompt/tool material.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/NativePromptComposition.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/cluster.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/cluster.md`
  - `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan
  splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Kimi remains a universal-client runtime provider. This scope restores only
  a diagnostic native-CLI capture path and must not resurrect the retired ACP
  session provider.
- The capture path must launch the installed Kimi CLI with its default native
  agent wrapping and the selected model, using a temporary cloned provider
  home and the verified reverse-forward bridge algorithm from repository
  history.
- Core/provider-runtime own provider, model, capture routing and artifact
  truth. The renderer only displays the catalog and submits the command.
- Any source change updates every related Markdown document in the same
  commit. Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files
  are added, moved or deleted.
- Scope closeout/archival is user-directed only.
- Do not start `npm run package:mac` without a separate explicit user
  confirmation. User acceptance remains separate and does not close scope.
- Quality gates run automatically on every commit; do not add a separate gate
  task.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-16)

### Stream: Plan Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the Kimi native-request-capture scope and record the diagnostic-only architecture boundary (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: bootstrap Kimi native capture scope`). Result: Completed in commit `plan: bootstrap Kimi native capture scope`.
2. [DONE] Git Commit: `plan: bootstrap Kimi native capture scope` (hash: self)

## Phase 2 - Kimi Native Capture Runtime (owner: Codex, updated: 2026-07-16)

### Stream: Reverse Transit And CLI Driver

3. [DONE] `harness-ai.phase2.stream1.task1` Restore the provider-neutral Kimi reverse-forward transit and Kimi artifact type while preserving Claude/Codex paths; cover target matching, forwarding and reasoning-qualified artifact naming and synchronize capture-cluster docs (scope: `capture-proxy/src/capture-proxy-reverse.ts, capture-orchestrator/src/capture-orchestrator-facade.ts, capture-artifacts/src/capture-artifacts-facade.ts` + paired tests/docs; expected commit: `feat: restore Kimi native capture transport`). Result: Completed in commit `feat: restore Kimi native capture transport`.
4. [DONE] Git Commit: `feat: restore Kimi native capture transport` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` Add a diagnostic-only Kimi CLI capture module that clones the real Kimi auth/config into a temporary home, rewrites only provider base URLs to the reverse bridge, selects the requested model and drives one native default-agent probe; cover config rewriting, process cleanup and applied-envelope evidence and synchronize provider-adapter/product-tree docs (scope: `provider-adapters/modules/kimi-native-capture/src/kimi-native-capture-facade.ts, provider-adapters/modules/kimi-native-capture/src/kimi-capture-config-rewrite.ts, provider-adapters/modules/kimi-native-capture/src/kimi-acp-client.ts` + paired tests/docs/product-tree; expected commit: `feat: add Kimi CLI native capture driver`). Result: Completed in commit `feat: add Kimi CLI native capture driver`.
6. [DONE] Git Commit: `feat: add Kimi CLI native capture driver` (hash: self)

## Phase 3 - Core Contract And Settings Surface (owner: Codex, updated: 2026-07-16)

### Stream: Catalog Routing And Readable Artifacts

7. [DONE] `harness-ai.phase3.stream1.task1` Register Kimi plus the three Core-owned Coding Plan models in the native-capture catalog, model optional provider-default reasoning honestly, and route Kimi capture commands to the diagnostic CLI facade without re-registering the retired ACP provider; cover RPC validation and synchronize registry/runtime docs (scope: `provider-descriptor/src/provider-descriptor-facade.ts, core-runtime-process/src/core-native-capture-rpc.ts, provider-adapter-contract/src/provider-adapter-contract-facade.ts` + paired tests/docs; expected commit: `feat: register Kimi native capture catalog`). Result: Completed in commit `feat: register Kimi native capture catalog`.
8. [DONE] Git Commit: `feat: register Kimi native capture catalog` (hash: self)
9. [DONE] `harness-ai.phase3.stream1.task2` Update the Native Request Capture card to display Kimi cleanly, allow models with provider-default reasoning, and verify the readable artifact parser extracts Kimi system messages and native tool schemas from the current CLI request envelope; synchronize UI/artifact docs (scope: `provider-settings-ui/src/native-capture-card.tsx, capture-artifacts/src/capture-payload-sections.ts, capture-artifacts/src/capture-markdown-format.ts` + paired tests/docs; expected commit: `feat: expose Kimi native capture in Settings`). Result: Completed in commit `feat: expose Kimi native capture in Settings`.
10. [DONE] Git Commit: `feat: expose Kimi native capture in Settings` (hash: self)

## Phase 4 - Live Verification (owner: Codex, updated: 2026-07-16)

### Stream: Native CLI Evidence

11. [DONE] `harness-ai.phase4.stream1.task1` Run focused live native captures with installed Kimi CLI `0.26.0` for all three model ids, verify raw JSONL against the derived Markdown system/tool sections, and record sanitized evidence without credentials or full sensitive prompts (scope: `docs/evidence/kimi-native-request-capture-2026-07-16.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: verify Kimi native request capture`). Result: Completed in commit `chore: verify Kimi native request capture`.
12. [DONE] Git Commit: `chore: verify Kimi native request capture` (hash: self)

## Phase 5 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-16)

### Stream: Package And Retest

13. [DONE] `harness-ai.phase5.stream1.task1` After explicit user confirmation, package the app for user verification (`npm run package:mac`) and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package Kimi native capture build`). Result: Completed in commit `chore: package Kimi native capture build`.
14. [DONE] Git Commit: `chore: package Kimi native capture build` (hash: self)
15. [DONE] `harness-ai.phase5.stream1.task2` User captures all three Kimi models from Settings -> General and confirms the raw/readable artifacts contain the expected native CLI system prompt and tool schemas (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — User accepted current Kimi native capture implementation (Settings capture, all three models) Acceptance Commit: `chore: record plan acceptance kimi-native-request-capture-2026-07-16`.
