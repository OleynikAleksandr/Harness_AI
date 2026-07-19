# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "profile-studio-proposal-2026-07-19",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request to preserve the discussed Profile Studio
  target design as a non-authoritative proposal inside the project.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `/Users/oleksandroliinyk/Desktop/TMP/GPT-5.6/profile-creator-unified-architecture-and-roadmap.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- A task row is a logical row: it may wrap onto indented continuation lines.
  The orchestrator reads `expected commit:` / `completion:` markers across the
  whole logical row and appends `Result:` records at its end.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-07-19)

### Stream: Recovery Owner

1. [DONE] `harness-ai.phase0.stream1.task1` Create the active scope for importing the Profile Studio proposal and defining the proposal-document lifecycle (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: create profile studio proposal scope`). Result: Completed in commit `plan: create profile studio proposal scope`.
2. [DONE] Git Commit: `plan: create profile studio proposal scope` (hash: self)

## Phase 1 - Proposal Import (owner: Codex, updated: 2026-07-19)

### Stream: Documentation Lifecycle

3. [DONE] `harness-ai.phase1.stream1.task1` Import the Profile Studio discussion document as a non-authoritative proposal and register `docs/proposals/**` as the lifecycle stage before accepted architecture and implementation planning (scope: `docs/proposals/ProfileStudio.md, docs/DOCUMENTATION_INDEX.md, AGENTS.md`; expected commit: `docs: add profile studio architecture proposal`). Result: Completed in commit `docs: add profile studio architecture proposal`.
4. [DONE] Git Commit: `docs: add profile studio architecture proposal` (hash: self)

## Phase 2 - Proposal Refocus Plan (owner: Codex, updated: 2026-07-19)

### Stream: Agreed Contract

5. [DONE] `harness-ai.phase2.stream1.task1` Add the user-agreed rewrite slice that narrows Profile Studio to agent-authored provider-and-model-specific Custom Profiles, Native and Custom request capture, provider capability ceilings, and full Kimi universal-client parity while removing Normalizer and future lifecycle overengineering (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add profile studio proposal rewrite`). Result: Completed in commit `plan: add profile studio proposal rewrite`.
6. [DONE] Git Commit: `plan: add profile studio proposal rewrite` (hash: self)

## Phase 3 - Proposal Rewrite (owner: Codex, updated: 2026-07-19)

### Stream: Custom Profile Foundation

7. [DONE] `harness-ai.phase3.stream1.task1` Rewrite the Profile Studio proposal around the accepted first-stage product contract and align its documentation-index summary (scope: `docs/proposals/ProfileStudio.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: refocus profile studio proposal`). Result: Completed in commit `docs: refocus profile studio proposal`.
8. [DONE] Git Commit: `docs: refocus profile studio proposal` (hash: self)
