# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "grok-provider-implementation-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task2",
  "expectedCommitMessage": "feat: add Grok ACP router",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `docs/evidence/grok-provider-integration-plan-2026-07-16.md` and the user's direct order to implement the provider through a packaged app build.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/evidence/grok-provider-integration-plan-2026-07-16.md`
  - `docs/architecture/SessionProfiles.md`
  - `docs/architecture/SubagentSessions.md`
  - `docs/architecture/ReferenceCoreRuntimeBoundary.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Grok session UI is functionally identical to Codex session UI. Core/provider contracts must supply every lower status-panel datum and action: model, reasoning effort, tokens/context percent, cache, turns and rollback. Renderer must not fabricate unavailable values.
- Missing native Grok telemetry is a provider completion blocker: find a truthful structured ACP/provider source or report the capability as unsupported in evidence; never substitute a fake zero or renderer calculation.
- Any source change updates every related Markdown document in the same commit: affected `module.md`, `cluster.md`, `product-part.md`, architecture docs, product tree docs, README/AGENTS/CLAUDE when relevant, and any related `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- The user explicitly authorized `npm run build` and `npm run package:mac` for this scope.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate gate-run phase.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Live Contract And Codex Parity Baseline (owner: Codex, updated: 2026-07-16)

### Stream: Evidence And Wire Truth

1. [DONE] `harness-ai.phase1.stream1.task1` Extend the Grok planning evidence with an explicit Codex-equivalent session UI contract, including the complete lower status-panel field/action matrix, Core ownership, no-fabrication rule and packaged acceptance checks; record sanitized live ACP probes for prompt, tools, models, usage, cache, turns and rollback capability (scope: `.harness/plans/todo-plan.md, docs/evidence/grok-provider-integration-plan-2026-07-16.md`; expected commit: `docs: require Codex session parity for Grok`). Result: Completed in commit `docs: require Codex session parity for Grok`.
2. [DONE] Git Commit: `docs: require Codex session parity for Grok` (hash: self)

## Phase 2 - Grok Provider Module Foundation (owner: Codex, updated: 2026-07-16)

### Stream: Binary, ACP Transport And Ownership

3. [DONE] `harness-ai.phase2.stream1.task1` Create the `grok-provider` module boundary, GUI-safe CLI locator/version/auth readiness probe and public facade; register the new module in architecture/product-tree documentation without registering the provider in user-visible UI yet (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-cli-locator.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-cli-locator.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, product-parts/provider-runtime/clusters/provider-adapters/cluster.md, product-parts/provider-runtime/product-part.md, .harness/product-tree/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok provider module foundation`). Result: Completed in commit `feat: add Grok provider module foundation`.
4. [DONE] Git Commit: `feat: add Grok provider module foundation` (hash: self)
5. [IN_PROGRESS] `harness-ai.phase2.stream1.task2` Implement tolerant ACP JSON-RPC contracts/router for requests, responses, notifications and reverse requests with cancellation, timeouts and pending-request rejection (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-contracts.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-router.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-router.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok ACP router`).
6. [TODO] Git Commit: `feat: add Grok ACP router` (hash: TBD)
7. [TODO] `harness-ai.phase2.stream1.task3` Implement one-process-per-session Grok ACP supervision and a fake stdio agent fixture, including bounded stderr, expected/unexpected exit and orphan-request cleanup (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-process.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-process.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-fake-agent.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: supervise Grok ACP processes`).
8. [TODO] Git Commit: `feat: supervise Grok ACP processes` (hash: TBD)

## Phase 3 - Session Lifecycle, Events And Profiles (owner: Codex, updated: 2026-07-16)

### Stream: Native Provider Behavior

9. [TODO] `harness-ai.phase3.stream1.task1` Implement ACP initialize/authenticate/session-new/session-load/prompt/cancel/close lifecycle with immutable provider-session identity and model/reasoning application (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-session-runtime.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-session-runtime.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-contracts.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok ACP session lifecycle`).
10. [TODO] Git Commit: `feat: add Grok ACP session lifecycle` (hash: TBD)
11. [TODO] `harness-ai.phase3.stream1.task2` Normalize structured Grok assistant, reasoning, tool, plan, usage and failure updates into the provider adapter event contract without text classification (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-event-normalizer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-event-normalizer.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-acp-contracts.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: normalize Grok ACP events`).
12. [TODO] Git Commit: `feat: normalize Grok ACP events` (hash: TBD)
13. [TODO] `harness-ai.phase3.stream1.task3` Implement Native/Managed profile application, verified Grok tool-category mapping and applied-profile proof with fail-closed managed binding and frozen resume behavior (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-profile-application.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-tool-inventory.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-profile-application.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, docs/architecture/SessionProfiles.md, docs/architecture/SessionProfilesV2.md, .harness/plans/todo-plan.md`; expected commit: `feat: apply Grok session profiles`).
14. [TODO] Git Commit: `feat: apply Grok session profiles` (hash: TBD)
15. [TODO] `harness-ai.phase3.stream1.task4` Compose the Grok `ProviderAdapter` lifecycle, subscriptions, stop, resume, artifact cleanup and applied-profile result, with parallel-session isolation tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-adapter.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: compose Grok provider adapter`).
16. [TODO] Git Commit: `feat: compose Grok provider adapter` (hash: TBD)

## Phase 4 - Models, Billing, Registry And Core Binding (owner: Codex, updated: 2026-07-16)

### Stream: Provider Discovery And Runtime Truth

17. [TODO] `harness-ai.phase4.stream1.task1` Normalize dynamic Grok models/reasoning capabilities and additive SuperGrok billing/weekly-reset schemas, preserving unknown usage percentage as unknown (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-model-catalog.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-billing-client.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-model-billing.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: expose Grok models and billing`).
18. [TODO] Git Commit: `feat: expose Grok models and billing` (hash: TBD)
19. [TODO] `harness-ai.phase4.stream1.task2` Add the Grok provider descriptor/readiness/model defaults and registry tests while keeping all catalog truth Core/provider-owned (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.ts, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.test.mjs, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-readiness.test.mjs, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/module.md, docs/architecture/ReferenceCoreRuntimeBoundary.md, .harness/plans/todo-plan.md`; expected commit: `feat: register Grok provider descriptor`).
20. [TODO] Git Commit: `feat: register Grok provider descriptor` (hash: TBD)
21. [TODO] `harness-ai.phase4.stream1.task3` Register the Grok adapter in Core composition and propagate model/reasoning/profile turn options through the existing provider-neutral session binding (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-turn-options.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-turn-options.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: bind Grok sessions in Core`).
22. [TODO] Git Commit: `feat: bind Grok sessions in Core` (hash: TBD)

