# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-cli-native-update-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task1",
  "expectedCommitMessage": "Record CLI native update verification",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user bug report — the Claude CLI "Update" button in
  Settings does nothing; the second (confirm) click runs but the version never
  changes.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Read this context before implementation:**
  - `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`

## Confirmed Scope Decisions

- Root cause: the active Claude CLI is the native installer
  (`~/.local/bin/claude` -> `~/.local/share/claude/versions/...`), but the update
  ran `npm install -g @anthropic-ai/claude-code@latest`, which updates a different
  copy under `~/.npm-global`. Since `.local/bin` precedes `.npm-global/bin` in
  PATH, `claude --version` keeps reading the native install, so the version never
  changes. OpenCode CLI has the same split (active `~/.opencode/bin`, npm updates
  `~/.npm-global`). Codex CLI happens to be the npm copy, so npm update works
  there, but it also ships a native updater.
- Fix: update CLI targets via the provider's own self-update command, which
  updates the active install regardless of where it lives:
  `claude update`, `codex update`, `opencode upgrade`. SDK targets keep using
  `npm install -g <pkg>@latest` (they are npm packages).
- Core-only change (Core owns provider CLI/version tooling per AGENTS section 4);
  the renderer button, IPC and two-click confirm flow already work.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Core Runtime owns provider/version truth; the Application Shell stays UI/client only.
- Any source change updates every related Markdown document in the same commit.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); this plan never includes a separate phase to run gates.
- No release/package build starts as a release decision without explicit user confirmation.
- Verification/package builds for the current implementation scope are allowed when this plan asks for them.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - CLI Native Update (owner: Codex, updated: 2026-06-30)

### Stream: Core Provider Tooling

1. [DONE] `harness-ai.phase1.stream1.task1` Route CLI update targets through the provider's native self-update command (`claude update`, `codex update`, `opencode upgrade`) while SDK targets keep using npm global install (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-tools.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `Update provider CLIs via their native self-update command`). Result: Completed in commit `Update provider CLIs via their native self-update command`.
2. [DONE] Git Commit: `Update provider CLIs via their native self-update command` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

3. [IN_PROGRESS] `harness-ai.phase2.stream1.task1` Package the app (`npm run package:mac`, user-confirmed) and record CLI update fix evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `Record CLI native update verification`).
4. [TODO] Git Commit: `Record CLI native update verification` (hash: TBD)
5. [TODO] `harness-ai.phase2.stream1.task2` User retests the Claude CLI update (and other CLI updates) in the packaged app (scope: user workflow; expected commit: none).
