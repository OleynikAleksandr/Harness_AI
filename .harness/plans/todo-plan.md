# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-delete-artifact-sync-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream3.task1",
  "expectedCommitMessage": "fix: delete provider rollout artifact on session removal",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — (1) deleting a session in the sidebar must also delete the on-disk artifacts that session created (its event log and provider rollout), and (2) repair the Settings "Restart Core" button so it truly restarts the core process, plus fix its spacing and add a spinner. Build the app at the end.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/architecture/ReferenceCoreRuntimeBoundary.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`
  - `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`

### Scope decisions (confirmed with user)

- Delete removes only artifacts owned by that session: `.harness/sessions/events/<sessionId>.jsonl` (Core-owned) and the provider rollout for that session (provider-owned). Shared provider home stays.
- No one-time GC of already-orphaned files. Fix forward only.
- Deletion is idempotent and routes through the core (manual on-disk deletion is futile while the core holds session state in memory).
- Provider per-session artifact removal is provider-owned: the Codex adapter deletes its own rollout.
- The "Restart Core" button must really restart the core process (kill + respawn), not just re-register adapters; fix label spacing and show a spinner while busy.

### Root-cause findings

- The core runtime is a long-lived child process holding `sessions` + `messagesBySession` Maps in memory; it reads disk only at bootstrap (`restoreState`).
- Sidebar list is a projection of in-memory state; deleting `.harness` on disk does nothing because the live process rewrites files from memory.
- `core-process-supervisor.start()` attaches to a healthy core instead of spawning; `stop()` relies only on HTTP `/shutdown` and keeps no pid/child handle, so a busy/hung core is never force-killed. This is why the button does not really restart.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- Application Shell is UI/supervisor/client only; not a source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation. The user has explicitly confirmed the final build for this scope.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Session Delete Artifact Sync (owner: Codex, updated: 2026-06-28)

### Stream: Core-owned cleanup

1. [DONE] `harness-ai.phase1.stream1.task1` Add an idempotent `deleteSessionEvents(sessionId)` to the session-event-stream facade (unlink the jsonl, forget the session from `sessionEventFiles`/`loadedEventFiles`, drop its in-memory events so a later append cannot recreate it) and orchestrate the call on session delete (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`; expected commit: `fix: delete session event log on session removal`). Result: Completed in commit `fix: delete session event log on session removal`.
2. [DONE] Git Commit: `fix: delete session event log on session removal` (hash: self)

### Stream: Self-sufficient session record

3. [DONE] `harness-ai.phase1.stream2.task1` Persist `providerSessionId` on `CoreSession` so a deleted session can locate its provider rollout without parsing the event log (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-history-store.ts`; expected commit: `refactor: persist provider session id on core session`). Result: Completed in commit `refactor: persist provider session id on core session`.
4. [DONE] Git Commit: `refactor: persist provider session id on core session` (hash: self)

### Stream: Provider-owned cleanup

5. [IN_PROGRESS] `harness-ai.phase1.stream3.task1` Add optional `deleteSessionArtifacts(providerSessionId, workspacePath)` to the provider-adapter contract (no-op default) and implement it in the Codex adapter to remove `home/sessions/**/rollout-*-<providerSessionId>.jsonl`, then call it from `deleteSession` (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/provider/codex-provider-adapter.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`; expected commit: `fix: delete provider rollout artifact on session removal`).
6. [TODO] Git Commit: `fix: delete provider rollout artifact on session removal` (hash: TBD)

## Phase 2 - Core Restart Repair (owner: Codex, updated: 2026-06-28)

### Stream: Real process restart

7. [TODO] `harness-ai.phase2.stream1.task1` Make `core-process-supervisor.stop()` truly terminate the core process: capture the pid from the health payload and force-kill (SIGTERM then SIGKILL) when HTTP `/shutdown` does not bring it down, so `restart()` always respawns a fresh process that re-reads disk (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-supervisor.mjs`; expected commit: `fix: force terminate core process on restart`).
8. [TODO] Git Commit: `fix: force terminate core process on restart` (hash: TBD)

### Stream: Restart button UI

9. [TODO] `harness-ai.phase2.stream2.task1` Fix the Restart Core control: add `.settings-core-row`/`.settings-core-status` layout (gap between button and label) and a spinner shown while restarting (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css`; expected commit: `fix: restart core button spacing and spinner`).
10. [TODO] Git Commit: `fix: restart core button spacing and spinner` (hash: TBD)

## Phase 3 - Tooling Verification And Packaging (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

11. [TODO] `harness-ai.phase3.stream1.task1` Run required gates (architecture, lint, knip, typecheck, tests), then build and package the macOS app (`npm run build` then `npm run package:mac`, user-confirmed), and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify and package session delete and core restart`).
12. [TODO] Git Commit: `chore: verify and package session delete and core restart` (hash: TBD)

## Phase 4 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

13. [TODO] `harness-ai.phase4.stream1.task1` User retests in the packaged app: delete a session and confirm its event log + provider rollout are gone (shared home intact); press Restart Core and confirm the process truly restarts (state re-read from disk), with correct spacing and a spinner (scope: user workflow; expected commit: none).
