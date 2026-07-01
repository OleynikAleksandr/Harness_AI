# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reasoning-translation-prefix-stability-2026-07-01",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task1",
  "expectedCommitMessage": "Record translated reasoning reveal package evidence",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request to fix translated reasoning stream flicker/reset, with CodeAI Hub as reference material.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

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
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them and the user confirms packaging.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Reasoning Translation Stream Repair (owner: Codex, updated: 2026-07-01)

### Stream: Prefix Stability

1. [DONE] `harness-ai.phase1.stream1.task1` Make translated visible reasoning stream updates prefix-stable so already translated blocks stay visible while newer blocks translate (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/**, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `Fix translated reasoning stream prefix stability`). Result: Completed in commit `Fix translated reasoning stream prefix stability`.
2. [DONE] Git Commit: `Fix translated reasoning stream prefix stability` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-01)

### Stream: Package And Retest

3. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record translated reasoning stream package evidence`). Result: Completed in commit `Record translated reasoning stream package evidence`.
4. [DONE] Git Commit: `Record translated reasoning stream package evidence` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` User retests the implemented translated reasoning workflow in the packaged app (scope: user workflow; expected commit: none). Result: Failed acceptance; translated reasoning still replays from the first visible block when newer translated batches arrive.

## Phase 3 - Reveal Restart Repair (owner: Codex, updated: 2026-07-01)

### Stream: Reveal State

6. [DONE] `harness-ai.phase3.stream1.task1` Port the CodeAI Hub translated-text reveal prefix algorithm so growing localized reasoning resumes from the already visible common prefix instead of restarting from zero (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `Fix translated reasoning reveal restart`). Result: Completed in commit `Fix translated reasoning reveal restart`.
7. [DONE] Git Commit: `Fix translated reasoning reveal restart` (hash: self)

## Phase 4 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-01)

### Stream: Package And Retest

8. [IN_PROGRESS] `harness-ai.phase4.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record translated reasoning reveal package evidence`).
9. [TODO] Git Commit: `Record translated reasoning reveal package evidence` (hash: TBD)
10. [TODO] `harness-ai.phase4.stream1.task2` User retests translated reasoning reveal in the packaged app (scope: user workflow; expected commit: none).
