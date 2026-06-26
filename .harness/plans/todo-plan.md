# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "harness-ai-codeai-provider-runtime-alignment-2026-06-26",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase33.stream1.task2",
  "expectedCommitMessage": "feat: add working provider adapter facades",
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

34. [DONE] `harness-ai.phase17.stream1.task1` Implement the provider turn runner for CLI-backed providers and HTTP-backed providers using runtime credentials only (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: run selected provider turns`). Result: Completed in commit `feat: run selected provider turns`.
35. [DONE] Git Commit: `feat: run selected provider turns` (hash: self)

## Phase 18 - Electron Provider IPC (owner: Codex, updated: 2026-06-26)

### Stream: Main Process Bridge

36. [DONE] `harness-ai.phase18.stream1.task1` Expose provider turn execution from Electron main to the renderer through preload IPC (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, package.json, .harness/plans/todo-plan.md`; expected commit: `feat: expose provider turn ipc`). Result: Completed in commit `feat: expose provider turn ipc`.
37. [DONE] Git Commit: `feat: expose provider turn ipc` (hash: self)

## Phase 19 - Session UI Provider Execution (owner: Codex, updated: 2026-06-26)

### Stream: Send Message

38. [DONE] `harness-ai.phase19.stream1.task1` Send chat input through the selected provider runner and render real responses or setup errors in the active session (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/session-interface/modules/input-controls/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: send turns to selected provider`). Result: Completed in commit `feat: send turns to selected provider`.
39. [DONE] Git Commit: `feat: send turns to selected provider` (hash: self)

## Phase 20 - Provider Execution Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Evidence

40. [DONE] `harness-ai.phase20.stream1.task1` Verify build/package and provider execution error/success path, then record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider turn execution`). Result: Completed in commit `chore: verify provider turn execution`.
41. [DONE] Git Commit: `chore: verify provider turn execution` (hash: self)

## Phase 21 - Packaged Renderer Hotfix (owner: Codex, updated: 2026-06-26)

### Stream: Asset Base

42. [DONE] `harness-ai.phase21.stream1.task1` Fix the packaged Electron renderer asset paths, rebuild the unsigned app, and record evidence (scope: `vite.config.ts, docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `fix: load packaged renderer assets`). Result: Completed in commit `fix: load packaged renderer assets`.
43. [DONE] Git Commit: `fix: load packaged renderer assets` (hash: self)

## Phase 22 - Project Manager Theme And Session Start (owner: Codex, updated: 2026-06-26)

### Stream: Dark Shell

44. [DONE] `harness-ai.phase22.stream1.task1` Apply the CodeAI Hub Project Manager dark tokens to the Harness AI shell and make the first screen start a provider session instead of showing a disconnected bootstrap session (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, .harness/plans/todo-plan.md`; expected commit: `feat: apply project manager theme and session start`). Result: Completed in commit `feat: apply project manager theme and session start`.
45. [DONE] Git Commit: `feat: apply project manager theme and session start` (hash: self)

## Phase 23 - Theme Build Verification (owner: Codex, updated: 2026-06-26)

### Stream: Package Check

46. [DONE] `harness-ai.phase23.stream1.task1` Rebuild the renderer/macOS app and record verification evidence for the themed session-start shell (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify project manager themed shell`). Result: Completed in commit `chore: verify project manager themed shell`.
47. [DONE] Git Commit: `chore: verify project manager themed shell` (hash: self)

## Phase 24 - Packaged CLI PATH Hotfix (owner: Codex, updated: 2026-06-26)

### Stream: Provider CLI Environment

48. [DONE] `harness-ai.phase24.stream1.task1` Add a packaged-app-safe CLI PATH for provider commands whose launcher uses `/usr/bin/env node` (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: provide cli path for packaged providers`). Result: Completed in commit `fix: provide cli path for packaged providers`.
49. [DONE] Git Commit: `fix: provide cli path for packaged providers` (hash: self)

## Phase 25 - CLI PATH Verification (owner: Codex, updated: 2026-06-26)

### Stream: Package Check

50. [DONE] `harness-ai.phase25.stream1.task1` Rebuild the macOS app and record evidence that provider CLI PATH handling is packaged (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify packaged provider cli path`). Result: Completed in commit `chore: verify packaged provider cli path`.
51. [DONE] Git Commit: `chore: verify packaged provider cli path` (hash: self)

## Phase 26 - Codex Node Launch Hotfix (owner: Codex, updated: 2026-06-26)

### Stream: Direct Node Runner

52. [DONE] `harness-ai.phase26.stream1.task1` Launch the Codex CLI through an explicit Node executable instead of relying on `/usr/bin/env node` from the packaged app environment (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: launch codex cli through node`). Result: Completed in commit `fix: launch codex cli through node`.
53. [DONE] Git Commit: `fix: launch codex cli through node` (hash: self)

## Phase 27 - Codex Node Launch Verification (owner: Codex, updated: 2026-06-26)

### Stream: Package Check

