# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-reasoning-display-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task1",
  "expectedCommitMessage": "feat: show provider reasoning in sessions",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request - port CodeAI-HUB session reasoning display into Harness AI.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/core-runtime/clusters/session-runtime/cluster.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- No release/package build starts as a release decision without explicit user confirmation (user requested building a new app for testing in this scope).
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Planning

1. [DONE] `harness-ai.phase1.stream1.task1` Open a new active scope for session reasoning display porting (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start session reasoning display scope`). Result: Completed in commit `chore: start session reasoning display scope`.
2. [DONE] Git Commit: `chore: start session reasoning display scope` (hash: self)

## Phase 2 - Reference And Shared Module (owner: Codex, updated: 2026-06-28)

### Stream: Core Runtime

3. [DONE] `harness-ai.phase2.stream1.task1` Inspect CodeAI-HUB reasoning display flow, then add the minimal Harness shared reasoning display module with a facade and focused tests (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/**, product-parts/core-runtime/clusters/session-runtime/cluster.md, product-parts/core-runtime/product-part.md, .harness/product-tree/**`; expected commit: `feat: add session reasoning display module`). Result: Completed in commit `feat: add session reasoning display module`.
4. [DONE] Git Commit: `feat: add session reasoning display module` (hash: self)

## Phase 3 - Session Wiring (owner: Codex, updated: 2026-06-28)

### Stream: Dialog Surface

5. [IN_PROGRESS] `harness-ai.phase3.stream1.task1` Wire provider reasoning/thinking events through the shared module into session snapshots and the dialog panel for all providers using the common event path (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`; docs: session-request-handler `module.md`, session-window `module.md`; expected commit: `feat: show provider reasoning in sessions`).
6. [TODO] Git Commit: `feat: show provider reasoning in sessions` (hash: TBD)

## Phase 4 - Docs And Verification (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

7. [TODO] `harness-ai.phase4.stream1.task1` Update architecture/product-tree docs, run required checks, build, package the macOS app, and record verification evidence (scope: `docs/architecture/**, docs/evidence/**, .harness/product-tree/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify session reasoning display`).
8. [TODO] Git Commit: `chore: verify session reasoning display` (hash: TBD)

## Phase 5 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

9. [TODO] `harness-ai.phase5.stream1.task1` User relaunches the packaged app and verifies provider reasoning is visible in session dialogs (scope: user workflow; expected commit: none).
