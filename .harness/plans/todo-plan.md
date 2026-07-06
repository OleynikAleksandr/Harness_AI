# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "codex-rollback-2026-07-06",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
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

9. [DONE] `harness-ai.phase6.stream5.task1` Enable the existing Codex-only `Rollback` button in the Session status panel: derive default `numTurns` from the visible Codex turn count, call the Core rollback RPC, keep the button hidden for non-Codex sessions, and surface controlled success/failure feedback without `window.alert`/`prompt`/`confirm`. Scope clarification: UI applies Core-owned `session:messages-replaced` events, so the core-events helper and panel test join this task (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.test.mjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-core-events.ts`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`, `.harness/plans/todo-plan.md`; expected commit: `feat(session-ui): enable codex rollback button`). Result: Completed in commit `feat(session-ui): enable codex rollback button`.
10. [DONE] Git Commit: `feat(session-ui): enable codex rollback button` (hash: self)

## Phase 7 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-06)

### Stream: Package And Retest

> Add this phase only after the Codex rollback implementation commits land and
> the user explicitly confirms a package build. Gates run automatically on every
> commit, so there is no separate gate-run phase.

11. [DONE] `harness-ai.phase7.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed), verify `release/mac-arm64/Harness AI.app` exists, and record Codex rollback package evidence (scope: `docs/evidence/codex-rollback-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex rollback`). Result: Completed in commit `chore(package): rebuild packaged app with codex rollback`.
12. [DONE] Git Commit: `chore(package): rebuild packaged app with codex rollback` (hash: self)
13. [DONE] `harness-ai.phase7.stream1.task2` User runs a live Codex session in the packaged app and validates the rollback checklist: `Turns` before/after, token window before/after, Codex app-server `thread/read includeTurns=true`, `lastInput`, `lastCached`, and preserved cache-anchor behavior (scope: user workflow; expected commit: none). Result: User acceptance found that the Rollback button sent the full visible user-turn count and could remove the cache-anchor turns.

### Stream: Acceptance Fixes

14. [DONE] `harness-ai.phase7.stream2.task1` Fix the Codex Rollback button default so it preserves the first two visible Codex user-turns as the warmup/cache-anchor pair, disables rollback until at least one later turn exists, and updates the session-window documentation and architecture checklist for the new manual probe contract (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.test.mjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`, `docs/architecture/CodexCacheAnchorThread.md`, `.harness/plans/todo-plan.md`; expected commit: `fix(session-ui): preserve codex rollback warmup turns`). Result: Completed in commit `fix(session-ui): preserve codex rollback warmup turns`.
15. [DONE] Git Commit: `fix(session-ui): preserve codex rollback warmup turns` (hash: self)
16. [DONE] `harness-ai.phase7.stream2.task2` Move the Codex `Turns` counter next to the `Rollback` button and expose provider-reported cached input tokens beside the context-window token counter. Atomic telemetry exception: the cache value must flow from Codex app-server event routing through Core usage telemetry into the session UI in one commit so the renderer only displays Core-owned telemetry (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-event-router.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.ts`, `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.test.mjs`, `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md`, `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`, `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.test.mjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`, `docs/architecture/CodexCacheAnchorThread.md`, `.harness/plans/todo-plan.md`; expected commit: `feat(session-ui): show codex cache telemetry`). Result: Completed in commit `feat(session-ui): show codex cache telemetry`.
17. [DONE] Git Commit: `feat(session-ui): show codex cache telemetry` (hash: self)

### Stream: Package Refresh

18. [DONE] `harness-ai.phase7.stream3.task1` Rebuild the packaged macOS app after the Codex warmup rollback and cache telemetry acceptance fixes (`npm run build`, then `npm run package:mac`), verify `release/mac-arm64/Harness AI.app` and `app.asar`, and record package evidence for user retest (scope: `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with codex cache telemetry`). Result: Completed in commit `chore(package): rebuild packaged app with codex cache telemetry`.
19. [DONE] Git Commit: `chore(package): rebuild packaged app with codex cache telemetry` (hash: self)
20. [DONE] `harness-ai.phase7.stream2.task3` Fix the Codex status panel layout so `Turns` stays immediately to the left of `Rollback`, between `Tokens`/optional `Cache` and `Rollback`, with no second-row wrap at desktop packaged-app widths; update session-window documentation and package evidence for retest (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`, `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md`, `.harness/plans/todo-plan.md`; expected commit: `fix(session-ui): keep codex rollback controls inline`). Result: Completed in commit `fix(session-ui): keep codex rollback controls inline`.
21. [DONE] Git Commit: `fix(session-ui): keep codex rollback controls inline` (hash: self)
22. [DONE] `harness-ai.phase7.stream2.task4` Move the manual Codex rollback depth policy into the Core session rollback contract and restore the local transcript plus token/cache telemetry to the preserved anchor snapshot after rollback. Atomic contract exception: request typing, Core rollback implementation, focused coverage and affected docs move together so orchestrators can pass explicit `numTurns` while the UI can request the Core-owned `preserveFirstUserTurns=2` policy (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-rollback.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`, `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.test.mjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`, `docs/architecture/CodexCacheAnchorThread.md`, `.harness/plans/todo-plan.md`; expected commit: `fix(session-runtime): restore codex rollback anchor snapshot`). Result: Completed in commit `fix(session-runtime): restore codex rollback anchor snapshot`.
23. [DONE] Git Commit: `fix(session-runtime): restore codex rollback anchor snapshot` (hash: self)
24. [DONE] `harness-ai.phase7.stream2.task5` Add a selectable Codex synthetic native profile seeded from the accepted native request capture plus the current workspace `AGENTS.md` text so user testing can compare a materialized native wrapper after deleting workspace `AGENTS.md` (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/seed-profiles.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/codex-synthetic-native-seed-prompt.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/module.md`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-authoring/src/profile-authoring.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `docs/architecture/NativePromptComposition.md`, `docs/architecture/SessionProfiles.md`, `.harness/plans/todo-plan.md`; expected commit: `feat(session-profiles): seed codex synthetic native profile`). Result: Completed in commit `feat(session-profiles): seed codex synthetic native profile`.
25. [DONE] Git Commit: `feat(session-profiles): seed codex synthetic native profile` (hash: self)
26. [DONE] `harness-ai.phase7.stream3.task2` Rebuild the packaged macOS app after the Core rollback anchor-snapshot fix and Codex synthetic-native profile seed (`npm run build`, then `npm run package:mac`), verify `release/mac-arm64/Harness AI.app` and `app.asar`, and update package evidence for user retest (scope: `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with rollback anchor snapshot`). Result: Completed in commit `chore(package): rebuild packaged app with rollback anchor snapshot`.
27. [DONE] Git Commit: `chore(package): rebuild packaged app with rollback anchor snapshot` (hash: self)
28. [DONE] `harness-ai.phase7.stream2.task6` Correct the Codex synthetic native profile composition so `baseInstructions` starts with the captured Codex system prompt byte-for-byte, immediately appends the materialized workspace `AGENTS.md` text inside that system-prefix block, and only then includes captured tool declarations as reference text; refresh the local user profile for the current packaged-app retest (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/codex-synthetic-native-seed-prompt.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `docs/architecture/NativePromptComposition.md`, `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md`, `.harness/plans/todo-plan.md`; expected commit: `fix(session-profiles): keep agents inside codex synthetic system prefix`). Result: Completed in commit `fix(session-profiles): keep agents inside codex synthetic system prefix`.
29. [DONE] Git Commit: `fix(session-profiles): keep agents inside codex synthetic system prefix` (hash: self)
30. [DONE] `harness-ai.phase7.stream2.task7` Remove all Harness diagnostic headings, captured/tool JSON code fences and synthetic-profile explanatory text from the Codex synthetic native `baseInstructions`; keep the captured Codex system prompt byte-for-byte first, append only the materialized workspace AGENTS instructions in native project-instruction wrapper form, and rely on app-server structured tools for real Codex tooling (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/codex-synthetic-native-seed-prompt.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `docs/architecture/NativePromptComposition.md`, `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md`, `.harness/plans/todo-plan.md`; expected commit: `fix(session-profiles): remove synthetic markers from codex native prompt`). Result: Completed in commit `fix(session-profiles): remove synthetic markers from codex native prompt`.
31. [DONE] Git Commit: `fix(session-profiles): remove synthetic markers from codex native prompt` (hash: self)
32. [DONE] `harness-ai.phase7.stream2.task8` Record the native prompt format invariant and the Codex cache experiment finding: changing content is allowed only inside the provider-native structure, while Harness headings, labels, code fences, diagnostic wrappers or other non-native markers in the system profile break static-prefix/cache recognition (scope: `docs/architecture/NativePromptComposition.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(architecture): record native prompt format invariants`). Result: Completed in commit `docs(architecture): record native prompt format invariants`.
33. [DONE] Git Commit: `docs(architecture): record native prompt format invariants` (hash: self)
34. [DONE] `harness-ai.phase7.stream2.task9` Generalize the prompt format invariant from Codex Native to all session profiles: any provider-facing profile prompt must preserve the target provider/profile payload shape, while Harness diagnostics, provenance, wrappers and explanations stay outside prompt text (scope: `docs/architecture/SessionProfiles.md`, `docs/architecture/NativePromptComposition.md`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(session-profiles): generalize profile prompt format invariant`). Result: Completed in commit `docs(session-profiles): generalize profile prompt format invariant`.
35. [DONE] Git Commit: `docs(session-profiles): generalize profile prompt format invariant` (hash: self)
36. [DONE] `harness-ai.phase7.stream2.task10` Add the test provider `CodexUC` as a Codex OAuth Responses-compatible universal-client surface: visible provider id, adapter registration, profile snapshot application, limited function-tool loop, usage/cache telemetry, focused tests and docs (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/**`, provider registry/descriptor/auth/readiness wiring, runtime-process registration, session UI model/reasoning labels, session profile docs/module docs/product tree, `.harness/plans/todo-plan.md`; expected commit: `feat(provider-runtime): add codex uc responses provider`). Result: Completed in commit `feat(provider-runtime): add codex uc responses provider`.
37. [DONE] Git Commit: `feat(provider-runtime): add codex uc responses provider` (hash: self)
