# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-id-bar-compact-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "chore(package): rebuild packaged app with compact session id bar",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request (2026-07-02): reduce the session header
  height — move the applied profile chip out of the session id row into a
  second stacked row on the left (two rows, same shape as the limit rows),
  and return the usage limits to the right side, pinned to the right edge.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
- Keep the context pack short. Use `docs/DOCUMENTATION_INDEX.md` to choose the
  few documents relevant to this scope; do not paste a full Markdown inventory
  into every plan.

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
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Compact Session Id Bar (owner: Codex, updated: 2026-07-02)

### Stream: Session Id Bar Layout

1. [DONE] `harness-ai.phase1.stream1.task1` Regroup the session id bar: wrap the session id and the applied profile chip into a left identity column of two stacked rows (same two-row shape as the limit rows), which returns the usage limits block to the right grid column pinned to the right edge and shrinks the bar back to a single grid row (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `fix(session-window): compact session id bar with stacked identity column`). Result: Completed in commit `fix(session-window): compact session id bar with stacked identity column`.
2. [DONE] Git Commit: `fix(session-window): compact session id bar with stacked identity column` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-02)

### Stream: Package And Retest

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/session-id-bar-compact-package-2026-07-02.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with compact session id bar`).
4. [TODO] Git Commit: `chore(package): rebuild packaged app with compact session id bar` (hash: TBD)
5. [TODO] `harness-ai.phase2.stream1.task2` User retests the compact session id bar in the packaged app (scope: user workflow; expected commit: none).