## Phase 5 - Permissions, MCP And Subagents (owner: Codex, updated: 2026-07-16)

### Stream: Interactive Native Capabilities

23. [TODO] `harness-ai.phase5.stream1.task1` Extend the provider-neutral interaction contract and Core pending-interaction lifecycle for Grok permission, ask-user and plan-approval reverse requests, with timeout/deny/cancel safety (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-provider-event-router.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: add provider interaction lifecycle`).
24. [TODO] Git Commit: `feat: add provider interaction lifecycle` (hash: TBD)
25. [TODO] `harness-ai.phase5.stream1.task2` Bridge Grok ACP reverse requests and native MCP configuration into the Core interaction contract without exposing credentials or arbitrary extension calls (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-interaction-bridge.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-interaction-bridge.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: bridge Grok permissions and MCP`).
26. [TODO] Git Commit: `feat: bridge Grok permissions and MCP` (hash: TBD)
27. [TODO] `harness-ai.phase5.stream1.task3` Normalize Grok native parent/child sessions, progress, terminal status, cancellation and transcript recovery into the existing provider-neutral subagent lifecycle (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-subagent-normalizer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-subagent-normalizer.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-adapter.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/grok-provider/module.md, docs/architecture/SubagentSessions.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok native subagents`).
28. [TODO] Git Commit: `feat: add Grok native subagents` (hash: TBD)

## Phase 6 - Settings, Profiles And Codex-Equivalent Session UI (owner: Codex, updated: 2026-07-16)

### Stream: User Surface From Core Truth

29. [TODO] `harness-ai.phase6.stream1.task1` Add Grok provider settings/profile eligibility and Core-owned model/reasoning read models, keeping Native first and Managed visible only after verified binding support (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, docs/architecture/SessionProfiles.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok settings and profiles`).
30. [TODO] Git Commit: `feat: add Grok settings and profiles` (hash: TBD)
31. [TODO] `harness-ai.phase6.stream1.task2` Render Grok in provider/session selection and show its Core-selected model/reasoning exactly through the shared session shell, without renderer-owned capability inference (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/provider-picker.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok session controls`).
32. [TODO] Git Commit: `feat: add Grok session controls` (hash: TBD)
33. [TODO] `harness-ai.phase6.stream1.task3` Make lower status-panel capabilities Core-owned and deliver complete Grok parity with Codex: model, reasoning, tokens/context percent, cache, turns and rollback with identical enablement/status behavior (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, docs/evidence/grok-provider-integration-plan-2026-07-16.md, .harness/plans/todo-plan.md`; expected commit: `feat: match Grok status panel to Codex`).
34. [TODO] Git Commit: `feat: match Grok status panel to Codex` (hash: TBD)
35. [TODO] `harness-ai.phase6.stream1.task4` Add in-app Grok permission/ask-user/plan dialogs using shared interaction read models and commands, with no native browser dialogs (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/grok-interaction-panel.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/grok-interaction-panel.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, .harness/plans/todo-plan.md`; expected commit: `feat: add Grok interaction dialogs`).
36. [TODO] Git Commit: `feat: add Grok interaction dialogs` (hash: TBD)

## Phase 7 - Live Integration And Package Evidence (owner: Codex, updated: 2026-07-16)

### Stream: Installed CLI And Shipped App

37. [TODO] `harness-ai.phase7.stream1.task1` Run live installed-CLI integration checks for auth reuse, Native, Managed prompt/tools, models/reasoning, usage/cache, turns/rollback, permissions, MCP, resume and subagents; fix only evidenced gaps and record sanitized verification (scope: `docs/evidence/grok-provider-live-verification-2026-07-16.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `test: verify Grok provider integration`).
38. [TODO] Git Commit: `test: verify Grok provider integration` (hash: TBD)
39. [TODO] `harness-ai.phase7.stream1.task2` Build renderer/runtime and package a new macOS application, verify `release/mac-arm64/Harness AI.app` and its `app.asar`, then record package evidence for user testing (scope: `docs/evidence/grok-provider-package-2026-07-16.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `build: package Grok provider for testing`).
40. [TODO] Git Commit: `build: package Grok provider for testing` (hash: TBD)
41. [TODO] `harness-ai.phase7.stream1.task3` User retests the Grok provider in the packaged app, with special acceptance of complete Codex-equivalent lower status-panel data and rollback behavior (scope: user workflow; expected commit: none).
