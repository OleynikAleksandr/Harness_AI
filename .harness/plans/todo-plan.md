# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "NONE",
  "planId": "harness-ai-project-manager-settings-parity-2026-06-26",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
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
