# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "harness-ai-provider-turn-execution-2026-06-26",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase17.stream1.task1",
  "expectedCommitMessage": "feat: run selected provider turns",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** CodeAI Hub archive `doc/SolidWorks-WorkFlow/Plans/Archive/HarnessAI_WorkspaceBootstrap_Planning.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- No release build starts without an explicit release-build gate.

## Phase 0 - Workspace Skeleton (owner: Codex, updated: 2026-06-26)

### Stream: Product Tree Materialization

1. [DONE] `harness-ai.phase0.stream1.task1` Create the Harness AI root README, `.gitignore`, product-tree JSON/Markdown, local plan, and Product Part / Cluster / Module documentation skeleton (scope: `README.md, .gitignore, .harness/**, product-parts/**`; expected commit: `docs: bootstrap harness ai workspace skeleton`).
2. [DONE] Git Commit: `docs: bootstrap harness ai workspace skeleton` (hash: self)

## Phase 1 - Development Harness (owner: Codex, updated: 2026-06-26)

### Stream: Local Rules And Checks

3. [DONE] `harness-ai.phase1.stream1.task1` Install target-local AGENTS.md, package/tooling config, plan wrapper scripts, Git hooks, and first quality-gate scripts (scope: `AGENTS.md, package.json, tsconfig.json, scripts/**, .husky/**, .harness/plans/todo-plan.md`; expected commit: `chore: install harness ai development harness`). Result: Completed in commit `chore: install harness ai development harness`.
4. [DONE] Git Commit: `chore: install harness ai development harness` (hash: self)

## Phase 2 - Bootstrap Gate Verification (owner: Codex, updated: 2026-06-26)

### Stream: First Clean State

5. [DONE] `harness-ai.phase2.stream1.task1` Run the available target-local checks, record bootstrap evidence, and prepare first implementation planning for the Electron session slice (scope: `.harness/plans/todo-plan.md, docs/evidence/**`; expected commit: `chore: verify harness ai bootstrap gates`). Result: Completed in commit `chore: verify harness ai bootstrap gates`.
6. [DONE] Git Commit: `chore: verify harness ai bootstrap gates` (hash: self)

## Phase 3 - First Electron Session Slice Planning (owner: Codex, updated: 2026-06-26)

### Stream: Implementation Route

7. [DONE] `harness-ai.phase3.stream1.task1` Create the first runnable Electron session slice planning document and expand the target-local implementation phases (scope: `.harness/plans/todo-plan.md, docs/architecture/FirstElectronSessionSlice.md`; expected commit: `docs: plan first electron session slice`). Result: Completed in commit `docs: plan first electron session slice`.
8. [DONE] Git Commit: `docs: plan first electron session slice` (hash: self)

## Phase 4 - Electron Toolchain (owner: Codex, updated: 2026-06-26)

### Stream: Runtime Dependencies

9. [DONE] `harness-ai.phase4.stream1.task1` Install the minimal Electron/React/Vite/TypeScript toolchain and update root config/scripts for dev and build commands (scope: `package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, scripts/check-architecture.mjs, scripts/typecheck.mjs`; expected commit: `chore: add electron react toolchain`). Result: Completed in commit `chore: add electron react toolchain`.
10. [DONE] Git Commit: `chore: add electron react toolchain` (hash: self)

## Phase 5 - Core Session Seed (owner: Codex, updated: 2026-06-26)

### Stream: Local Session Snapshot

11. [DONE] `harness-ai.phase5.stream1.task1` Implement the minimal Core-owned workspace/session snapshot seed for the first UI slice (scope: `product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/**`; expected commit: `feat: seed core session snapshot`). Result: Completed in commit `feat: seed core session snapshot`.
12. [DONE] Git Commit: `feat: seed core session snapshot` (hash: self)

## Phase 6 - Electron Session UI (owner: Codex, updated: 2026-06-26)

### Stream: Chat Surface

13. [DONE] `harness-ai.phase6.stream1.task1` Implement the first classic chat session UI with sidebar, transcript, telemetry strip, and input controls (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/**, product-parts/application-shell/clusters/session-interface/modules/input-controls/src/**`; expected commit: `feat: add first session ui slice`). Result: Completed in commit `feat: add first session ui slice`.
14. [DONE] Git Commit: `feat: add first session ui slice` (hash: self)

## Phase 7 - Electron Host Wiring (owner: Codex, updated: 2026-06-26)

### Stream: Desktop Launch

15. [DONE] `harness-ai.phase7.stream1.task1` Wire Electron main/preload startup, renderer entry, and VS Code link opening for the first desktop launch (scope: `package.json, scripts/dev-electron.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, product-parts/application-shell/clusters/electron-host/modules/vscode-link-opener/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**`; expected commit: `feat: wire electron desktop launch`). Result: Completed in commit `feat: wire electron desktop launch`.
16. [DONE] Git Commit: `feat: wire electron desktop launch` (hash: self)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-26)

### Stream: First Runnable App

17. [DONE] `harness-ai.phase8.stream1.task1` Run the app checks/build, verify the Electron session UI can launch, and record evidence (scope: `.harness/plans/todo-plan.md, docs/evidence/**`; expected commit: `chore: verify first electron session slice`). Result: Completed in commit `chore: verify first electron session slice`.
18. [DONE] Git Commit: `chore: verify first electron session slice` (hash: self)

## Phase 9 - Local Packaging Setup (owner: Codex, updated: 2026-06-26)

### Stream: Clickable App

19. [DONE] `harness-ai.phase9.stream1.task1` Add unsigned local Electron packaging for a clickable macOS app without Apple Developer Account distribution (scope: `package.json, package-lock.json, .gitignore, .harness/plans/todo-plan.md`; expected commit: `chore: add local electron packaging`). Result: Completed in commit `chore: add local electron packaging`.
20. [DONE] Git Commit: `chore: add local electron packaging` (hash: self)

## Phase 10 - Local Package Verification (owner: Codex, updated: 2026-06-26)

### Stream: First Packaged App

21. [DONE] `harness-ai.phase10.stream1.task1` Build the unsigned local macOS app, record artifact path/evidence, fix nonblocking package metadata warnings, and verify gates stay clean (scope: `package.json, .harness/plans/todo-plan.md, docs/evidence/**`; expected commit: `chore: verify local app packaging`). Result: Completed in commit `chore: verify local app packaging`.
22. [DONE] Git Commit: `chore: verify local app packaging` (hash: self)

## Phase 11 - First Release Gate (owner: User, updated: 2026-06-26)

### Stream: Release Decision

23. [DONE] `harness-ai.phase11.stream1.task1` Stop at the first user-facing release/build handoff and ask for explicit release-build confirmation or acceptance direction (scope: user workflow; expected commit: none). Result: User confirmed acceptance of the first local release and migration to the Harness AI workspace.

## Phase 12 - Scope Closeout (owner: Codex, updated: 2026-06-26)

### Stream: Bootstrap Acceptance

24. [DONE] `harness-ai.phase12.stream1.task1` Close the bootstrap scope after first local release acceptance and leave the workspace ready for the next Harness AI implementation cycle (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: accept first local release`). Result: Completed in commit `chore: accept first local release`.
25. [DONE] Git Commit: `chore: accept first local release` (hash: self)

## Phase 13 - Provider Selection Catalog (owner: Codex, updated: 2026-06-26)

### Stream: Provider Defaults

26. [DONE] `harness-ai.phase13.stream1.task1` Add a Provider Runtime catalog for all MVP providers and Core settings defaults for the selected model per provider (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: add provider selection catalog`). Result: Completed in commit `feat: add provider selection catalog`.
27. [DONE] Git Commit: `feat: add provider selection catalog` (hash: self)

## Phase 14 - Create Session Provider Picker (owner: Codex, updated: 2026-06-26)

### Stream: Sidebar Flow

28. [DONE] `harness-ai.phase14.stream1.task1` Show a provider choice card from the Create Session button and start a local session using the provider default model from settings (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/**, product-parts/application-shell/clusters/session-interface/modules/session-telemetry/src/**`; expected commit: `feat: choose provider when creating session`). Result: Completed in commit `feat: choose provider when creating session`.
29. [DONE] Git Commit: `feat: choose provider when creating session` (hash: self)

## Phase 15 - Provider Picker Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And UI Evidence

30. [DONE] `harness-ai.phase15.stream1.task1` Verify provider picker build/UI behavior and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider session picker`). Result: Completed in commit `chore: verify provider session picker`.
31. [DONE] Git Commit: `chore: verify provider session picker` (hash: self)

## Phase 16 - Provider Turn Runner Architecture (owner: Codex, updated: 2026-06-26)

### Stream: Runtime Boundary

32. [DONE] `harness-ai.phase16.stream1.task1` Add the Provider Runtime module boundary for dispatching real provider turns from Electron main (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/provider-runtime/clusters/provider-adapters/cluster.md, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/module.md, .harness/plans/todo-plan.md`; expected commit: `docs: add provider turn runner module`). Result: Completed in commit `docs: add provider turn runner module`.
33. [DONE] Git Commit: `docs: add provider turn runner module` (hash: self)

## Phase 17 - Provider Turn Runner Implementation (owner: Codex, updated: 2026-06-26)

### Stream: CLI And HTTP Dispatch

34. [IN_PROGRESS] `harness-ai.phase17.stream1.task1` Implement the provider turn runner for CLI-backed providers and HTTP-backed providers using runtime credentials only (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: run selected provider turns`).
35. [TODO] Git Commit: `feat: run selected provider turns` (hash: TBD)

## Phase 18 - Electron Provider IPC (owner: Codex, updated: 2026-06-26)

### Stream: Main Process Bridge

36. [TODO] `harness-ai.phase18.stream1.task1` Expose provider turn execution from Electron main to the renderer through preload IPC (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, package.json, .harness/plans/todo-plan.md`; expected commit: `feat: expose provider turn ipc`).
37. [TODO] Git Commit: `feat: expose provider turn ipc` (hash: TBD)

## Phase 19 - Session UI Provider Execution (owner: Codex, updated: 2026-06-26)

### Stream: Send Message

38. [TODO] `harness-ai.phase19.stream1.task1` Send chat input through the selected provider runner and render real responses or setup errors in the active session (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/session-interface/modules/input-controls/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: send turns to selected provider`).
39. [TODO] Git Commit: `feat: send turns to selected provider` (hash: TBD)

## Phase 20 - Provider Execution Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Evidence

40. [TODO] `harness-ai.phase20.stream1.task1` Verify build/package and provider execution error/success path, then record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider turn execution`).
41. [TODO] Git Commit: `chore: verify provider turn execution` (hash: TBD)
