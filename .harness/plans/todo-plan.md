# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "codex-rollback-2026-07-06",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase6.stream5.task1",
  "expectedCommitMessage": "feat(session-ui): enable codex rollback button",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user order 2026-07-06: close the previous plan and move
  Phase 6 into a new standalone plan.
- **Archived source scope:**
  `.harness/plans/archive/universal-client-2026-07-04.md`.
- **Architecture source:** `docs/architecture/CodexCacheAnchorThread.md`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/CodexCacheAnchorThread.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless the task line
  records an explicit atomic split exception.
- Product Part / Cluster / Module filesystem ownership is primary.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user
  confirmation.
- Scope closeout/archival is user-directed only.
- Quality gates run automatically on every commit and push; plans never include
  a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"` when the
  active task is a normal implementation task.

## Phase 6 - Codex Cache Anchor Rollback (owner: Codex + User, materialized: 2026-07-06)

> Scope contract: Phase 6 is now standalone and Codex-only. The previous plan
> already moved the cache-anchor research into tracked architecture docs and
> added a disabled Codex-only UI probe (`Turns` + `Rollback`). This scope starts
> from those committed artifacts and implements real rollback only for the
> verified Codex app-server path. Claude, Kimi, GLM, OpenRouter, Local Models
> and provider-neutral rollback stay out of scope until separate validation.

### Stream: Scope Materialization

1. [DONE] `harness-ai.phase6.stream1.task1` Materialize this new standalone Codex rollback plan after archiving `universal-client-2026-07-04`; keep the completed Phase 6 baseline as archived history and make this file the recovery owner for the next Codex-only rollback implementation stage (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): materialize codex rollback scope`). Result: Completed in commit `docs(plan): materialize codex rollback scope`.
2. [DONE] Git Commit: `docs(plan): materialize codex rollback scope` (hash: self)

### Stream: Codex Provider Rollback Contract

3. [DONE] `harness-ai.phase6.stream2.task1` Add the Codex provider-runtime rollback capability around app-server `thread/rollback`: expose a Codex-only provider facade method that accepts provider session id + `numTurns`, calls the app-server rollback method, and returns enough provider facts for Core to refresh state; include unit coverage with the existing Codex app-server facade test style. Scope clarification: the public `CodexProviderFacade` inherits the method from `CodexProviderAdapter`, so the adapter file joins instead of changing the outer facade wrapper (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/provider/codex-provider-adapter.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-facade.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `.harness/plans/todo-plan.md`; expected commit: `feat(codex-provider): expose app-server rollback`). Result: Completed in commit `feat(codex-provider): expose app-server rollback`.
4. [DONE] Git Commit: `feat(codex-provider): expose app-server rollback` (hash: self)

### Stream: Core Session Rollback Intent

5. [DONE] `harness-ai.phase6.stream3.task1` Add a Core-owned session rollback intent for Codex sessions only: validate `sessionId`, provider id and `numTurns`, reject non-Codex sessions, call the provider rollback capability, and refresh session snapshot/telemetry without renderer-side provider truth; include focused tests for Codex accepted and non-Codex rejected paths. Scope clarification: the live read model is the session event stream, not `session-snapshot-projector`, so rollback publishes `session:messages-replaced`; the optional adapter rollback method joins the shared provider-adapter contract for type-safe Core dispatch (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-rollback.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-history-restore.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`, `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts`, affected `module.md`s, `.harness/plans/todo-plan.md`; expected commit: `feat(session-runtime): add codex rollback intent`). Result: Completed in commit `feat(session-runtime): add codex rollback intent`.
6. [DONE] Git Commit: `feat(session-runtime): add codex rollback intent` (hash: self)

### Stream: Core RPC Bridge

7. [DONE] `harness-ai.phase6.stream4.task1` Expose the Core Codex rollback intent through the Electron/Core RPC boundary as a raw user intent (`sessionId`, `numTurns`), preserving Core as authority. Atomic bridge exception: the channel must compile across runtime API, bridge, preload and renderer typing in one commit (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-facade.test.mjs`, `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`, `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs`, `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts` + affected module docs; expected commit: `feat(core-runtime): expose codex rollback rpc`). Result: Completed in commit `feat(core-runtime): expose codex rollback rpc`.
8. [DONE] Git Commit: `feat(core-runtime): expose codex rollback rpc` (hash: self)

### Stream: Codex Session UI Enablement

9. [IN_PROGRESS] `harness-ai.phase6.stream5.task1` Enable the existing Codex-only `Rollback` button in the Session status panel: derive default `numTurns` from the visible Codex turn count, call the Core rollback RPC, keep the button hidden for non-Codex sessions, and surface controlled success/failure feedback without `window.alert`/`prompt`/`confirm` (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`; expected commit: `feat(session-ui): enable codex rollback button`).
10. [TODO] Git Commit: `feat(session-ui): enable codex rollback button` (hash: TBD)

## Phase 7 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-06)

### Stream: Package And Retest

> Add this phase only after the Codex rollback implementation commits land and
> the user explicitly confirms a package build. Gates run automatically on every
> commit, so there is no separate gate-run phase.

11. [TODO] `harness-ai.phase7.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed), verify `release/mac-arm64/Harness AI.app` exists, and record Codex rollback package evidence (scope: `docs/evidence/codex-rollback-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex rollback`).
12. [TODO] Git Commit: `chore(package): rebuild packaged app with codex rollback` (hash: TBD)
13. [TODO] `harness-ai.phase7.stream1.task2` User runs a live Codex session in the packaged app and validates the rollback checklist: `Turns` before/after, token window before/after, Codex app-server `thread/read includeTurns=true`, `lastInput`, `lastCached`, and preserved cache-anchor behavior (scope: user workflow; expected commit: none).
