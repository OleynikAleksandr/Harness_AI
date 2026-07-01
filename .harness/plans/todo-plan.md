# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "openrouter-translation-engines-2026-07-01",
  "branch": "claude/silly-tesla-92349d",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task2",
  "expectedCommitMessage": "feat(core-runtime-process): route dynamic translation through configured OpenRouter engines",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request (chat, 2026-07-01) — surface the OpenRouter
  models already configured in `Settings > OpenRouter > OpenRouter Profiles`
  (`UI Translation Model`, `Reasoning Translation Model`) as additional options
  in the `General Settings > UI Translation Engine` /
  `Reasoning Translation Engine` dropdowns, next to the existing
  `Google GTX Free` option, and route actual translation through the selected
  OpenRouter model when chosen.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/module.md`
  - `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/openrouter-provider/module.md`
    (reference: existing `providerAuthStoreFacade`-backed OpenRouter
    auth/model resolution pattern to reuse, not the agentic session/tool-loop
    code path)
- **Confirmed product decisions (2026-07-01):**
  - Dropdown label for the OpenRouter option shows the raw model slug (e.g.
    `OpenRouter (google/gemini-2.5-flash-lite)`); no pretty-name lookup/persist.
  - The OpenRouter option is hidden from a dropdown entirely while its profile
    model still equals the unset placeholder `"openrouter-default"`.
- **Confirmed architecture (verified in code, 2026-07-01):**
  - `ProviderTranslationEnginesFacade` is already a generic engine registry
    (`registerEngine`, resolve by `engineId`); no hardcoded GTX-only path.
  - `provider-runtime` never imports from `core-runtime` (verified by grep) —
    the new OpenRouter engine must receive model/endpointTag/apiKey/baseUrl
    from its constructor, supplied by the Core Runtime caller which already
    holds `HarnessSettings`. No settings schema changes are required:
    `providers.openRouter.translationProfiles.{uiTranslation,reasoningTranslation}.{model,endpointTag}`
    already exist.
  - Two distinct engine ids will be registered per call site
    (`openrouter-ui-translation`, `openrouter-reasoning-translation`), each
    bound to its own profile's model/endpointTag at construction time — no
    change to `ProviderTranslationRequest`/`ProviderTranslationResult`.
  - The live reasoning-overlay path (`reasoning-translation-overlay-facade.ts`,
    driven from `session-request-handler-facade.ts`) needs its settings
    snapshot extended with the reasoning OpenRouter profile so the engine can
    be built per call instead of frozen at singleton construction time.

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

## Phase 0 - Architecture Debt: Remove Unimplemented Product Tree Scaffolds (owner: Codex, updated: 2026-07-01)

### Stream: Cleanup

> Discovered while starting Phase 1: `check:architecture` failed on a clean
> tree (verified via `git stash`) because `product-tree-store` (and, once
> scanned fully, 12 sibling modules across 4 clusters) were declared in
> `product-tree.json` with only a `module.md` and no `src/`, tripping the
> gate's unconditional `assertExists(src)` check for every module in the tree.
> User-approved (2026-07-01): remove all 13 unimplemented scaffolds rather
> than stub them out or split this into its own separate session.
>
> While committing this, `git commit` also failed with an unrelated
> pre-existing bug: `scripts/plan.mjs`'s `validate-commit-message` dispatch did
> `join(process.cwd(), args[0])` on the commit-message file path, but git
> passes an absolute path to `commit-msg` hooks in a linked worktree (the
> worktree's `.git` is a file, not a directory, so a worktree-relative path
> isn't filesystem-addressable) — the two absolute segments concatenated into
> a bogus doubled path and threw `ENOENT`. Fixed by switching to
> `resolve(args[0] ?? "")`, which passes an already-absolute path through
> unchanged and still resolves a relative one against `cwd`, matching prior
> behavior for the non-worktree case. Bundled into this same commit since it
> was impossible to commit anything in this worktree without it first.

1. [DONE] `harness-ai.phase0.stream1.task1` Remove 13 never-implemented `module.md`-only modules (`product-tree-store`, `workspace-skeleton-materializer`, `workspace-link-contract`, `session-history-store`, `turn-lifecycle`, `plan-orchestrator`, `git-transaction-manager`, `task-scope-guard`, `quality-gate-runner`, `intent-envelope-contract`, `normalizer-provider-runner`, `execution-envelope-validator`, `provider-runtime-files`) from the product tree, deleting the two clusters left empty by this (`development-orchestrator`, `intent-normalization`) entirely, and fix the `scripts/plan.mjs` commit-message path bug that blocked committing in a worktree (scope: `.harness/product-tree/product-tree.json`, `.harness/product-tree/product-tree.md`, `product-parts/core-runtime/clusters/workspace-architecture/cluster.md`, `product-parts/core-runtime/clusters/session-runtime/cluster.md`, `product-parts/provider-runtime/clusters/provider-home-and-auth/cluster.md`, `product-parts/core-runtime/product-part.md`, `scripts/plan.mjs`, plus deletion of the 13 module directories and the 2 emptied cluster directories; expected commit: `chore(product-tree): remove unimplemented module.md-only scaffolds blocking check:architecture`). Result: Completed in commit `chore(product-tree): remove unimplemented module.md-only scaffolds blocking check:architecture`.
2. [DONE] Git Commit: `chore(product-tree): remove unimplemented module.md-only scaffolds blocking check:architecture` (hash: self)

## Phase 1 - OpenRouter Translation Engine Integration (owner: Codex, updated: 2026-07-01)

### Stream: Engine And Wiring

3. [DONE] `harness-ai.phase1.stream1.task1` Add `OpenRouterTranslationEngine` (a `ProviderTranslationEngine` implementation issuing a lean, one-shot, non-streaming OpenRouter chat-completion call), a `createProviderTranslationEngines(...)` factory that builds `[GoogleGtxTranslationEngine, OpenRouterTranslationEngine(ui), OpenRouterTranslationEngine(reasoning)]` from an OpenRouter profile config, and wire it into the static UI localization translation path (`core-localization-runtime.ts`) so `uiEngineId` resolution can reach the configured OpenRouter UI translation model — combined in one commit because an unwired factory trips `check:knip`'s dead-code check (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/openrouter-translation-engine.ts`, `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-factory.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.ts`, plus `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/module.md` and `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat(provider-translation-engines): add OpenRouter translation engine and route ui localization translation through it`). Result: Completed in commit `feat(provider-translation-engines): add OpenRouter translation engine and route ui localization translation through it`.
4. [DONE] Git Commit: `feat(provider-translation-engines): add OpenRouter translation engine and route ui localization translation through it` (hash: self)

