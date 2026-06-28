# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-usage-limits-display-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task1",
  "expectedCommitMessage": "chore: verify kimi usage limits app",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request to fix 5-hour and weekly Kimi usage limits display using `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub` as behavioral reference.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/module.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub is the behavior reference for Kimi usage limits; do not invent a new interpretation if the reference already handles it.
- UI is not source of truth. Kimi limit parsing and telemetry truth must stay in provider/Core modules; UI only renders telemetry.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Plan Setup

1. [DONE] `harness-ai.phase1.stream1.task1` Create active scope plan for Kimi 5-hour and weekly usage limits display (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start kimi usage limits scope`). Result: Completed in commit `chore: start kimi usage limits scope`.
2. [DONE] Git Commit: `chore: start kimi usage limits scope` (hash: self)

## Phase 2 - Reference-Guided Kimi Limits Fix (owner: Codex, updated: 2026-06-28)

### Stream: Provider Telemetry

3. [DONE] `harness-ai.phase2.stream1.task1` Compare CodeAI Hub Kimi limit handling and fix Harness Kimi/Core telemetry so 5-hour and weekly limits render correctly (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/**, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/**, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/**`; expected commit: `fix: display kimi usage limits`). Result: Completed in commit `fix: display kimi usage limits`.
4. [DONE] Git Commit: `fix: display kimi usage limits` (hash: self)

## Phase 3 - Documentation And Verification (owner: Codex, updated: 2026-06-28)

### Stream: Evidence

5. [IN_PROGRESS] `harness-ai.phase3.stream1.task1` Update relevant module docs, run gates/build/package, and record evidence for user testing (scope: `product-parts/**/module.md, docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify kimi usage limits app`).
6. [TODO] Git Commit: `chore: verify kimi usage limits app` (hash: TBD)

## Phase 4 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

7. [TODO] `harness-ai.phase4.stream1.task1` User retests Kimi session limit display in packaged Harness AI app (scope: user workflow; expected commit: none).
