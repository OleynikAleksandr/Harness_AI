# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-user-acceptance-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** The user's accepted Grok scope exposed that a final task
  with `expected commit: none` cannot transition from `IN_PROGRESS` to `DONE`,
  forcing an otherwise completed scope through `plan:archive --force`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/plans/todo-plan.template.md`
  - `scripts/plan.mjs`
  - `scripts/plan-archive.test.mjs`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- User acceptance records completion of an explicitly marked acceptance task;
  it never archives the scope or changes `Execution Scope Status` to `NONE`.
- `plan:archive` remains a separate user-directed action and must continue to
  reject genuinely unfinished implementation work.
- Any source change updates every related Markdown document in the same commit.
- Quality gates run automatically on every commit; the plan contains no
  separate gate-run phase.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - User Acceptance Lifecycle (owner: Codex, updated: 2026-07-16)

### Stream: Plan Orchestrator

1. [DONE] `harness-ai.phase1.stream1.task1` Add an explicit `completion: user-acceptance` task contract and a guarded `plan:accept` command that completes only the active acceptance task, records the user-provided acceptance note in a dedicated commit, leaves the scope ACTIVE, and allows a later ordinary `plan:archive`; add regression coverage for success and misuse while documenting the standard workflow (scope: `scripts/plan.mjs, scripts/plan-accept.test.mjs, package.json, .harness/plans/todo-plan.template.md, AGENTS.md, CLAUDE.md, README.md, docs/evidence/plan-user-acceptance-command-2026-07-16.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `feat: add plan acceptance workflow`). Result: Completed in commit `feat: add plan acceptance workflow`.
2. [DONE] Git Commit: `feat: add plan acceptance workflow` (hash: self)
3. [IN_PROGRESS] `harness-ai.phase1.stream1.task2` User verifies that recorded acceptance and scope archival are now separate standard actions with no forced close required (completion: user-acceptance; scope: user workflow; expected commit: none).
