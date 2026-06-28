# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reference-core-runtime-rebuild-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase7.stream1.task1",
  "expectedCommitMessage": "chore: verify reference core runtime rebuild app",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User directive to stop extending the current mixed Electron/Core runtime and rebuild Harness AI according to the CodeAI-Hub reference architecture.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
  - `docs/architecture/ReferenceCoreRuntimeBoundary.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/extension-module/core/core-process-manager.ts`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/core-supervisor/src/index.ts`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/src/client/ui/src/core-bridge/core-bridge.ts`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI-Hub is the behavioral reference. Do not invent a new Core lifecycle where the reference already has one.
- Application Shell is not Core and not backend. Application Shell may supervise, connect, display and forward user input only.
- Application Shell must not instantiate provider facades, register provider adapters, own settings/session/provider truth, or import provider implementation modules.
- Core Runtime owns workflow/session/provider/settings truth and runs out-of-process.
- Core boundary refactor must preserve existing UI-visible contracts: tokens, context window, provider limits, reasoning, session history, provider binding and settings selections.
- No direct `application-shell` imports of `core-runtime` implementation modules are allowed after this scope.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Plan Setup

1. [DONE] `harness-ai.phase1.stream1.task1` Create active scope plan for rebuilding the Harness AI Core lifecycle from the CodeAI-Hub reference architecture (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start reference core runtime rebuild scope`). Result: Completed in commit `chore: start reference core runtime rebuild scope`.
2. [DONE] Git Commit: `chore: start reference core runtime rebuild scope` (hash: self)

## Phase 2 - Reference Boundary Map (owner: Codex, updated: 2026-06-28)

### Stream: Runtime Contract

3. [DONE] `harness-ai.phase2.stream1.task1` Map CodeAI-Hub Core supervisor, health/shutdown, port registry, WebSocket/HTTP bridge, provider composition ownership and Application Shell UI-only boundary into a Harness AI migration contract (scope: `docs/architecture/**, .harness/product-tree/**, product-parts/*/product-part.md, .harness/plans/todo-plan.md`; expected commit: `docs: map reference core runtime boundary`). Result: Completed in commit `docs: map reference core runtime boundary`.
4. [DONE] Git Commit: `docs: map reference core runtime boundary` (hash: self)

## Phase 3 - Regression Preservation Contract (owner: Codex, updated: 2026-06-28)

### Stream: Guard Plan

5. [DONE] `harness-ai.phase3.stream1.task1` Add regression guard plan for preserving session events, provider binding, token/context telemetry, usage limits, reasoning display, session JSONL readback and settings/model/reasoning selections while moving Core out of process (scope: `docs/architecture/**, .harness/plans/todo-plan.md`; expected commit: `docs: add core runtime regression guards`). Result: Completed in commit `docs: add core runtime regression guards`.
6. [DONE] Git Commit: `docs: add core runtime regression guards` (hash: self)

## Phase 4 - Core Runtime Process (owner: Codex, updated: 2026-06-28)

### Stream: Runtime Server

7. [DONE] `harness-ai.phase4.stream1.task1` Add the minimal Core Runtime process entry with health and shutdown endpoints, keeping session/provider/settings truth inside Core (scope: `product-parts/core-runtime/**, .harness/product-tree/**, package.json, .harness/plans/todo-plan.md`; expected commit: `feat: add core runtime process boundary`). Result: Completed in commit `feat: add core runtime process boundary`.
8. [DONE] Git Commit: `feat: add core runtime process boundary` (hash: self)

### Stream: Provider Binding

9. [DONE] `harness-ai.phase4.stream2.task1` Move provider adapter registration and session request handling behind the Core process API instead of Electron-host composition (scope: `product-parts/core-runtime/**, product-parts/provider-runtime/**, .harness/plans/todo-plan.md`; expected commit: `feat: host provider runtime inside core process`). Result: Completed in commit `feat: host provider runtime inside core process`.
10. [DONE] Git Commit: `feat: host provider runtime inside core process` (hash: self)

## Phase 5 - Application Shell Supervisor Client (owner: Codex, updated: 2026-06-28)

### Stream: Supervisor

11. [DONE] `harness-ai.phase5.stream1.task1` Replace Electron-host direct runtime imports with a CodeAI-Hub-style Core supervisor that starts, stops, restarts and health-checks the Core process (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/**, .harness/plans/todo-plan.md`; expected commit: `feat: supervise core process from application shell`). Result: Completed in commit `feat: supervise core process from application shell`.
12. [DONE] Git Commit: `feat: supervise core process from application shell` (hash: self)

### Stream: Bridge

13. [DONE] `harness-ai.phase5.stream2.task1` Replace renderer IPC handlers that call Core singletons with a client bridge to Core HTTP/WebSocket contracts and move provider registration guard tests to the Core owner (scope: `product-parts/application-shell/**, product-parts/core-runtime/**, product-parts/provider-runtime/clusters/provider-adapters/modules/*/src/*facade.test.mjs, .harness/plans/todo-plan.md`; expected commit: `feat: bridge application shell to core process api`). Result: Completed in commit `feat: bridge application shell to core process api`.
14. [DONE] Git Commit: `feat: bridge application shell to core process api` (hash: self)

## Phase 6 - Cleanup And Guards (owner: Codex, updated: 2026-06-28)

### Stream: Boundary Enforcement

15. [DONE] `harness-ai.phase6.stream1.task1` Add architecture guard coverage that rejects Electron Host direct Core loading and Application Shell provider adapter implementation imports (scope: `scripts/**, product-parts/application-shell/**, docs/architecture/ReferenceCoreRuntimeBoundary.md, .harness/plans/todo-plan.md`; expected commit: `test: guard application shell core boundary`). Result: Completed in commit `test: guard application shell core boundary`.
16. [DONE] Git Commit: `test: guard application shell core boundary` (hash: self)

## Phase 7 - Verification Package (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

17. [IN_PROGRESS] `harness-ai.phase7.stream1.task1` Run required gates, regression checks, rebuild packaged macOS app and record evidence for Core process lifecycle retest (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reference core runtime rebuild app`).
18. [TODO] Git Commit: `chore: verify reference core runtime rebuild app` (hash: TBD)

## Phase 8 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

19. [TODO] `harness-ai.phase8.stream1.task1` User retests Harness AI with out-of-process Core lifecycle, real Restart Core behavior, preserved telemetry/limits/reasoning/session history and no workspace `.codeai-hub` runtime residue (scope: user workflow; expected commit: none).