5. [IN_PROGRESS] `harness-ai.phase1.stream1.task2` Wire the same factory into the ad-hoc dynamic translation call site so `reasoningEngineId` resolution there can reach the configured OpenRouter reasoning translation model too (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-dynamic-translation.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat(core-runtime-process): route dynamic translation through configured OpenRouter engines`).
6. [TODO] Git Commit: `feat(core-runtime-process): route dynamic translation through configured OpenRouter engines` (hash: TBD)

7. [TODO] `harness-ai.phase1.stream1.task3` Extend the live reasoning-overlay translation path so `reasoningEngineId` resolution can reach the configured OpenRouter reasoning translation model, building the engine set per call instead of at singleton construction time (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts`, `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/module.md`, `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`; expected commit: `feat(reasoning-translation-overlay): route live reasoning translation through configured OpenRouter engine`).
8. [TODO] Git Commit: `feat(reasoning-translation-overlay): route live reasoning translation through configured OpenRouter engine` (hash: TBD)

9. [TODO] `harness-ai.phase1.stream1.task4` Add the OpenRouter option (slug-labeled, hidden while its profile model is the unset placeholder) to the General Settings `UI Translation Engine` and `Reasoning Translation Engine` dropdowns (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx`, `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `feat(provider-settings-ui): surface configured OpenRouter translation models in General Settings`).
10. [TODO] Git Commit: `feat(provider-settings-ui): surface configured OpenRouter translation models in General Settings` (hash: TBD)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-01)

### Stream: Package And Retest

11. [TODO] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app for OpenRouter translation engine verification`).
12. [TODO] Git Commit: `chore(package): rebuild packaged app for OpenRouter translation engine verification` (hash: TBD)
13. [TODO] `harness-ai.phase2.stream1.task2` User retests OpenRouter-backed UI/Reasoning Translation Engine selection in the packaged app (scope: user workflow; expected commit: none).
