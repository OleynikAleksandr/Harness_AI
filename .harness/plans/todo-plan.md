# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-live-refresh-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request (2026-07-02): after editing a session
  profile's files through "Edit in VS Code" and saving, the Harness AI
  interface keeps showing the old name/description until the app and Core are
  restarted; the user wants the interface to refresh after a file save.
  Investigation result: Core never caches profiles (every RPC and every
  session create reads the files from disk, so new sessions already get the
  fresh prompt; open sessions keep their immutable applied snapshot by
  contract), but the renderer surfaces (Profile Creator list, new-session
  profile step) fetch the catalog only once on mount. Fix: a Core-owned
  profile file watcher publishes a `session-profiles:updated` core event
  through the existing SSE -> Electron bridge -> renderer event channel, and
  the profile surfaces reload the catalog when it arrives.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`
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

## Phase 1 - Core Profile File Watcher (owner: Codex, updated: 2026-07-02)

### Stream: Profile Store Watch API

1. [DONE] `harness-ai.phase1.stream1.task1` Add `watchProfiles(listener)` to `ProfileStoreFacade`: ensures the profiles root directory exists, starts a recursive `fs.watch` over it, debounces bursts of file events into a single notification, and returns an unsubscribe that closes the watcher; watcher errors never crash Core (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`; expected commit: `feat(profile-store): watch session profile files for changes`). Result: Completed in commit `feat(profile-store): watch session profile files for changes`.
2. [DONE] Git Commit: `feat(profile-store): watch session profile files for changes` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task2` Publish profile changes as core events: `CoreRuntimeApi.subscribe()` additionally subscribes the shared session profile store's `watchProfiles` and forwards each notification as a `{ type: "session-profiles:updated" }` event through the existing event stream (SSE -> Electron core-process bridge -> renderer `onEvent`); the shared store instance is exported from `core-session-profile-rpc.ts` so the watcher and the RPC surface use the same profiles root; a static test guards the wiring (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-session-profile-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-session-profile-events.test.mjs` (new), plus `module.md`; expected commit: `feat(core-runtime-process): publish session profiles updated core events`). Result: Completed in commit `feat(core-runtime-process): publish session profiles updated core events`.
4. [DONE] Git Commit: `feat(core-runtime-process): publish session profiles updated core events` (hash: self)

## Phase 2 - Renderer Live Refresh (owner: Codex, updated: 2026-07-02)

### Stream: Profile Surfaces Reload

5. [DONE] `harness-ai.phase2.stream1.task1` Reload the profile surfaces on `session-profiles:updated`: the Profile Creator list (`profile-list.tsx`) and the new-session profile step (`session-profile-step.tsx`) subscribe through `window.harnessCore.onEvent` and re-run their existing catalog RPC when the event arrives; the profile step keeps the user's current selection when it is still present and valid after the reload (initial mount still applies the Core-remembered preselection) and falls back to Native otherwise; a static test guards the subscriptions (scope: `product-parts/application-shell/clusters/settings-surface/modules/profile-settings-ui/src/profile-list.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-profile-step.tsx, product-parts/application-shell/clusters/settings-surface/modules/profile-settings-ui/src/profile-list.test.mjs` (new), plus `module.md` of `profile-settings-ui` and `session-window`; expected commit: `feat(application-shell): refresh session profile lists on profile update events`). Result: Completed in commit `feat(application-shell): refresh session profile lists on profile update events`.
6. [DONE] Git Commit: `feat(application-shell): refresh session profile lists on profile update events` (hash: self)

## Phase 3 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-02)

### Stream: Package And Retest

7. [DONE] `harness-ai.phase3.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/session-profiles-live-refresh-package-2026-07-02.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with live session profile refresh`). Result: Completed in commit `chore(package): rebuild packaged app with live session profile refresh`.
8. [DONE] Git Commit: `chore(package): rebuild packaged app with live session profile refresh` (hash: self)
9. [IN_PROGRESS] `harness-ai.phase3.stream1.task2` User retests in the packaged app: edit a profile's `profile.yaml` / `system-prompt.md` in VS Code, save, and confirm the Profile Creator list and the new-session profile step refresh without an app restart (scope: user workflow; expected commit: none).
