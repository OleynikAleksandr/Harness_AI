# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "harness-ai-bootstrap-2026-06-26",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase5.stream1.task1",
  "expectedCommitMessage": "feat: seed core session snapshot",
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

11. [IN_PROGRESS] `harness-ai.phase5.stream1.task1` Implement the minimal Core-owned workspace/session snapshot seed for the first UI slice (scope: `product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/**, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/**`; expected commit: `feat: seed core session snapshot`).
12. [TODO] Git Commit: `feat: seed core session snapshot` (hash: TBD)

## Phase 6 - Electron Session UI (owner: Codex, updated: 2026-06-26)

### Stream: Chat Surface

13. [TODO] `harness-ai.phase6.stream1.task1` Implement the first classic chat session UI with sidebar, transcript, telemetry strip, and input controls (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/**, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/**, product-parts/application-shell/clusters/session-interface/modules/input-controls/src/**`; expected commit: `feat: add first session ui slice`).
14. [TODO] Git Commit: `feat: add first session ui slice` (hash: TBD)

## Phase 7 - Electron Host Wiring (owner: Codex, updated: 2026-06-26)

### Stream: Desktop Launch

15. [TODO] `harness-ai.phase7.stream1.task1` Wire Electron main/preload startup, renderer entry, and VS Code link opening for the first desktop launch (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/**, product-parts/application-shell/clusters/electron-host/modules/vscode-link-opener/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/**`; expected commit: `feat: wire electron desktop launch`).
16. [TODO] Git Commit: `feat: wire electron desktop launch` (hash: TBD)

## Phase 8 - Tooling Verification (owner: Codex, updated: 2026-06-26)

### Stream: First Runnable App

17. [TODO] `harness-ai.phase8.stream1.task1` Run the app checks/build, verify the Electron session UI can launch, and record evidence (scope: `.harness/plans/todo-plan.md, docs/evidence/**`; expected commit: `chore: verify first electron session slice`).
18. [TODO] Git Commit: `chore: verify first electron session slice` (hash: TBD)

## Phase 9 - First Release Gate (owner: User, updated: 2026-06-26)

### Stream: Release Decision

19. [TODO] `harness-ai.phase9.stream1.task1` Stop at the first user-facing release/build handoff and ask for explicit release-build confirmation (scope: user workflow; expected commit: none).
