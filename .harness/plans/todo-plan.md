# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "codex-native-session-delete-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "Record Codex native session deletion verification",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User report: Codex native rollout JSONL remains after deleting a Harness session.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Codex Native Session Delete (owner: Codex, updated: 2026-06-29)

### Stream: Provider Artifact Cleanup

1. [DONE] `harness-ai.phase1.stream1.task1` Ensure deleting a Harness session also calls the provider artifact cleanup hook for the matching native rollout JSONL (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`; expected commit: `Fix Codex native session artifact deletion`). Result: Completed in commit `Fix Codex native session artifact deletion`.
2. [DONE] Git Commit: `Fix Codex native session artifact deletion` (hash: self)

## Phase 2 - Verification (owner: Codex, updated: 2026-06-29)

### Stream: Focused Checks

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Run focused cleanup tests and required validation for the active scope (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record Codex native session deletion verification`).
4. [TODO] Git Commit: `Record Codex native session deletion verification` (hash: TBD)

## Phase 3 - User Workflow Acceptance (owner: User, updated: 2026-06-29)

### Stream: Retest

5. [TODO] `harness-ai.phase3.stream1.task1` User retests deletion of the reported Codex session in the app (scope: user workflow; expected commit: none).
