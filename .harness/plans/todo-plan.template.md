# Harness AI Development TODO Plan Template

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "<scope-id>-YYYY-MM-DD",
  "branch": "<branch>",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase<N>.stream1.task1",
  "expectedCommitMessage": "<expected commit message>",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `<docs/architecture/... or user request>`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `<relevant doc 1>`
  - `<relevant doc 2>`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- No release/package build starts as a release decision without explicit user confirmation.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase <N> - <Phase Name> (owner: Codex, updated: YYYY-MM-DD)

### Stream: <Stream Name>

1. [IN_PROGRESS] `harness-ai.phase<N>.stream1.task1` <task description> (scope: `<file1, file2, file3>`; expected commit: `<expected commit message>`).
2. [TODO] Git Commit: `<expected commit message>` (hash: TBD)

## Phase <N+1> - Tooling Verification (owner: Codex, updated: YYYY-MM-DD)

### Stream: Build And Evidence

3. [TODO] `harness-ai.phase<N+1>.stream1.task1` Run required gates/builds and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `<verification commit message>`).
4. [TODO] Git Commit: `<verification commit message>` (hash: TBD)

## Phase <N+2> - User Workflow Acceptance (owner: User, updated: YYYY-MM-DD)

### Stream: Retest

5. [TODO] `harness-ai.phase<N+2>.stream1.task1` User retests the implemented workflow (scope: user workflow; expected commit: none).