54. [DONE] `harness-ai.phase27.stream1.task1` Rebuild the macOS app and record evidence that the packaged provider runner contains the direct Codex Node launch path (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codex node launch`). Result: Completed in commit `chore: verify codex node launch`.
55. [DONE] Git Commit: `chore: verify codex node launch` (hash: self)

## Phase 28 - CodeAI Hub Provider Runtime Alignment (owner: Codex, updated: 2026-06-26)

### Stream: Reference Contract

56. [DONE] `harness-ai.phase28.stream1.task1` Create the CodeAI Hub provider/runtime alignment planning document and reopen the Harness AI execution scope around the reference path (scope: `docs/architecture/CodeAIHubProviderRuntimeAlignment.md, .harness/plans/todo-plan.md`; expected commit: `docs: plan codeai hub provider runtime alignment`). Result: Completed in commit `docs: plan codeai hub provider runtime alignment`.
57. [DONE] Git Commit: `docs: plan codeai hub provider runtime alignment` (hash: self)
58. [DONE] `harness-ai.phase28.stream1.task2` Update the product tree and module docs so provider execution is Core-owned and direct provider turn running is implementation debt, not the target architecture (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/**/module.md, product-parts/**/src/.gitkeep, .harness/plans/todo-plan.md`; expected commit: `docs: align provider runtime product tree`). Result: Completed in commit `docs: align provider runtime product tree`.
59. [DONE] Git Commit: `docs: align provider runtime product tree` (hash: self)

## Phase 29 - Core-Owned Session Dispatch (owner: Codex, updated: 2026-06-26)

### Stream: Session Boundary

60. [DONE] `harness-ai.phase29.stream1.task1` Add the Core session request handler shell, provider session binding contract, and event stream boundary without direct provider execution from UI or Electron host (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/core-runtime/clusters/session-runtime/modules/provider-session-binding/**, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/**`; expected commit: `feat: add core session dispatch boundary`). Result: Completed in commit `feat: add core session dispatch boundary`.
61. [DONE] Git Commit: `feat: add core session dispatch boundary` (hash: self)
62. [DONE] `harness-ai.phase29.stream1.task2` Rewire Electron IPC and the session UI to create sessions and send messages through the Core session dispatch boundary instead of the direct provider runner (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/**, package.json, .harness/plans/todo-plan.md`; expected commit: `feat: route session turns through core`). Result: Completed in commit `feat: route session turns through core`.
63. [DONE] Git Commit: `feat: route session turns through core` (hash: self)

## Phase 30 - Provider Adapter Contract (owner: Codex, updated: 2026-06-26)

### Stream: Provider Runtime Boundary

64. [DONE] `harness-ai.phase30.stream1.task1` Add the shared provider adapter contract and registry-owned adapter lookup modeled on CodeAI Hub `createSession/resumeSession/sendMessage/subscribe/closeSession` (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/**, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/**, product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/**`; expected commit: `feat: add provider adapter contract`). Result: Completed in commit `feat: add provider adapter contract`.
65. [DONE] Git Commit: `feat: add provider adapter contract` (hash: self)
66. [DONE] `harness-ai.phase30.stream1.task2` Replace the Codex direct CLI path with a CodeAI Hub-style Codex adapter shell that owns app-server process startup, provider home/auth preparation, and normalized event subscription (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/**, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/**, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/**`; expected commit: `feat: add codex app server adapter shell`). Result: Completed in commit `feat: add codex app server adapter shell`.
67. [DONE] Git Commit: `feat: add codex app server adapter shell` (hash: self)

## Phase 31 - Tooling Verification (owner: Codex, updated: 2026-06-26)

### Stream: Runtime Alignment Checks

68. [DONE] `harness-ai.phase31.stream1.task1` Run architecture, typecheck, tests, renderer build, and package verification for the Core-owned provider runtime path; record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codeai provider runtime alignment`). Result: Completed in commit `chore: verify codeai provider runtime alignment`.
69. [DONE] Git Commit: `chore: verify codeai provider runtime alignment` (hash: self)

## Phase 32 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Provider Session Retest

70. [TODO] `harness-ai.phase32.stream1.task1` User retests session creation and first provider turn through the Core-owned runtime path (scope: user workflow; expected commit: none). Continuation note: user requested implementation continue until provider sessions are usable.

## Phase 33 - Working Provider Sessions (owner: Codex, updated: 2026-06-26)

### Stream: Core Adapter Wiring

71. [DONE] `harness-ai.phase33.stream1.task1` Connect Core session dispatch to registered provider adapters and publish adapter events into the session event stream (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/core-runtime/clusters/session-runtime/modules/provider-session-binding/**, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/**`; expected commit: `feat: connect core dispatch to provider adapters`). Result: Completed in commit `feat: connect core dispatch to provider adapters`.
72. [DONE] Git Commit: `feat: connect core dispatch to provider adapters` (hash: self)
73. [IN_PROGRESS] `harness-ai.phase33.stream1.task2` Add working provider adapter facades for MVP provider choices behind the shared adapter contract (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/**, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/**`; expected commit: `feat: add working provider adapter facades`).
74. [TODO] Git Commit: `feat: add working provider adapter facades` (hash: TBD)
75. [TODO] `harness-ai.phase33.stream1.task3` Register provider adapters from the Electron app bootstrap so Create Session can start a dialog through the selected provider (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/**, product-parts/application-shell/clusters/session-interface/modules/session-window/**, package.json`; expected commit: `feat: register providers for desktop sessions`).
76. [TODO] Git Commit: `feat: register providers for desktop sessions` (hash: TBD)

## Phase 34 - Provider Session Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

77. [TODO] `harness-ai.phase34.stream1.task1` Verify architecture, typecheck, tests, renderer build, and unsigned macOS packaging for working provider sessions; record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify working provider sessions`).
78. [TODO] Git Commit: `chore: verify working provider sessions` (hash: TBD)

## Phase 35 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Provider Dialog Retest

79. [TODO] `harness-ai.phase35.stream1.task1` User retests creating a session and sending a first message through each configured provider (scope: user workflow; expected commit: none).
