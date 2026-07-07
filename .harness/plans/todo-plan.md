# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "codex-uc-reasoning-effort-2026-07-07",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request, 2026-07-07 CodexUC reasoning effort audit.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
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
- Verification/package builds for the current implementation scope are allowed
  by the user's explicit package request.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - CodexUC Reasoning Effort (owner: Codex, updated: 2026-07-07)

### Stream: Request Body Contract

1. [DONE] `harness-ai.phase1.stream1.task1` Make CodexUC live requests honor the Core-selected Codex reasoning effort even when a native-bundle request template carries captured `reasoning.effort`; preserve route-owned summary normalization and static template fields. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-responses.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex-uc): honor selected reasoning effort`). Result: Completed in commit `fix(codex-uc): honor selected reasoning effort`.
2. [DONE] Git Commit: `fix(codex-uc): honor selected reasoning effort` (hash: self)

## Phase 2 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-07)

### Stream: Package And Retest

3. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence. (scope: `docs/evidence/codex-uc-reasoning-effort-package-2026-07-07.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record codex uc reasoning effort package`). Result: Completed in commit `docs(evidence): record codex uc reasoning effort package`.
4. [DONE] Git Commit: `docs(evidence): record codex uc reasoning effort package` (hash: self)
5. [IN_PROGRESS] `harness-ai.phase2.stream1.task2` User retests CodexUC in the packaged app and verifies that the selected Codex reasoning effort is reflected in the outgoing CodexUC route. (scope: user workflow; expected commit: none).
