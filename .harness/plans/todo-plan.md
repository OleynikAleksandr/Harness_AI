# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reference-provider-modules-migration-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "docs: map reference provider module migration",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user rejected the local wrapper/patch approach and required provider-by-provider migration from CodeAI-Hub.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/provider-runtime/product-part.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/cluster.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - Reference: `CodeAI-Hub/packages/Claude_Module/**`
  - Reference: `CodeAI-Hub/packages/Codex_AppServer_Module/**`
  - Reference: `CodeAI-Hub/packages/Kimi_Module/**`
  - Reference: `CodeAI-Hub/packages/GLM_Module/**`
  - Reference: `CodeAI-Hub/packages/GLM_OpenCode_Module/**`
  - Reference: `CodeAI-Hub/packages/core/src/local-models/**`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- CodeAI-Hub provider modules are the source of truth for provider runtime behavior in this scope.
- No local provider semantics, protocol guessing, UI inference, or wrapper-only replacement unless the same behavior exists in CodeAI-Hub.
- Port provider behavior provider-by-provider. Harness adaptation is limited to Product Part / Cluster / Module placement, public facade shape, imports, tests, docs, and existing Core contracts.
- Where CodeAI-Hub violates Harness module/facade boundaries, keep the reference behavior but split it into Harness modules with explicit facades.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan explicitly scopes a whole provider module migration.
- Product Part / Cluster / Module filesystem ownership is primary.
- No release/package build starts as a release decision without explicit user confirmation. Verification/package builds for this scope are allowed because the user needs a packaged app for retest.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Planning

1. [DONE] `harness-ai.phase1.stream1.task1` Start a clean active scope for CodeAI-Hub provider module migration and make the reference-first constraints explicit (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start reference provider modules migration scope`). Result: Completed in commit `chore: start reference provider modules migration scope`.
2. [DONE] Git Commit: `chore: start reference provider modules migration scope` (hash: self)

## Phase 2 - Reference Inventory And Migration Map (owner: Codex, updated: 2026-06-28)

### Stream: Architecture

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Inventory CodeAI-Hub provider modules, facade classes, runtime contracts, settings files, provider homes, event routers, and tests; write a provider-by-provider migration map before changing provider code (scope: `docs/architecture/**, docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `docs: map reference provider module migration`).
4. [TODO] Git Commit: `docs: map reference provider module migration` (hash: TBD)

## Phase 3 - Claude Agent SDK Provider Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

5. [TODO] `harness-ai.phase3.stream1.task1` Replace the simplified Harness Claude CLI provider with a Harness-packaged migration of CodeAI-Hub `Claude_Module`: Agent SDK manager, session manager, stream router, thinking emitter, runtime profile, system prompt/tool/settings controls, and focused tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/**`; expected commit: `feat: migrate claude agent sdk provider`).
6. [TODO] Git Commit: `feat: migrate claude agent sdk provider` (hash: TBD)

## Phase 4 - Codex App Server Provider Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

7. [TODO] `harness-ai.phase4.stream1.task1` Replace the partial Harness Codex app-server adapter with a Harness-packaged migration of CodeAI-Hub `Codex_AppServer_Module`: process profile, provider home/auth, app-server facade, event router, reasoning buffers, usage limits, applied turn config, and focused tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/**, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/**`; expected commit: `feat: migrate codex app server provider`).
8. [TODO] Git Commit: `feat: migrate codex app server provider` (hash: TBD)

## Phase 5 - Kimi Provider Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

9. [TODO] `harness-ai.phase5.stream1.task1` Migrate CodeAI-Hub `Kimi_Module` behavior into the Harness Kimi provider module, including managed profile, lifecycle, event normalizer, thinking handling, settings, and tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/**`; expected commit: `feat: migrate kimi provider module`).
10. [TODO] Git Commit: `feat: migrate kimi provider module` (hash: TBD)

## Phase 6 - GLM Native Provider Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

11. [TODO] `harness-ai.phase6.stream1.task1` Migrate CodeAI-Hub `GLM_Module` native provider behavior into the Harness GLM Native provider module, including request config, thinking controls, event normalization, settings, and tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-native-provider/**`; expected commit: `feat: migrate glm native provider module`).
12. [TODO] Git Commit: `feat: migrate glm native provider module` (hash: TBD)

## Phase 7 - GLM OpenCode Provider Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

13. [TODO] `harness-ai.phase7.stream1.task1` Migrate CodeAI-Hub `GLM_OpenCode_Module` behavior into the Harness GLM OpenCode provider module, including OpenCode process/session behavior, output normalization, thinking handling, settings, and tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/**`; expected commit: `feat: migrate glm opencode provider module`).
14. [TODO] Git Commit: `feat: migrate glm opencode provider module` (hash: TBD)

## Phase 8 - OpenRouter And Local Models Migration (owner: Codex, updated: 2026-06-28)

### Stream: Provider Runtime

15. [TODO] `harness-ai.phase8.stream1.task1` Migrate CodeAI-Hub OpenRouter and local-model provider behavior into Harness modules, including endpoint/model settings, reasoning/thinking stream handling, request bodies, and tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/openrouter-provider/**, product-parts/provider-runtime/clusters/provider-adapters/modules/local-models-provider/**`; expected commit: `feat: migrate openrouter and local model providers`).
16. [TODO] Git Commit: `feat: migrate openrouter and local model providers` (hash: TBD)

## Phase 9 - Shared Contract Cleanup (owner: Codex, updated: 2026-06-28)

### Stream: Core And Contracts

17. [TODO] `harness-ai.phase9.stream1.task1` Remove obsolete wrapper assumptions and align Core/session/provider adapter contracts with the migrated CodeAI-Hub provider modules without moving truth into UI (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/**`; expected commit: `refactor: align provider contracts with reference modules`).
18. [TODO] Git Commit: `refactor: align provider contracts with reference modules` (hash: TBD)

## Phase 10 - Verification And Packaged App (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

19. [TODO] `harness-ai.phase10.stream1.task1` Run required gates, update evidence, rebuild `dist/`, package macOS app, and hand off the provider-module migration for user retest (scope: `docs/evidence/**, docs/architecture/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reference provider module migration`).
20. [TODO] Git Commit: `chore: verify reference provider module migration` (hash: TBD)

## Phase 11 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

21. [TODO] `harness-ai.phase11.stream1.task1` User relaunches the packaged app and retests migrated provider modules provider-by-provider (scope: user workflow; expected commit: none).
