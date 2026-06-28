# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "harness-ai-teal-studio-design-2026-06-27",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase168.stream1.task1",
  "expectedCommitMessage": null,
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
73. [DONE] `harness-ai.phase33.stream1.task2` Add working provider adapter facades for MVP provider choices behind the shared adapter contract (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/**, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/**`; expected commit: `feat: add working provider adapter facades`). Result: Completed in commit `feat: add working provider adapter facades`.
74. [DONE] Git Commit: `feat: add working provider adapter facades` (hash: self)
75. [DONE] `harness-ai.phase33.stream1.task3` Register provider adapters from the Electron app bootstrap so Create Session can start a dialog through the selected provider (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/**, product-parts/application-shell/clusters/session-interface/modules/session-window/**, scripts/dev-electron.mjs, tsconfig.runtime.json, package.json, .harness/plans/todo-plan.md`; expected commit: `feat: register providers for desktop sessions`). Result: Completed in commit `feat: register providers for desktop sessions`.
76. [DONE] Git Commit: `feat: register providers for desktop sessions` (hash: self)

## Phase 34 - Provider Session Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

77. [DONE] `harness-ai.phase34.stream1.task1` Verify architecture, typecheck, tests, renderer build, and unsigned macOS packaging for working provider sessions; record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify working provider sessions`). Result: Completed in commit `chore: verify working provider sessions`.
78. [DONE] Git Commit: `chore: verify working provider sessions` (hash: self)

## Phase 35 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Provider Dialog Retest

79. [TODO] `harness-ai.phase35.stream1.task1` User retests creating a session and sending a first message through each configured provider (scope: user workflow; expected commit: none). Continuation note: packaged Codex startup exposed provider home resolution under `app.asar`; hotfix follows.

## Phase 36 - Packaged Provider Home Hotfix (owner: Codex, updated: 2026-06-26)

### Stream: Runtime Writable Paths

80. [DONE] `harness-ai.phase36.stream1.task1` Prevent packaged provider runtime from using `app.asar` as a provider home workspace root and keep Codex app-server startup on writable paths (scope: `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, .harness/plans/todo-plan.md`; expected commit: `fix: resolve packaged provider home`). Result: Completed in commit `fix: resolve packaged provider home`.
81. [DONE] Git Commit: `fix: resolve packaged provider home` (hash: self)

## Phase 37 - Packaged Provider Home Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Smoke

82. [DONE] `harness-ai.phase37.stream1.task1` Rebuild runtime/macOS app, verify packaged startup no longer resolves provider home inside `app.asar`, and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify packaged provider home`). Result: Completed in commit `chore: verify packaged provider home`.
83. [DONE] Git Commit: `chore: verify packaged provider home` (hash: self)

## Phase 38 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Provider Dialog Retest

84. [TODO] `harness-ai.phase38.stream1.task1` User retests creating a session and sending a first message through each configured provider after packaged provider home fix (scope: user workflow; expected commit: none). Continuation note: GLM Native has no product-owned settings/auth surface yet; implementation follows.

## Phase 39 - System Provider Auth Settings (owner: Codex, updated: 2026-06-26)

### Stream: System Settings Backend

85. [DONE] `harness-ai.phase39.stream1.task1` Add Harness AI system provider settings under `~/.harness-ai/providers/<providerId>/settings.json`, let Core refresh provider adapters from those settings, and keep architecture checks out of ignored runtime state (scope: `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.ts, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, scripts/check-architecture.mjs, .harness/plans/todo-plan.md`; expected commit: `feat: add system provider auth settings`). Result: Completed in commit `feat: add system provider auth settings`.
86. [DONE] Git Commit: `feat: add system provider auth settings` (hash: self)

## Phase 40 - Provider Settings IPC (owner: Codex, updated: 2026-06-26)

### Stream: Renderer Bridge

87. [DONE] `harness-ai.phase40.stream1.task1` Expose provider system settings read/write from Electron preload to the renderer (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, .harness/plans/todo-plan.md`; expected commit: `feat: expose provider settings ipc`). Result: Completed in commit `feat: expose provider settings ipc`.
88. [DONE] Git Commit: `feat: expose provider settings ipc` (hash: self)

## Phase 41 - GLM Native Settings UI (owner: Codex, updated: 2026-06-26)

### Stream: Minimal Settings Panel

89. [DONE] `harness-ai.phase41.stream1.task1` Add a minimal in-app Settings panel for GLM Native API key, base URL, and default model so the provider can be tested before full settings architecture (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, .harness/plans/todo-plan.md`; expected commit: `feat: add glm native settings ui`). Result: Completed in commit `feat: add glm native settings ui`.
90. [DONE] Git Commit: `feat: add glm native settings ui` (hash: self)

## Phase 42 - GLM Native Settings Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

91. [DONE] `harness-ai.phase42.stream1.task1` Verify system provider settings, rebuild the unsigned macOS app, and record evidence for GLM Native configuration (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify glm native settings`). Result: Completed in commit `chore: verify glm native settings`.
92. [DONE] Git Commit: `chore: verify glm native settings` (hash: self)

## Phase 43 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Provider Dialog Retest

93. [DONE] `harness-ai.phase43.stream1.task1` User retests creating sessions and sending a first message through each configured provider after GLM Native settings are available (scope: user workflow; expected commit: none). Result: GLM Native settings path works; user requested full Project Manager settings parity next.

## Phase 44 - Project Manager Settings Parity Planning (owner: Codex, updated: 2026-06-26)

### Stream: Reference Scope

94. [DONE] `harness-ai.phase44.stream1.task1` Define the Harness AI settings parity scope from CodeAI Hub Project Manager and prevent local CodeAI runtime residue from entering planned commits/checks (scope: `.gitignore, scripts/check-architecture.mjs, docs/architecture/ProjectManagerSettingsParity.md, .harness/plans/todo-plan.md`; expected commit: `docs: plan project manager settings parity`). Result: Completed in commit `docs: plan project manager settings parity`.
95. [DONE] Git Commit: `docs: plan project manager settings parity` (hash: self)

## Phase 45 - Settings Persistence And IPC (owner: Codex, updated: 2026-06-26)

### Stream: Core Settings Contract

96. [DONE] `harness-ai.phase45.stream1.task1` Add a Project Manager-style settings snapshot, defaults, system/workspace persistence, and provider auth compatibility in Core Runtime (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: add project manager settings store`). Result: Completed in commit `feat: add project manager settings store`.
97. [DONE] Git Commit: `feat: add project manager settings store` (hash: self)
98. [DONE] `harness-ai.phase45.stream1.task2` Expose full settings load/save/reset operations through the Electron Core bridge and preload contract (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat: expose full settings ipc`). Result: Completed in commit `feat: expose full settings ipc`.
99. [DONE] Git Commit: `feat: expose full settings ipc` (hash: self)

## Phase 46 - Project Manager Settings Surface (owner: Codex, updated: 2026-06-26)

### Stream: Renderer Settings UI

100. [DONE] `harness-ai.phase46.stream1.task1` Build the Project Manager-style Settings modal with provider tabs, General localization/core controls, and excluded voice/response/native-capture options (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/localization-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/recovery-controls-ui/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: add project manager settings surface`). Result: Completed in commit `feat: add project manager settings surface`.
101. [DONE] Git Commit: `feat: add project manager settings surface` (hash: self)
102. [DONE] `harness-ai.phase46.stream1.task2` Replace the temporary GLM-only settings panel in the session window with the full settings surface (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, .harness/plans/todo-plan.md`; expected commit: `feat: open full settings surface from session`). Result: Completed in commit `feat: open full settings surface from session`.
103. [DONE] Git Commit: `feat: open full settings surface from session` (hash: self)

## Phase 47 - Settings Surface Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

104. [DONE] `harness-ai.phase47.stream1.task1` Verify architecture, typecheck, tests, renderer build, unsigned macOS packaging, and settings persistence evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify project manager settings surface`). Result: Completed in commit `chore: verify project manager settings surface`.
105. [DONE] Git Commit: `chore: verify project manager settings surface` (hash: self)

## Phase 48 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Settings Retest

106. [DONE] `harness-ai.phase48.stream1.task1` User retests the Project Manager-style settings surface and provider session startup through saved settings (scope: user workflow; expected commit: none). Result: User rejected temporary/disabled settings behavior; settings must be completed instead of leaving placeholders.

## Phase 49 - Settings Completion (owner: Codex, updated: 2026-06-26)

### Stream: No Temporary Controls

107. [DONE] `harness-ai.phase49.stream1.task1` Make visible General Core controls functional and remove disabled settings placeholders by wiring Core restart/refresh through IPC and Settings UI status (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/recovery-controls-ui/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: complete settings core controls`). Result: Completed in commit `feat: complete settings core controls`.
108. [DONE] Git Commit: `feat: complete settings core controls` (hash: self)
109. [DONE] `harness-ai.phase49.stream1.task2` Rebuild, package, and record evidence that Settings has no disabled temporary controls in the shipped unsigned app (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify completed settings controls`). Result: Completed in commit `chore: verify completed settings controls`.
110. [DONE] Git Commit: `chore: verify completed settings controls` (hash: self)

## Phase 50 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Completed Settings Retest

111. [DONE] `harness-ai.phase50.stream1.task1` User retests completed settings controls and provider session startup through saved settings (scope: user workflow; expected commit: none). Result: User requested carrying CodeAI Hub agent/process instructions into Harness AI before the next session starts from this workspace.

## Phase 51 - Agent Instruction Carryover (owner: Codex, updated: 2026-06-26)

### Stream: Workspace Recovery Rules

112. [DONE] `harness-ai.phase51.stream1.task1` Port the valuable CodeAI Hub AGENTS rules into Harness AI paths and add the missing todo-plan template artifact (scope: `AGENTS.md, .harness/plans/todo-plan.template.md, .harness/plans/todo-plan.md`; expected commit: `docs: align harness ai agent instructions`). Result: Completed in commit `docs: align harness ai agent instructions`.
113. [DONE] Git Commit: `docs: align harness ai agent instructions` (hash: self)

## Phase 52 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: New Workspace Session Start

114. [DONE] `harness-ai.phase52.stream1.task1` User starts the next session from the Harness AI workspace and verifies AGENTS/planning recovery behavior (scope: user workflow; expected commit: none). Result: User clarified that all CodeAI Hub quality gates, not only instructions, must be active in Harness AI.

## Phase 53 - CodeAI Quality Gate Parity (owner: Codex, updated: 2026-06-26)

### Stream: Gate Tooling And Hooks

115. [DONE] `harness-ai.phase53.stream1.task1` Add CodeAI Hub quality gate tooling/config and apply the first Ultracite normalization required by the transferred gate set (scope: `package.json, package-lock.json, biome.jsonc, knip.json, .harness/plans/todo-plan.md, product-parts/**, scripts/**, tsconfig*.json, vite.config.ts, index.html`; expected commit: `chore: add codeai quality gate tooling`). Result: Completed in commit `chore: add codeai quality gate tooling`.
116. [DONE] Git Commit: `chore: add codeai quality gate tooling` (hash: self)
117. [DONE] `harness-ai.phase53.stream1.task2` Wire CodeAI Hub-style pre-commit/pre-push hooks and AGENTS rules to the real Harness quality gates (scope: `.husky/pre-commit, .husky/pre-push, AGENTS.md, .harness/plans/todo-plan.md`; expected commit: `chore: wire codeai quality hooks`). Result: Completed in commit `chore: wire codeai quality hooks`.
118. [DONE] Git Commit: `chore: wire codeai quality hooks` (hash: self)

## Phase 54 - Quality Gate Verification (owner: Codex, updated: 2026-06-26)

### Stream: Gate Evidence

119. [DONE] `harness-ai.phase54.stream1.task1` Run the transferred quality gates and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codeai quality gates`). Result: Completed in commit `chore: verify codeai quality gates`.
120. [DONE] Git Commit: `chore: verify codeai quality gates` (hash: self)

## Phase 55 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: New Workspace Session Start

121. [DONE] `harness-ai.phase55.stream1.task1` User starts the next session from the Harness AI workspace and verifies AGENTS/planning/gate recovery behavior (scope: user workflow; expected commit: none). Result: Recovery behavior verified; user requested exact CodeAI Hub Settings UI parity before acceptance.

## Phase 56 - CodeAI Settings Layout Parity (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

122. [DONE] `harness-ai.phase56.stream1.task1` Rework the Harness AI Settings surface to match the CodeAI Hub Project Manager Settings layout and controls without copying CodeAI modules wholesale (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/localization-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/recovery-controls-ui/src/**`; expected commit: `feat: match codeai settings layout`). Result: Completed in commit `feat: match codeai settings layout`.
123. [DONE] Git Commit: `feat: match codeai settings layout` (hash: self)

## Phase 57 - Settings Layout Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Evidence

124. [DONE] `harness-ai.phase57.stream1.task1` Run required gates/builds and record evidence for CodeAI Hub Settings layout parity (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codeai settings layout`). Result: Completed in commit `chore: verify codeai settings layout`.
125. [DONE] Git Commit: `chore: verify codeai settings layout` (hash: self)

## Phase 58 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Settings Retest

126. [DONE] `harness-ai.phase58.stream1.task1` User retests the CodeAI Hub-style Settings surface in Harness AI (scope: user workflow; expected commit: none). Result: User still saw the old packaged Settings UI; source was updated, but the macOS app artifact had not been rebuilt.

## Phase 59 - Settings Layout Packaged App Rebuild (owner: Codex, updated: 2026-06-26)

### Stream: Package Delivery

127. [DONE] `harness-ai.phase59.stream1.task1` Rebuild the unsigned macOS app so the delivered Harness AI artifact includes the CodeAI Hub-style Settings surface (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: rebuild app with codeai settings layout`). Result: Completed in commit `chore: rebuild app with codeai settings layout`.
128. [DONE] Git Commit: `chore: rebuild app with codeai settings layout` (hash: self)

## Phase 60 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Settings Retest

129. [DONE] `harness-ai.phase60.stream1.task1` User relaunches the rebuilt app and retests the Settings surface (scope: user workflow; expected commit: none). Result: User rejected approximate Settings parity; the Harness AI Settings surface must be an exact visual and functional port of the CodeAI Hub Settings surface.

## Phase 61 - Exact CodeAI Settings Surface Port (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

130. [DONE] `harness-ai.phase61.stream1.task1` Port the CodeAI Hub Settings surface visual structure, labels, cards, footer/header, General tab, and available provider controls into Harness AI modules without inventing new UI patterns (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/localization-settings-ui/src/**, product-parts/application-shell/clusters/settings-surface/modules/recovery-controls-ui/src/**, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`; expected commit: `feat: port exact codeai settings surface`). Result: Completed in commit `feat: port exact codeai settings surface`.
131. [DONE] Git Commit: `feat: port exact codeai settings surface` (hash: self)

## Phase 62 - Exact Settings Verification And Package (owner: Codex, updated: 2026-06-26)

### Stream: Build And Evidence

132. [DONE] `harness-ai.phase62.stream1.task1` Verify and package the exact CodeAI Settings surface port, then record evidence against the reference screenshots (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify exact codeai settings surface`). Result: Completed in commit `chore: verify exact codeai settings surface`.
133. [DONE] Git Commit: `chore: verify exact codeai settings surface` (hash: self)

## Phase 63 - User Workflow Acceptance (owner: User, updated: 2026-06-26)

### Stream: Settings Retest

134. [DONE] `harness-ai.phase63.stream1.task1` User retests the exact CodeAI Hub-style Settings surface in the rebuilt app (scope: user workflow; expected commit: none). Result: User rejected the approximate provider-tab implementation; Harness AI must match CodeAI Hub Settings one-for-one, including provider tab layout, model lists, version scanning/update controls, and tab styling.

## Phase 64 - Exact CodeAI Settings Provider Tabs Port (owner: Codex, updated: 2026-06-26)

### Stream: Provider Settings Surface

135. [DONE] `harness-ai.phase64.stream1.task1` Port CodeAI Hub Settings provider tabs into Harness AI with exact tab styling, Claude model/version/thinking/session controls, provider CLI/SDK version scan/update IPC, and matching provider tab content without inventing new UI patterns (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, product-parts/provider-runtime/**`; expected commit: `feat: port codeai settings provider tabs`). Result: Completed in commit `feat: port codeai settings provider tabs`.
136. [DONE] Git Commit: `feat: port codeai settings provider tabs` (hash: self)

## Phase 65 - Exact Provider Settings Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

137. [DONE] `harness-ai.phase65.stream1.task1` Verify and package the exact CodeAI Hub provider Settings tab port for the delivered macOS app artifact (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codeai settings provider tabs`). Result: Completed in commit `chore: verify codeai settings provider tabs`.
138. [DONE] Git Commit: `chore: verify codeai settings provider tabs` (hash: self)

## Phase 66 - CodeAI Settings Local Models And OpenCode Alignment (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

139. [DONE] `harness-ai.phase66.stream1.task1` Remove Text-to-Speech and Provider Native Request Capture from General, port CodeAI Hub Local Models behavior from LM Studio discovery, and correct OpenCode Settings content against the reference implementation (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, product-parts/provider-runtime/**`; expected commit: `feat: align codeai settings local models and opencode`). Result: Completed in commit `feat: align codeai settings local models and opencode`.
140. [DONE] Git Commit: `feat: align codeai settings local models and opencode` (hash: self)

## Phase 67 - Local Models And OpenCode Settings Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

141. [DONE] `harness-ai.phase67.stream1.task1` Verify and package the Settings changes for the delivered macOS app artifact (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify local models and opencode settings`). Result: Completed in commit `chore: verify local models and opencode settings`.
142. [DONE] Git Commit: `chore: verify local models and opencode settings` (hash: self)

## Phase 68 - Settings Tab Active State Styling (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

143. [DONE] `harness-ai.phase68.stream1.task1` Rework the Settings section active tab styling so selected sections read as tabs and remain consistent with the Settings model-row visual language (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: align settings tab active styling`). Result: Completed in commit `fix: align settings tab active styling`.
144. [DONE] Git Commit: `fix: align settings tab active styling` (hash: self)

## Phase 69 - Settings Tab Styling Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

145. [DONE] `harness-ai.phase69.stream1.task1` Verify and package the Settings tab active-state styling for the delivered macOS app artifact (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify settings tab active styling`). Result: Completed in commit `chore: verify settings tab active styling`.
146. [DONE] Git Commit: `chore: verify settings tab active styling` (hash: self)

## Phase 70 - Settings Selected Tab State Refinement (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

147. [DONE] `harness-ai.phase70.stream1.task1` Refine Settings selected tab styling so hover and selected states keep the same tab geometry while selected uses the model-row blue fill and outline (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: make settings selected tabs match model state`). Result: Completed in commit `fix: make settings selected tabs match model state`.
148. [DONE] Git Commit: `fix: make settings selected tabs match model state` (hash: self)

## Phase 71 - Settings Selected Tab Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

149. [DONE] `harness-ai.phase71.stream1.task1` Verify and package the selected-tab styling refinement for the delivered macOS app artifact (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify selected settings tab styling`). Result: Completed in commit `chore: verify selected settings tab styling`.
150. [DONE] Git Commit: `chore: verify selected settings tab styling` (hash: self)

## Phase 72 - Settings Selected Tab Class Fix (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

151. [DONE] `harness-ai.phase72.stream1.task1` Fix the Settings selected tab class composition so active tabs keep the base tab CSS, fixed width, and selected-model blue fill (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, .harness/plans/todo-plan.md`; expected commit: `fix: apply selected settings tab class`). Result: Completed in commit `fix: apply selected settings tab class`.
152. [DONE] Git Commit: `fix: apply selected settings tab class` (hash: self)

## Phase 73 - Settings Selected Tab Class Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

153. [DONE] `harness-ai.phase73.stream1.task1` Verify and package the selected tab class fix for the delivered macOS app artifact (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify selected tab class fix`). Result: Completed in commit `chore: verify selected tab class fix`.
154. [DONE] Git Commit: `chore: verify selected tab class fix` (hash: self)

## Phase 74 - Remove Dead Response Mode Settings (owner: Codex, updated: 2026-06-26)

### Stream: Settings Surface

155. [DONE] `harness-ai.phase74.stream1.task1` Remove the unused General Response Mode UI and settings model/persistence fields from Harness AI (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-controls.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, docs/**, .harness/plans/todo-plan.md`; expected commit: `fix: remove dead response mode settings`). Result: Completed in commit `fix: remove dead response mode settings`.
156. [DONE] Git Commit: `fix: remove dead response mode settings` (hash: self)

## Phase 75 - Response Mode Removal Verification (owner: Codex, updated: 2026-06-26)

### Stream: Build And Package

157. [DONE] `harness-ai.phase75.stream1.task1` Verify and package the Settings surface after Response Mode removal (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify response mode removal`). Result: Completed in commit `chore: verify response mode removal`.
158. [DONE] Git Commit: `chore: verify response mode removal` (hash: self)

## Phase 76 - OpenRouter Settings Model Search (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

159. [DONE] `harness-ai.phase76.stream1.task1` Add CodeAI Hub-style OpenRouter model slug search and endpoint selection to the Settings OpenRouter tab (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-model-search.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-settings-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, .harness/plans/todo-plan.md`; expected commit: `feat: add openrouter model search settings`). Result: Completed in commit `feat: add openrouter model search settings`.
160. [DONE] Git Commit: `feat: add openrouter model search settings` (hash: self)

## Phase 77 - OpenRouter Settings Search Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

161. [DONE] `harness-ai.phase77.stream1.task1` Verify and package the OpenRouter Settings model search change (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify openrouter model search settings`). Result: Completed in commit `chore: verify openrouter model search settings`.
162. [DONE] Git Commit: `chore: verify openrouter model search settings` (hash: self)

## Phase 78 - OpenRouter Translation Profile Pickers (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

163. [DONE] `harness-ai.phase78.stream1.task1` Reuse the OpenRouter model search and endpoint selection for UI and reasoning translation profiles in Settings (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-settings-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, .harness/plans/todo-plan.md`; expected commit: `fix: add openrouter translation profile pickers`). Result: Completed in commit `fix: add openrouter translation profile pickers`.
164. [DONE] Git Commit: `fix: add openrouter translation profile pickers` (hash: self)

## Phase 79 - OpenRouter Translation Profile Picker Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

165. [DONE] `harness-ai.phase79.stream1.task1` Verify and package the OpenRouter translation profile picker change (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify openrouter translation profile pickers`). Result: Completed in commit `chore: verify openrouter translation profile pickers`.
166. [DONE] Git Commit: `chore: verify openrouter translation profile pickers` (hash: self)

## Phase 80 - OpenRouter Profile Section Separation (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

167. [DONE] `harness-ai.phase80.stream1.task1` Visually separate UI and reasoning OpenRouter translation profile pickers into distinct Settings blocks (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: separate openrouter profile sections`). Result: Completed in commit `fix: separate openrouter profile sections`.
168. [DONE] Git Commit: `fix: separate openrouter profile sections` (hash: self)

## Phase 81 - OpenRouter Profile Section Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

169. [DONE] `harness-ai.phase81.stream1.task1` Verify and package the OpenRouter profile section separation change (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify openrouter profile sections`). Result: Completed in commit `chore: verify openrouter profile sections`.
170. [DONE] Git Commit: `chore: verify openrouter profile sections` (hash: self)

## Phase 82 - OpenRouter Endpoint Latency Helper (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

171. [DONE] `harness-ai.phase82.stream1.task1` Add OpenRouter endpoint metrics and live latency probe support for Settings (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-model-search.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-endpoint-latency.ts, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-endpoint-latency.test.mjs, .harness/plans/todo-plan.md`; expected commit: `feat: add openrouter endpoint latency helper`). Result: Completed in commit `feat: add openrouter endpoint latency helper`.
172. [DONE] Git Commit: `feat: add openrouter endpoint latency helper` (hash: self)

## Phase 83 - OpenRouter Endpoint Latency UI (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

173. [DONE] `harness-ai.phase83.stream1.task1` Add grey-green latency test UI to each OpenRouter model picker in Settings (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-settings-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `feat: add openrouter endpoint latency ui`). Result: Completed in commit `feat: add openrouter endpoint latency ui`.
174. [DONE] Git Commit: `feat: add openrouter endpoint latency ui` (hash: self)

## Phase 84 - OpenRouter Endpoint Latency Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

175. [DONE] `harness-ai.phase84.stream1.task1` Verify and package OpenRouter endpoint latency testing in Settings (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify openrouter endpoint latency ui`). Result: Completed in commit `chore: verify openrouter endpoint latency ui`.
176. [DONE] Git Commit: `chore: verify openrouter endpoint latency ui` (hash: self)

## Phase 85 - OpenRouter Translation Profiles In General (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

177. [DONE] `harness-ai.phase85.stream1.task1` Show selected OpenRouter UI and reasoning translation profile models in the General localization engine dropdowns (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, .harness/plans/todo-plan.md`; expected commit: `fix: show openrouter translation profiles in general`). Result: Completed in commit `fix: show openrouter translation profiles in general`.
178. [DONE] Git Commit: `fix: show openrouter translation profiles in general` (hash: self)

## Phase 86 - OpenRouter Translation Profiles In General Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

179. [DONE] `harness-ai.phase86.stream1.task1` Verify and package OpenRouter translation profile models in General localization engine dropdowns (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify openrouter translation profile dropdowns`). Result: Completed in commit `chore: verify openrouter translation profile dropdowns`.
180. [DONE] Git Commit: `chore: verify openrouter translation profile dropdowns` (hash: self)

## Phase 87 - Reference Session Panels (owner: Codex, updated: 2026-06-27)

### Stream: Session Surface

181. [DONE] `harness-ai.phase87.stream1.task1` Port the reference session panel layout for session id, dialog, input, and status using Core events/settings as display inputs (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, .harness/plans/todo-plan.md`; expected commit: `feat: port reference session panels`). Result: Completed in commit `feat: port reference session panels`.
182. [DONE] Git Commit: `feat: port reference session panels` (hash: self)

## Phase 88 - Reference Session Panels Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

183. [DONE] `harness-ai.phase88.stream1.task1` Verify and package the reference session panel layout (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reference session panels`). Result: Completed in commit `chore: verify reference session panels`.
184. [DONE] Git Commit: `chore: verify reference session panels` (hash: self)

## Phase 89 - Sidebar-Owned Session Start (owner: Codex, updated: 2026-06-27)

### Stream: Session Surface Placement

185. [DONE] `harness-ai.phase89.stream1.task1` Keep the left sidebar visible, make it the only new-session entry point, and render reference session panels only when a Core session exists (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, .harness/plans/todo-plan.md`; expected commit: `fix: keep session panels inside sidebar shell`). Result: Completed in commit `fix: keep session panels inside sidebar shell`.
186. [DONE] Git Commit: `fix: keep session panels inside sidebar shell` (hash: self)

## Phase 90 - Sidebar Session Surface Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

187. [DONE] `harness-ai.phase90.stream1.task1` Verify and package sidebar-owned session start with reference panels in the right workspace only after session creation (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify sidebar session surface`). Result: Completed in commit `chore: verify sidebar session surface`.
188. [DONE] Git Commit: `chore: verify sidebar session surface` (hash: self)

## Phase 91 - Session Status Panel Settings Button (owner: Codex, updated: 2026-06-27)

### Stream: Session Surface

189. [DONE] `harness-ai.phase91.stream1.task1` Remove the redundant Settings control from the bottom session status panel while keeping Settings in the left sidebar (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, .harness/plans/todo-plan.md`; expected commit: `fix: remove settings from session status panel`). Result: Completed in commit `fix: remove settings from session status panel`.
190. [DONE] Git Commit: `fix: remove settings from session status panel` (hash: self)

## Phase 92 - Session Status Panel Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

191. [DONE] `harness-ai.phase92.stream1.task1` Verify and package the session status panel without the redundant Settings control (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify session status panel settings removal`). Result: Completed in commit `chore: verify session status panel settings removal`.
192. [DONE] Git Commit: `chore: verify session status panel settings removal` (hash: self)

## Phase 93 - Input File Path Bridge (owner: Codex, updated: 2026-06-27)

### Stream: Electron Bridge

193. [DONE] `harness-ai.phase93.stream1.task1` Expose a minimal Electron preload bridge for resolving dropped File objects to local paths (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, .harness/plans/todo-plan.md`; expected commit: `feat: expose dropped file paths to renderer`). Result: Completed in commit `feat: expose dropped file paths to renderer`.
194. [DONE] Git Commit: `feat: expose dropped file paths to renderer` (hash: self)

## Phase 94 - Reference Input Field Behaviors (owner: Codex, updated: 2026-06-27)

### Stream: Session Input

195. [DONE] `harness-ai.phase94.stream1.task1` Restore reference input textarea behaviors: auto-height, cursor insertion, copy/paste normalization, and Shift file drag/drop path insertion (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-input-textarea.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-input-paths.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-input-paths.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, .harness/plans/todo-plan.md`; expected commit: `feat: restore reference input file handling`). Result: Completed in commit `feat: restore reference input file handling`.
196. [DONE] Git Commit: `feat: restore reference input file handling` (hash: self)

## Phase 95 - Reference Input Field Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

197. [DONE] `harness-ai.phase95.stream1.task1` Verify and package restored reference input field behaviors (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reference input file handling`). Result: Completed in commit `chore: verify reference input file handling`.
198. [DONE] Git Commit: `chore: verify reference input file handling` (hash: self)

## Phase 96 - Core Authority Rule (owner: Codex, updated: 2026-06-27)

### Stream: Development Directives

199. [DONE] `harness-ai.phase96.stream1.task1` Codify that UI and transport surfaces are never sources of product or workflow truth; Core/shared contracts own truth and UI only renders or submits input (scope: `AGENTS.md, .harness/plans/todo-plan.md`; expected commit: `docs: codify core authority rule`). Result: Completed in commit `docs: codify core authority rule`.
200. [DONE] Git Commit: `docs: codify core authority rule` (hash: self)

## Phase 97 - Core Usage Telemetry (owner: Codex, updated: 2026-06-27)

### Stream: Provider Truth

201. [DONE] `harness-ai.phase97.stream1.task1` Add provider-owned usage/context telemetry derivation and publish Core session telemetry events from provider events and bindings (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/**, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/session-provider-adapter-helpers.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`; expected commit: `feat: publish core usage telemetry`). Result: Completed in commit `feat: publish core usage telemetry`.
202. [DONE] Git Commit: `feat: publish core usage telemetry` (hash: self)

## Phase 98 - Session Usage Panels Display (owner: Codex, updated: 2026-06-27)

### Stream: Display Only

203. [DONE] `harness-ai.phase98.stream1.task1` Render the top limit panel and bottom token panel from Core telemetry only, matching reference layout without renderer-owned provider truth (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-telemetry/src/session-telemetry-facade.tsx`; expected commit: `feat: render core usage telemetry panels`). Result: Completed in commit `feat: render core usage telemetry panels`.
204. [DONE] Git Commit: `feat: render core usage telemetry panels` (hash: self)

## Phase 99 - Provider Usage Telemetry Scope Audit (owner: Codex, updated: 2026-06-27)

### Stream: Provider Truth

205. [DONE] `harness-ai.phase99.stream1.task1` Verify Kimi, GLM Native, GLM OpenCode, and OpenRouter telemetry mapping and keep each provider on its own Core/provider telemetry scope (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: split provider usage telemetry scopes`). Result: Completed in commit `fix: split provider usage telemetry scopes`.
206. [DONE] Git Commit: `fix: split provider usage telemetry scopes` (hash: self)

## Phase 100 - Core Workspace Registry (owner: Codex, updated: 2026-06-27)

### Stream: Workspace Truth

207. [DONE] `harness-ai.phase100.stream1.task1` Move known/active workspace list into Core-owned registry operations with stable ids and add coverage for adding/selecting workspaces (scope: `product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/**, .harness/plans/todo-plan.md`; expected commit: `feat: manage workspaces in core`). Result: Completed in commit `feat: manage workspaces in core`.
208. [DONE] Git Commit: `feat: manage workspaces in core` (hash: self)

## Phase 101 - Workspace And Detached Window Bridge (owner: Codex, updated: 2026-06-27)

### Stream: Electron Host

209. [DONE] `harness-ai.phase101.stream1.task1` Expose Core workspace/session APIs, broadcast Core events to all windows, and open detached session BrowserWindows from the Electron host (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, .harness/plans/todo-plan.md`; expected commit: `feat: bridge workspace and detached sessions`). Result: Completed in commit `feat: bridge workspace and detached sessions`.
210. [DONE] Git Commit: `feat: bridge workspace and detached sessions` (hash: self)

## Phase 102 - Workspace Session UI (owner: Codex, updated: 2026-06-27)

### Stream: Session Surface

211. [DONE] `harness-ai.phase102.stream1.task1` Add the workspace dropdown, bind the session list to the selected workspace, and render detached session windows from Core session events (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-routing.ts, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, .harness/plans/todo-plan.md`; expected commit: `feat: add workspace switcher and detached session windows`). Result: Completed in commit `feat: add workspace switcher and detached session windows`.
212. [DONE] Git Commit: `feat: add workspace switcher and detached session windows` (hash: self)

## Phase 103 - Workspace Registry Bundle Safety (owner: Codex, updated: 2026-06-27)

### Stream: Renderer Compatibility

213. [DONE] `harness-ai.phase103.stream1.task1` Remove Node-only path usage from the shared workspace registry facade so renderer imports stay browser-safe (scope: `product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: keep workspace registry renderer safe`). Result: Completed in commit `fix: keep workspace registry renderer safe`.
214. [DONE] Git Commit: `fix: keep workspace registry renderer safe` (hash: self)

## Phase 104 - Core Session Restore (owner: Codex, updated: 2026-06-27)

### Stream: Core Truth Persistence

215. [DONE] `harness-ai.phase104.stream1.task1` Persist Core-owned workspace registry, session index, and session event replay so session lists and detached/opened sessions survive Core/app reloads without UI truth (scope: `product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, .gitignore, .harness/plans/todo-plan.md`; expected commit: `feat: persist core workspaces and sessions`). Result: Completed in commit `feat: persist core workspaces and sessions`.
216. [DONE] Git Commit: `feat: persist core workspaces and sessions` (hash: self)

## Phase 105 - Session Restore Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

217. [DONE] `harness-ai.phase105.stream1.task1` Run plan validation, focused tests, build, package the macOS app, and record restore verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify core session restore`). Result: Completed in commit `chore: verify core session restore`.
218. [DONE] Git Commit: `chore: verify core session restore` (hash: self)

## Phase 106 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

219. [TODO] `harness-ai.phase106.stream1.task1` User retests workspace switching, session list restore, and detached session replay after Core/app restart (scope: user workflow; expected commit: none). Retest found a close-time Electron destroyed-object bug; hotfix follows.

## Phase 107 - Window Close Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Electron Host

220. [DONE] `harness-ai.phase107.stream1.task1` Prevent the Core bridge window detach cleanup from reading BrowserWindow webContents after the window has been destroyed (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, .harness/plans/todo-plan.md`; expected commit: `fix: avoid destroyed webcontents on close`). Result: Completed in commit `fix: avoid destroyed webcontents on close`.
221. [DONE] Git Commit: `fix: avoid destroyed webcontents on close` (hash: self)

## Phase 108 - Window Close Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

222. [DONE] `harness-ai.phase108.stream1.task1` Run focused gates, package the macOS app, and record close hotfix verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify window close hotfix`). Result: Completed in commit `chore: verify window close hotfix`.
223. [DONE] Git Commit: `chore: verify window close hotfix` (hash: self)

## Phase 109 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

224. [TODO] `harness-ai.phase109.stream1.task1` User retests closing Harness AI and detached windows without a main-process JavaScript error (scope: user workflow; expected commit: none). Retest found Kimi alias config and duplicate provider error output; hotfix follows.

## Phase 110 - Kimi Alias Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Provider Runtime

225. [DONE] `harness-ai.phase110.stream1.task1` Configure CodeAI Kimi model aliases through Kimi CLI environment metadata and avoid duplicate Core error messages for one failed provider turn (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/**, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: configure kimi code aliases`). Result: Completed in commit `fix: configure kimi code aliases`.
226. [DONE] Git Commit: `fix: configure kimi code aliases` (hash: self)

## Phase 111 - Kimi Alias Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

227. [DONE] `harness-ai.phase111.stream1.task1` Run focused provider/Core tests, package the macOS app, and record Kimi alias verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify kimi alias hotfix`). Result: Completed in commit `chore: verify kimi alias hotfix`.
228. [DONE] Git Commit: `chore: verify kimi alias hotfix` (hash: self)

## Phase 112 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

229. [TODO] `harness-ai.phase112.stream1.task1` User retests sending a Kimi request with `kimi-k2.7-code` from the packaged app (scope: user workflow; expected commit: none). Retest found missing token usage telemetry for non-HTTP providers; hotfix follows.

## Phase 113 - Provider Token Usage Fallback (owner: Codex, updated: 2026-06-27)

### Stream: Provider Runtime

230. [DONE] `harness-ai.phase113.stream1.task1` Emit provider-owned token usage fallback telemetry for CLI/Codex providers when the upstream provider does not send exact token usage (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/**, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/**, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: emit provider token usage fallback`). Result: Completed in commit `fix: emit provider token usage fallback`.
231. [DONE] Git Commit: `fix: emit provider token usage fallback` (hash: self)

## Phase 114 - Token Usage Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

232. [DONE] `harness-ai.phase114.stream1.task1` Run focused telemetry tests, package the macOS app, and record provider token usage verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider token usage fallback`). Result: Completed in commit `chore: verify provider token usage fallback`.
233. [DONE] Git Commit: `chore: verify provider token usage fallback` (hash: self)

## Phase 115 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

234. [TODO] `harness-ai.phase115.stream1.task1` User retests token usage display after one turn in Claude, Codex, Kimi, OpenCode, GLM, and OpenRouter sessions (scope: user workflow; expected commit: none). Retest found provider CLI/SDK version detection and update buttons broken; hotfix follows.

## Phase 116 - Provider Version Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Settings Bridge

235. [DONE] `harness-ai.phase116.stream1.task1` Fix packaged-app provider CLI/SDK current/latest version detection and enable manual update buttons for Claude, Codex, and OpenCode targets (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, .harness/plans/todo-plan.md`; expected commit: `fix: detect provider tool versions`). Result: Completed in commit `fix: detect provider tool versions`.
236. [DONE] Git Commit: `fix: detect provider tool versions` (hash: self)

## Phase 117 - Provider Version Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

237. [DONE] `harness-ai.phase117.stream1.task1` Run focused version checks, package the macOS app, and record provider version/update verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider version controls`). Result: Completed in commit `chore: verify provider version controls`.
238. [DONE] Git Commit: `chore: verify provider version controls` (hash: self)

## Phase 118 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

239. [TODO] `harness-ai.phase118.stream1.task1` User retests Settings version rows and manual update buttons for Claude, Codex, and OpenCode in the packaged app (scope: user workflow; expected commit: none). Retest found OpenCode SDK current version still missing; hotfix follows.

## Phase 119 - OpenCode SDK Version Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Settings Bridge

240. [DONE] `harness-ai.phase119.stream1.task1` Install and detect OpenCode SDK current version from app/runtime dependencies as well as global npm state (scope: `package.json, package-lock.json, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: detect packaged opencode sdk version`). Result: Completed in commit `fix: detect packaged opencode sdk version`.
241. [DONE] Git Commit: `fix: detect packaged opencode sdk version` (hash: self)

## Phase 120 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

242. [TODO] `harness-ai.phase120.stream1.task1` User retests OpenCode SDK current version in Settings after packaged app restart (scope: user workflow; expected commit: none). Retest found usage-limit indicators are never refreshed; hotfix follows.

## Phase 121 - Provider Usage Limit Refresh Route (owner: Codex, updated: 2026-06-27)

### Stream: Core Telemetry

243. [DONE] `harness-ai.phase121.stream1.task1` Add Core-owned optional provider usage-limit refresh dispatch after binding and completed turns (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: refresh provider usage telemetry`). Result: Completed in commit `fix: refresh provider usage telemetry`.
244. [DONE] Git Commit: `fix: refresh provider usage telemetry` (hash: self)

## Phase 122 - Provider Usage Limit Readers (owner: Codex, updated: 2026-06-27)

### Stream: Provider Sources

245. [DONE] `harness-ai.phase122.stream1.task1` Add provider-owned usage-limit readers for the current Harness providers that expose real account limit sources (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/**/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: read provider usage limits`). Result: Completed in commit `fix: read provider usage limits`.
246. [DONE] Git Commit: `fix: read provider usage limits` (hash: self)

## Phase 123 - Provider Usage Limit Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

247. [DONE] `harness-ai.phase123.stream1.task1` Run tests/build/package and record usage-limit indicator verification evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider usage limits`). Result: Completed in commit `chore: verify provider usage limits`.
248. [DONE] Git Commit: `chore: verify provider usage limits` (hash: self)

