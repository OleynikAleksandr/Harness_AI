# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-glossary-open-fix-2026-07-01",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request (chat, 2026-07-01) — audit of
  Settings > General > "Glossary protection" > "Open glossary file" found the
  button throws a native "Path does not exist" alert instead of opening the
  do-not-translate glossary in VS Code.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`
  - `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`
  - `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md`
  - `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
- **Confirmed audit findings (verified in code, 2026-07-01):**
  - Root cause #1: `openGlossary()` in
    `provider-settings-ui/src/settings-surface-facade.tsx:228-230` builds
    `${workspacePath}/.harness/settings/localization-glossary.txt` — a path
    inside the user's open project that has never been written anywhere. The
    real glossary file lives at Core-resolved
    `<harnessHome>/Localization/glossary/do-not-translate-terms.txt`
    (`resolveCoreLocalizationRootDirectory()` in `core-localization-runtime.ts`
    joined with `"glossary"`, consumed by
    `UserGlossaryStore` in `localization-runtime/src/user-glossary-store.ts`).
  - Root cause #2: `UserGlossaryStore.ensureEditableGlossaryFile()`
    (`user-glossary-store.ts:56-68`) already implements "create with seeded
    terms if missing, else return existing path" exactly as the UI copy
    promises, but grep across `product-parts/**` confirms it is never called
    from any production code path — it is unreachable dead code today.
  - Root cause #3: there is no IPC/RPC bridge for this action at all. The
    working reference pattern is `window.harnessCore.getSettings(...)` ->
    `preload.cjs` `ipcRenderer.invoke("harness-ai:core:get-settings", ...)` ->
    `IPC_TO_RPC` map in `core-process-bridge-facade.mjs` -> `"get-settings"`
    case in `CoreRuntimeApi.invoke()` (`core-runtime-api.ts`). The new
    `ensure-glossary-file` RPC must follow this exact same four-layer shape,
    plus its `Window.harnessCore` type declared in
    `session-window/src/vite-env.d.ts` (the sole `.d.ts` for this contract).
    Side-effecting methods in this switch (`saveSettings`,
    `updateProviderVersion`) return `{ ok: true, ... } | { error, ok: false }`;
    the new method follows that same shape (`{ ok: true, filePath } | { error,
    ok: false }`), since it does a real filesystem side effect (mkdir +
    conditional writeFile) that is a genuine system-boundary failure point.
  - Glossary protection is NOT purely declarative: when
    `settings.general.localization.glossaryEnabled` is true,
    `materializeCoreLocalizationRuntimePayload` (`core-localization-runtime.ts:18-27`)
    loads the file and feeds it to `GlossaryProtector`, which really masks/
    restores preserved terms around translation calls. It is currently inert
    only because the file is never created, so `load()` falls back to
    `{ preserve: [] }`.
  - Out of scope for this cycle (flagged to user, not bundled): the UI source
    string `settings.localization.glossary.prefilled`
    (`source-dictionaries.ts:119-120`, "File is prefilled with common terms
    such as: Project Manager, Description, CODEX_HOME, questionnaire.md.")
    lists example terms that do not match the actual
    `SEEDED_PRESERVE_TERMS` array in `user-glossary-store.ts:15-24`
    (`Harness AI, CodeAI Hub, Project Manager, Claude, Codex, VS Code,
    TypeScript, Markdown`). This is a separate, smaller copy/content mismatch
    the user has not asked to fix yet.

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

## Phase 1 - Glossary Open-File Fix (owner: Codex, updated: 2026-07-01)

### Stream: Core RPC For Glossary File

1. [DONE] `harness-ai.phase1.stream1.task1` Add `ensureCoreGlossaryFileRpcResult()` in a new sibling file `core-glossary-rpc.ts` (reusing `resolveCoreLocalizationRootDirectory()` from `core-localization-runtime.ts` + `UserGlossaryStore.ensureEditableGlossaryFile()`; kept out of `core-localization-runtime.ts` itself and out of `core-runtime-api.ts` as a private method because `core-runtime-api.ts` was already at 496/500 lines and either placement would have pushed it over the 500-line cap) and wire a new `"ensure-glossary-file"` case into `CoreRuntimeApi.invoke()` (`core-runtime-api.ts`) that calls it directly, returning `{ ok: true, filePath } | { error, ok: false }` (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-glossary-rpc.ts` (new), `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat(core-runtime-process): add ensure-glossary-file Core RPC to create and resolve the do-not-translate glossary file`). Result: Completed in commit `feat(core-runtime-process): add ensure-glossary-file Core RPC to create and resolve the do-not-translate glossary file`.
2. [DONE] Git Commit: `feat(core-runtime-process): add ensure-glossary-file Core RPC to create and resolve the do-not-translate glossary file` (hash: self)

### Stream: IPC Bridge And Renderer Types

3. [DONE] `harness-ai.phase1.stream2.task1` Forward the new RPC end-to-end to the renderer: add `"harness-ai:core:ensure-glossary-file": "ensure-glossary-file"` to the `IPC_TO_RPC` map (`core-process-bridge-facade.mjs`), expose `ensureGlossaryFile: () => ipcRenderer.invoke("harness-ai:core:ensure-glossary-file")` on `window.harnessCore` (`preload.cjs`), and declare `ensureGlossaryFile(): Promise<{ ok: true; filePath: string } | { error: string; ok: false }>` on the `Window.harnessCore` interface (`vite-env.d.ts`) (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`, `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`, plus `core-process-bridge/module.md` and `app-bootstrap/module.md`; expected commit: `feat(core-process-bridge): forward ensure-glossary-file RPC through preload and renderer bridge types`). Result: Completed in commit `feat(core-process-bridge): forward ensure-glossary-file RPC through preload and renderer bridge types`.
4. [DONE] Git Commit: `feat(core-process-bridge): forward ensure-glossary-file RPC through preload and renderer bridge types` (hash: self)

### Stream: Renderer Button Fix

5. [DONE] `harness-ai.phase1.stream3.task1` Fix `openGlossary()` in `settings-surface-facade.tsx` to call `window.harnessCore.ensureGlossaryFile()` first and open the real returned `filePath` via `vscode://file/<filePath>:1:1` instead of the fabricated workspace-relative path, surfacing the `{ error, ok: false }` branch through the existing `setStatus` feedback line instead of a native alert; this removes the component's only use of the `workspacePath` prop, so it is dropped from `ProviderSettingsUiFacadeProps` and from the caller in `session-window-facade.tsx` (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`, `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix(provider-settings-ui): open the real do-not-translate glossary file via Core instead of a nonexistent workspace path`). Result: Completed in commit `fix(provider-settings-ui): open the real do-not-translate glossary file via Core instead of a nonexistent workspace path`.
6. [DONE] Git Commit: `fix(provider-settings-ui): open the real do-not-translate glossary file via Core instead of a nonexistent workspace path` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-01)

