# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "harness-ai-bootstrap-2026-06-26",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task1",
  "expectedCommitMessage": "chore: install harness ai development harness",
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

3. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` Install target-local AGENTS.md, package/tooling config, plan wrapper scripts, and first quality-gate scripts (scope: `AGENTS.md, package.json, tsconfig.json, scripts/**, .harness/plans/todo-plan.md`; expected commit: `chore: install harness ai development harness`).
4. [TODO] Git Commit: `chore: install harness ai development harness` (hash: TBD)

## Phase 2 - Bootstrap Gate Verification (owner: Codex, updated: 2026-06-26)

### Stream: First Clean State

5. [TODO] `harness-ai.phase2.stream1.task1` Run the available target-local checks, record bootstrap evidence, and prepare first implementation planning for the Electron session slice (scope: `.harness/plans/todo-plan.md, docs/evidence/**`; expected commit: `chore: verify harness ai bootstrap gates`).
6. [TODO] Git Commit: `chore: verify harness ai bootstrap gates` (hash: TBD)

## Phase 3 - First Release Gate (owner: User, updated: 2026-06-26)

### Stream: Release Decision

7. [TODO] `harness-ai.phase3.stream1.task1` Stop at the first user-facing release/build handoff and ask for explicit release-build confirmation (scope: user workflow; expected commit: none).
