# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "subagent-launch-divider-2026-07-13",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream1.task3",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-13 — replace the per-launch
  "Subagents started" cards in the session dialog with one horizontal divider
  line that has a centered gap holding the launch label plus a counter that
  grows as subagents start (1, 2, 3, ...). Nothing else in the divider: task
  lists, statuses and controls stay in the sidebar tree only.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/ClaudeSubagentSessions.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`

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
- This scope touches only the `session-window` module (timeline grouping,
  divider markup, styles, module test) and the `localization-runtime` approved
  dictionaries (divider label key). Core subagent contracts, `session-sidebar`
  and provider modules are NOT modified in this scope; any such change requires
  a new plan line first.
- The divider task deliberately spans the three functional files of one visual
  change (`session-subagent-timeline.tsx`, `session-dialog-panel.tsx`,
  `session-window.css`) plus their paired module test and docs; this plan line
  is the explicit split allowed by the microtask rule.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-13)

### Stream: Plan Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the scope: commit this active plan (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: bootstrap subagent launch divider scope`). Result: Completed in commit `plan: bootstrap subagent launch divider scope`.
2. [DONE] Git Commit: `plan: bootstrap subagent launch divider scope` (hash: self)

## Phase 2 - Subagent Launch Divider (owner: Codex, updated: 2026-07-13)

### Stream: Dialog Timeline

3. [DONE] `harness-ai.phase2.stream1.task1` Replace the subagent card labels in the approved `ui_labels` dictionary: drop `session.subagents.started` and `session.subagents.launchedForTasks`, add the single divider label `session.subagents.launched` ("Subagents launched"); update the dictionary test and the localization module doc (scope: `localization-runtime/src/source-dictionaries.ts, localization-runtime/src/source-dictionaries.test.mjs, localization-runtime/module.md`; expected commit: `feat: add subagent launch divider label`). Result: Completed in commit `feat: add subagent launch divider label`.
4. [DONE] Git Commit: `feat: add subagent launch divider label` (hash: self)
5. [DONE] `harness-ai.phase2.stream1.task2` Collapse consecutive `subagent-call` timeline items into one launch-group item and render it as a horizontal divider with a centered gap holding the localized label and the total launch count (sum of child sessions per call, growing 1, 2, 3, ... as launches join the group); remove the card markup (header/summary/task list) and its styles, keep autoscroll reacting to group updates, refresh the module test and docs (scope: `session-window/src/session-subagent-timeline.tsx, session-window/src/session-dialog-panel.tsx, session-window/src/session-window.css` + paired `session-window/src/session-subagent-timeline.test.mjs`, `session-window/module.md`, `docs/architecture/ClaudeSubagentSessions.md`; expected commit: `feat: collapse subagent launches into dialog divider`). Result: Completed in commit `feat: collapse subagent launches into dialog divider`.
6. [DONE] Git Commit: `feat: collapse subagent launches into dialog divider` (hash: self)

## Phase 3 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-13)

### Stream: Package And Retest

7. [DONE] `harness-ai.phase3.stream1.task1` Package the app for user verification (`npm run package:mac`, allowed by this plan) and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package subagent launch divider build`). Result: Completed in commit `chore: package subagent launch divider build`.
8. [DONE] Git Commit: `chore: package subagent launch divider build` (hash: self)
9. [DONE] `harness-ai.phase3.stream1.task2` User retests the subagent launch divider in the packaged app (scope: user workflow; expected commit: none). Result: user reviewed on 2026-07-13 and ordered one acceptance fix — make the divider line twice as bright; handled in Phase 4.

## Phase 4 - Acceptance Fixes (owner: Codex + User, updated: 2026-07-13)

### Stream: Divider Brightness

10. [DONE] `harness-ai.phase4.stream1.task1` Double the divider line brightness: `.session-subagent-divider::before/::after` background `#2c3742` -> `#586e84`, note the tone in the module doc (scope: `session-window/src/session-window.css, session-window/module.md`; expected commit: `fix: brighten subagent divider line`). Result: Completed in commit `fix: brighten subagent divider line`.
11. [DONE] Git Commit: `fix: brighten subagent divider line` (hash: self)
12. [DONE] `harness-ai.phase4.stream1.task2` Repackage the app with the brighter divider (`npm run package:mac`, allowed by this plan) and record evidence (scope: `docs/evidence/subagent-launch-divider-package-2026-07-13.md, .harness/plans/todo-plan.md`; expected commit: `chore: repackage subagent launch divider build`). Result: Completed in commit `chore: repackage subagent launch divider build`.
13. [DONE] Git Commit: `chore: repackage subagent launch divider build` (hash: self)
14. [IN_PROGRESS] `harness-ai.phase4.stream1.task3` User retests the brighter divider in the packaged app (scope: user workflow; expected commit: none).