### Stream: Package And Retest

7. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app for glossary open-file fix`). Result: Completed in commit `chore(package): rebuild packaged app for glossary open-file fix`.
8. [DONE] Git Commit: `chore(package): rebuild packaged app for glossary open-file fix` (hash: self)
9. [DONE] `harness-ai.phase2.stream1.task2` User retests "Open glossary file" in the packaged app: the button opens the real, auto-created `do-not-translate-terms.txt` in VS Code with seeded terms, no native error dialog (scope: user workflow; expected commit: none). Result: User confirmed (chat, 2026-07-01) — "Glossary protection заработал нормально!" User then asked how to make an edited glossary actually retranslate; this is the new work in Phase 3+ below.

## Phase 3 - Core Runtime Api Architecture Split (owner: Codex, updated: 2026-07-01)

### Stream: Split Provider Lifecycle Out Of CoreRuntimeApi

> Discovered while starting the "Rebuild translations" feature: `core-runtime-api.ts`
> was already at 499/500 lines after the Phase 1 `ensure-glossary-file` addition,
> so the next new RPC case would have pushed it over the 500-line implementation
> file cap again. User directed (chat, 2026-07-01): whenever a class in this
> module approaches 500 lines, split it into two documents by functionality
> instead of doing further ad hoc line-shaving.

10. [DONE] `harness-ai.phase3.stream1.task1` Split `CoreRuntimeApi` (`core-runtime-api.ts`) by responsibility: keep RPC dispatch (`invoke()`) plus workspace/session/settings handling in `CoreRuntimeApi`, and move provider adapter registration + provider readiness event publishing (previously `registerProviderAdapters`/`registerProviderAdapter`/`publishProviderStatus`/`startProviderLivenessPreflight`/`subscribeProviderReadiness`/`handleProviderReadinessChange`/`syncProviderReadinessWorkspace`, plus the `providerStatusListeners`/`readinessUnsubscribe` state) into a new `CoreProviderLifecycle` class in `core-provider-lifecycle.ts`; the per-provider adapter instantiation switch itself becomes a plain `registerProviderAdapterInstance()` function in a new `core-provider-adapter-registration.ts` (already extracted while investigating the line-count block). `CoreRuntimeApi` now holds a `providerLifecycle` instance and delegates to it. Result: `core-runtime-api.ts` shrank from 499 to 369 lines; `core-provider-lifecycle.ts` is 111 lines and `core-provider-adapter-registration.ts` is 60 lines, both well under the cap. Updated 7 static-source regression tests (`core-runtime-process-facade.test.mjs` plus the claude/kimi/glm-native/glm-opencode/local-models/openrouter provider facade tests) that asserted specific literal code (e.g. `new ClaudeProviderFacade(model, workspacePath)`, `providerRegistryFacade.clearAdapters`, `type: "provider:status"`) existed in `core-runtime-api.ts`, to instead check the file each assertion's target code actually moved to (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-lifecycle.ts` (new), `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts` (new), `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-facade.test.mjs`, plus the 6 provider facade test files' path-only updates, and `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `refactor(core-runtime-process): split provider adapter lifecycle out of CoreRuntimeApi to stay under the 500-line file cap`). Result: Completed in commit `refactor(core-runtime-process): split provider adapter lifecycle out of CoreRuntimeApi to stay under the 500-line file cap`.
11. [DONE] Git Commit: `refactor(core-runtime-process): split provider adapter lifecycle out of CoreRuntimeApi to stay under the 500-line file cap` (hash: self)