## Phase 124 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Retest

249. [IN_PROGRESS] `harness-ai.phase124.stream1.task1` User retests provider usage-limit indicators in Claude, Codex, Kimi, GLM, OpenCode, OpenRouter, and Local Models sessions (scope: user workflow; expected commit: none).

## Phase 125 - Kimi CLI Alias Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Provider Runtime

250. [DONE] `harness-ai.phase125.stream1.task1` Avoid passing Harness-only Kimi model aliases as Kimi CLI `--model` config aliases while keeping provider-owned Kimi model metadata and workspace-local provider home launch cwd (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/**, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: avoid invalid kimi cli model alias`). Result: Completed in commit `fix: avoid invalid kimi cli model alias`.
251. [DONE] Git Commit: `fix: avoid invalid kimi cli model alias` (hash: self)

## Phase 126 - Kimi CLI Alias Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

252. [DONE] `harness-ai.phase126.stream1.task1` Run focused Kimi provider tests/build checks and package the macOS app for user retest (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify kimi cli alias hotfix`). Result: Completed in commit `chore: verify kimi cli alias hotfix`.
253. [DONE] Git Commit: `chore: verify kimi cli alias hotfix` (hash: self)

## Phase 127 - Detached Session Window Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Electron Shell

254. [DONE] `harness-ai.phase127.stream1.task1` Make detached session windows render the session surface at the same width as the main workspace session pane without an empty right field (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: size detached session window`). Result: Completed in commit `fix: size detached session window`.
255. [DONE] Git Commit: `fix: size detached session window` (hash: self)

## Phase 128 - Detached Session Window Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

256. [DONE] `harness-ai.phase128.stream1.task1` Run focused build/package checks for detached session window sizing and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify detached session sizing`). Result: Completed in commit `chore: verify detached session sizing`.
257. [DONE] Git Commit: `chore: verify detached session sizing` (hash: self)

## Phase 129 - Session Sidebar Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session Interface

258. [DONE] `harness-ai.phase129.stream1.task1` Tighten the left sidebar by hiding workspace path, moving Start New Session into the section header, embedding detach inside session rows, and adding Core-owned session delete from the row context menu (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: tighten session sidebar controls`). Result: Completed in commit `fix: tighten session sidebar controls`.
259. [DONE] Git Commit: `fix: tighten session sidebar controls` (hash: self)

## Phase 130 - Session Sidebar Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

260. [DONE] `harness-ai.phase130.stream1.task1` Run focused checks/package for the sidebar layout and session delete route, then record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify session sidebar controls`). Result: Completed in commit `chore: verify session sidebar controls`.
261. [DONE] Git Commit: `chore: verify session sidebar controls` (hash: self)

## Phase 131 - Session Telemetry Restore Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Core Session State

262. [DONE] `harness-ai.phase131.stream1.task1` Restore persisted session telemetry into Core live session state before resumed provider bindings can publish fresh telemetry after kernel restart (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: restore session telemetry history`). Result: Completed in commit `fix: restore session telemetry history`.
263. [DONE] Git Commit: `fix: restore session telemetry history` (hash: self)

## Phase 132 - Session Telemetry Restore Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

264. [DONE] `harness-ai.phase132.stream1.task1` Run focused session telemetry restore tests/build/package and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify session telemetry restore`). Result: Completed in commit `chore: verify session telemetry restore`.
265. [DONE] Git Commit: `chore: verify session telemetry restore` (hash: self)

## Phase 133 - Sidebar Menu And Density Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session Interface

266. [DONE] `harness-ai.phase133.stream1.task1` Close session row context menus on outside click/Escape, require confirmation before deleting, shrink the sidebar to content, and restyle Start New Session as a separated blue primary control (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: tighten sidebar menu behavior`). Result: Completed in commit `fix: tighten sidebar menu behavior`.
267. [DONE] Git Commit: `fix: tighten sidebar menu behavior` (hash: self)

## Phase 134 - Sidebar Menu Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

268. [DONE] `harness-ai.phase134.stream1.task1` Run sidebar build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify sidebar menu behavior`). Result: Completed in commit `chore: verify sidebar menu behavior`.
269. [DONE] Git Commit: `chore: verify sidebar menu behavior` (hash: self)

## Phase 135 - Active Session Row Color Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session Interface

270. [DONE] `harness-ai.phase135.stream1.task1` Remove saturated accent fill from the selected session row and render it as a neutral gray active state (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, .harness/plans/todo-plan.md`; expected commit: `fix: desaturate active session row`). Result: Completed in commit `fix: desaturate active session row`.
271. [DONE] Git Commit: `fix: desaturate active session row` (hash: self)

## Phase 136 - Codex Per-Model Reasoning UI Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

272. [DONE] `harness-ai.phase136.stream1.task1` Move Codex reasoning selection into each Codex model row so Settings edits `reasoningByModel[modelId]` directly instead of showing one separate default-model reasoning control (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: show codex reasoning per model`). Result: Completed in commit `fix: show codex reasoning per model`.
273. [DONE] Git Commit: `fix: show codex reasoning per model` (hash: self)

## Phase 137 - Codex Per-Model Reasoning Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

274. [DONE] `harness-ai.phase137.stream1.task1` Run settings build verification for Codex per-model reasoning controls and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify codex per model reasoning`). Result: Completed in commit `chore: verify codex per model reasoning`.
275. [DONE] Git Commit: `chore: verify codex per model reasoning` (hash: self)

## Phase 138 - Session Input Wait Copy Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session Interface

276. [DONE] `harness-ai.phase138.stream1.task1` Show the reference pulsing "Agent is working… Please wait." copy inside the user input while the active session is waiting for an agent response (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: pulse input wait copy`). Result: Completed in commit `fix: pulse input wait copy`.
277. [DONE] Git Commit: `fix: pulse input wait copy` (hash: self)

## Phase 139 - Session Input Wait Copy Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

278. [DONE] `harness-ai.phase139.stream1.task1` Run session input wait-copy build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify input wait copy`). Result: Completed in commit `chore: verify input wait copy`.
279. [DONE] Git Commit: `chore: verify input wait copy` (hash: self)

## Phase 140 - Interface Typography Weight Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session And Settings UI

280. [DONE] `harness-ai.phase140.stream1.task1` Remove bold/semi-bold typography from the user input hints and broadly lighten visible session/settings interface text weights (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: lighten interface typography`). Result: Completed in commit `fix: lighten interface typography`.
281. [DONE] Git Commit: `fix: lighten interface typography` (hash: self)

## Phase 141 - Provider Reasoning Selector Theme Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

282. [DONE] `harness-ai.phase141.stream1.task1` Apply dark-theme styling to model-row reasoning selectors and add Claude per-model thinking selection persisted in Settings (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/**, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, .harness/plans/todo-plan.md`; expected commit: `fix: align reasoning selectors with dark theme`). Result: Completed in commit `fix: align reasoning selectors with dark theme`.
283. [DONE] Git Commit: `fix: align reasoning selectors with dark theme` (hash: self)

## Phase 142 - Provider Reasoning Selector Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

284. [DONE] `harness-ai.phase142.stream1.task1` Run settings reasoning selector build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reasoning selector theme`). Result: Completed in commit `chore: verify reasoning selector theme`.
285. [DONE] Git Commit: `chore: verify reasoning selector theme` (hash: self)

## Phase 143 - Roboto Flex Typography Experiment (owner: Codex, updated: 2026-06-27)

### Stream: Session And Settings UI

286. [DONE] `harness-ai.phase143.stream1.task1` Try Roboto Flex as the UI font with thin weight and negative grade to reduce glyph stroke thickness (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/fonts/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: try roboto flex typography`). Result: Completed in commit `fix: try roboto flex typography`.
287. [DONE] Git Commit: `fix: try roboto flex typography` (hash: self)

## Phase 144 - Roboto Flex Typography Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

288. [DONE] `harness-ai.phase144.stream1.task1` Run typography experiment build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify roboto flex typography`). Result: Completed in commit `chore: verify roboto flex typography`.
289. [DONE] Git Commit: `chore: verify roboto flex typography` (hash: self)

## Phase 145 - Reasoning Menu Theme Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

290. [DONE] `harness-ai.phase145.stream1.task1` Replace native reasoning effort selects with a dark in-app menu for Codex and Claude model rows (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**, .harness/plans/todo-plan.md`; expected commit: `fix: darken reasoning effort menu`). Result: Completed in commit `fix: darken reasoning effort menu`.
291. [DONE] Git Commit: `fix: darken reasoning effort menu` (hash: self)

## Phase 146 - Reasoning Menu Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

292. [DONE] `harness-ai.phase146.stream1.task1` Run settings reasoning menu build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify reasoning effort menu`). Result: Completed in commit `chore: verify reasoning effort menu`.
293. [DONE] Git Commit: `chore: verify reasoning effort menu` (hash: self)

## Phase 147 - Restore Original Typography Hotfix (owner: Codex, updated: 2026-06-27)

### Stream: Session And Settings UI

294. [DONE] `harness-ai.phase147.stream1.task1` Remove the Roboto Flex experiment and restore the previous UI font stack while keeping the lighter font weights (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/fonts/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, .harness/plans/todo-plan.md`; expected commit: `fix: restore original interface font`). Result: Completed in commit `fix: restore original interface font`.
295. [DONE] Git Commit: `fix: restore original interface font` (hash: self)

## Phase 148 - Accidental Local File Cleanup (owner: Codex, updated: 2026-06-27)

### Stream: Hygiene

296. [DONE] `harness-ai.phase148.stream1.task1` Remove the accidentally tracked local `.claude/CLAUDE.md` file from the repository (scope: `.claude/**, .harness/plans/todo-plan.md`; expected commit: `chore: remove accidental claude file`). Result: Completed in commit `chore: remove accidental claude file`.
297. [DONE] Git Commit: `chore: remove accidental claude file` (hash: self)

## Phase 149 - Restore Original Typography Verification (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

298. [DONE] `harness-ai.phase149.stream1.task1` Run typography restore build/package verification and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify restored interface font`). Result: Completed in commit `chore: verify restored interface font`.
299. [DONE] Git Commit: `chore: verify restored interface font` (hash: self)

## Phase 150 - Session Closeout Instruction Archive (owner: Codex, updated: 2026-06-27)

### Stream: Hygiene

300. [DONE] `harness-ai.phase150.stream1.task1` Keep the Claude provider instruction file as an inactive archived reference instead of active repo instructions (scope: `.claude/**, .harness/plans/todo-plan.md`; expected commit: `chore: archive claude provider instructions`). Result: Completed in commit `chore: archive claude provider instructions`.
301. [DONE] Git Commit: `chore: archive claude provider instructions` (hash: self)

## Phase 151 - Settings Surface Teal Studio Unification (owner: Codex, updated: 2026-06-27)

### Stream: Settings Surface

302. [DONE] `harness-ai.phase151.stream1.task1` Unify the Settings surface onto the Teal Studio design language (variant A): replace the VS Code blue accent and backgrounds with the shared pm teal tokens, restyle the reasoning R2 trigger and menu into the shared popup palette, move radio, tab, and checkbox selection to teal, unify radii, and set font weights by field role while keeping success and warning status colors (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css`; expected commit: `fix: unify settings surface to teal studio`). Result: Completed in commit `fix: unify settings surface to teal studio`.
303. [DONE] Git Commit: `fix: unify settings surface to teal studio` (hash: self)

## Phase 152 - Session Window Teal Studio Unification (owner: Codex, updated: 2026-06-27)

### Stream: Session Interface

304. [DONE] `harness-ai.phase152.stream1.task1` Remove the blue reference layer from the session window and unify it onto the Teal Studio tokens: collapse the duplicate blue shell, panel, message, and status colors onto the shared pm teal tokens, replace the monospace input with the UI font plus teal focus while keeping mono only for code and IDs, unify radii, and set font weights by role (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`; expected commit: `fix: unify session window to teal studio`). Result: Completed in commit `fix: unify session window to teal studio`.
305. [DONE] Git Commit: `fix: unify session window to teal studio` (hash: self)

## Phase 153 - Reference Send Button Restyle (owner: Codex, updated: 2026-06-27)

### Stream: Session Input

306. [DONE] `harness-ai.phase153.stream1.task1` Restyle the session send button after the CodeAI Hub reference without changing behavior: render the outlined play action button outside the input field through the session-input action markup, add the action button and icon styles including the smaller stop square as a design-only state, and keep the existing submit handler and disabled logic untouched (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`; expected commit: `fix: restyle session send button from reference`). Result: Completed in commit `fix: restyle session send button from reference`.
307. [DONE] Git Commit: `fix: restyle session send button from reference` (hash: self)

## Phase 154 - Teal Studio Build And Evidence (owner: Codex, updated: 2026-06-27)

### Stream: Build And Package

308. [DONE] `harness-ai.phase154.stream1.task1` Run the quality gates, rebuild the renderer and the unsigned macOS app for the Teal Studio design pass, and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: build teal studio design app`). Result: Completed in commit `chore: build teal studio design app`.
309. [DONE] Git Commit: `chore: build teal studio design app` (hash: self)

## Phase 155 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

310. [DONE] `harness-ai.phase155.stream1.task1` User launches the rebuilt app and reviews the unified Teal Studio interface, then provides design feedback (scope: user workflow; expected commit: none). Result: User reviewed the first Teal Studio build and requested a session input field width fix so the right gap from the send button matches the field left inset.

## Phase 156 - Session Input Field Width Fix (owner: Codex, updated: 2026-06-27)

### Stream: Session Input

311. [DONE] `harness-ai.phase156.stream1.task1` Make the session input field fill the available flex row width so the gap from the play/stop button to the right edge of the input panel matches the field left inset, then rebuild the unsigned macOS app and record evidence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, docs/evidence/**`; expected commit: `fix: balance session input field width`). Result: Completed in commit `fix: balance session input field width`.
312. [DONE] Git Commit: `fix: balance session input field width` (hash: self)

## Phase 157 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

313. [DONE] `harness-ai.phase157.stream1.task1` User relaunches the rebuilt app and reviews the balanced session input field width, then provides design feedback (scope: user workflow; expected commit: none). Result: Input width accepted; user reported the session right-click context menu (Delete and Delete confirmation) is off-style and must match the app.

## Phase 158 - Session Context Menu Teal Studio Restyle (owner: Codex, updated: 2026-06-27)

### Stream: Session Sidebar

314. [DONE] `harness-ai.phase158.stream1.task1` Restyle the session right-click context menu (Delete item and Delete confirmation) onto Teal Studio: neutral Cancel and menu buttons with teal hover, a clean danger style for Delete instead of the brown fill, mark the standalone Delete item as danger by class only, then rebuild the unsigned macOS app and record evidence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, docs/evidence/**`; expected commit: `fix: restyle session context menu to teal studio`). Result: Completed in commit `fix: restyle session context menu to teal studio`.
315. [DONE] Git Commit: `fix: restyle session context menu to teal studio` (hash: self)

## Phase 159 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

316. [DONE] `harness-ai.phase159.stream1.task1` User relaunches the rebuilt app and reviews the restyled session context menu, then provides design feedback (scope: user workflow; expected commit: none). Result: User reported the context menu Delete button and Delete confirmation use oversized fonts and buttons that do not match the app scale.

## Phase 160 - Session Context Menu Scale Fix (owner: Codex, updated: 2026-06-27)

### Stream: Session Sidebar

317. [DONE] `harness-ai.phase160.stream1.task1` Scale the session context menu (Delete item, Delete confirmation title, Cancel/Delete buttons) down to the app popover scale used by the settings reasoning menu (12px text, 28px control height, centered title), then rebuild the unsigned macOS app and record evidence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, docs/evidence/**`; expected commit: `fix: scale session context menu to app size`). Result: Completed in commit `fix: scale session context menu to app size`.
318. [DONE] Git Commit: `fix: scale session context menu to app size` (hash: self)

## Phase 161 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

319. [DONE] `harness-ai.phase161.stream1.task1` User relaunches the rebuilt app and reviews the rescaled session context menu, then provides design feedback (scope: user workflow; expected commit: none). Result: User approved horizontal centering, asked for smaller fonts and proper button states (resting, hover, pressed), with Delete turning solid red when pressed.

## Phase 162 - Session Context Menu Button States (owner: Codex, updated: 2026-06-27)

### Stream: Session Sidebar

320. [DONE] `harness-ai.phase162.stream1.task1` Reduce the session context menu font size to 11px and add resting/hover/pressed button states (neutral buttons deepen teal on press, danger Delete becomes a solid red fill on press), then rebuild the unsigned macOS app and record evidence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, docs/evidence/**`; expected commit: `fix: add context menu button states`). Result: Completed in commit `fix: add context menu button states`.
321. [DONE] Git Commit: `fix: add context menu button states` (hash: self)

## Phase 163 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

322. [DONE] `harness-ai.phase163.stream1.task1` User relaunches the rebuilt app and reviews the context menu button states and smaller fonts, then provides design feedback (scope: user workflow; expected commit: none). Result: Context menu accepted. User asked to mute the bright filled buttons (Start New Session, Save Changes) to the status-panel button style, and to make settings selected-element outlines single-pixel like the model chip.

## Phase 164 - Soften Accent Fills And Selection Outlines (owner: Codex, updated: 2026-06-27)

### Stream: Buttons And Selection

323. [DONE] `harness-ai.phase164.stream1.task1` Mute the bright accent-filled buttons (start session, start new session, settings primary/Save Changes, primary icon button) to the muted status-panel button style (dark teal fill, teal border, light teal text), and replace the double settings selection outline (1px border plus inset 1px shadow) with a single 1px border like the model chip, then rebuild the unsigned macOS app and record evidence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css, docs/evidence/**`; expected commit: `fix: soften accent fills and selection outlines`). Result: Completed in commit `fix: soften accent fills and selection outlines`.
324. [DONE] Git Commit: `fix: soften accent fills and selection outlines` (hash: self)

## Phase 165 - User Workflow Acceptance (owner: User, updated: 2026-06-27)

### Stream: Design Retest

325. [DONE] `harness-ai.phase165.stream1.task1` User relaunches the rebuilt app and reviews the muted filled buttons and single-pixel selection outlines, then provides design feedback (scope: user workflow; expected commit: none). Result: User approved the muted buttons and single-pixel outlines, asked to remove the redundant OpenRouter "Selected model" row from all three OpenRouter blocks, and to make the active agent instructions load automatically at session start.

## Phase 166 - Remove OpenRouter Selected Model Row (owner: Codex, updated: 2026-06-28)

### Stream: Settings Surface

326. [DONE] `harness-ai.phase166.stream1.task1` Remove the redundant "Selected model" row from the shared OpenRouter model/endpoint picker so the chat, UI translation, and reasoning translation OpenRouter blocks no longer show it, then rebuild and repackage the unsigned macOS app (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/openrouter-settings-card.tsx`; expected commit: `fix: remove openrouter selected model row`). Result: Completed in commit `fix: remove openrouter selected model row`.
327. [DONE] Git Commit: `fix: remove openrouter selected model row` (hash: self)

## Phase 167 - Load Agent Instructions Every Session (owner: Codex, updated: 2026-06-28)

### Stream: Workspace Instructions

328. [DONE] `harness-ai.phase167.stream1.task1` Add a root CLAUDE.md that imports AGENTS.md so Claude Code loads the active instructions at session start, document the build vs package:mac order in AGENTS.md, and remove the inactive archived .claude/Claude.md (scope: `CLAUDE.md, AGENTS.md, .claude/Claude.md`; expected commit: `chore: load agent instructions via root claude md`). Result: Completed in commit `chore: load agent instructions via root claude md`.
329. [DONE] Git Commit: `chore: load agent instructions via root claude md` (hash: self)

## Phase 168 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Session Start Verification

330. [IN_PROGRESS] `harness-ai.phase168.stream1.task1` User starts a new session and confirms the OpenRouter blocks no longer show the "Selected model" row and that the active agent instructions load from the root CLAUDE.md import (scope: user workflow; expected commit: none).
