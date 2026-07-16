# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "grok-provider-integration-planning-2026-07-16",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request to create the Grok provider planning document in `docs/evidence/`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `docs/architecture/SubagentSessions.md`
  - `docs/architecture/UniversalClient.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit: affected `module.md`, `cluster.md`, `product-part.md`, architecture docs, product tree docs, README/AGENTS/CLAUDE when relevant, and any related `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Grok Provider Planning Document (owner: Codex, updated: 2026-07-16)

### Stream: Research Synthesis And Implementation Roadmap

1. [DONE] `harness-ai.phase1.stream1.task1` Create the evidence-hosted Grok provider integration plan from verified local CLI, subscription, upstream ACP and Harness architecture findings, then register it in the documentation catalog (scope: `.harness/plans/todo-plan.md, docs/evidence/grok-provider-integration-plan-2026-07-16.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: add Grok provider integration plan`). Result: Completed in commit `docs: add Grok provider integration plan`.
2. [DONE] Git Commit: `docs: add Grok provider integration plan` (hash: self)
