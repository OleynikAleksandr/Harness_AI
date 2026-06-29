# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "provider-readiness-2026-06-29",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase8.stream1.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request — provider readiness as a first-class concern, so a provider's workspace home/auth is never silently missing and New-Session cards show readiness. Designed and hardened across two external review rounds (points R1–R11 and round-2 points). The predecessor scope `session-delete-artifact-sync-2026-06-28` is archived under `.harness/plans/archive/`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/architecture/ReferenceCoreRuntimeBoundary.md`
  - `product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/module.md`
  - `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`

## Provider Readiness — Design Notes And Gap Resolutions

- **Goal:** (1) LIVENESS: at Core start and Reset Core, run a background full preflight per provider (start CLI/SDK + auth probe) against the GLOBAL provider home `~/.harness-ai/providers/<id>/home`, held in Core memory, no disk cache. (2) PROVISIONING: on workspace selection (and for the active workspace at start), do a LIGHT ensure of each provider's workspace home + auth carry-over (mkdir + symlink/re-materialize, NO CLI). (3) Live `provider:status` event so New-Session cards update in place. Four card states: Ready / "Checking provider…" / "Preparing workspace…" / Failed (non-clickable indication with an actionable Core-authored message). Card ready = liveness ready AND workspace provisioning ready. Reset Core re-runs liveness (already a real process restart). Do NOT auto-watch external relogin/CLI removal — that is a Reset Core action.
- **Architecture rule (binding):** new functionality lives in NEW clusters/modules with their own `*-facade`; existing working modules are touched ONLY for minimal additive contract changes; no logic mixed across modules/clusters/products.
- **Scope:** this is now a DEDICATED `provider-readiness` plan (session-delete archived), so there is no mixed-scope blocker; Phase 1 starts normally.
- **Single source of readiness truth (R3):** the empty placeholder `provider-runtime/clusters/provider-registry/modules/provider-health` ("provider status, startup, recovery reporting") OVERLAPS this concern. To avoid two sources of truth, Phase 1 ABSORBS it: the new `provider-readiness` cluster owns all readiness/status/recovery; the `provider-health` placeholder module is REMOVED (deleted from product-tree.json + product-tree.md + provider-registry/cluster.md + fs). `provider-registry` stays the static catalog only.
- **Reuse via facades (called, not edited beyond noted additive changes):** `provider-home-manager-facade` (`resolveProviderHome`, `prepareCodexHome`), `provider-auth-store-facade` (auth presence), `provider-adapter-contract` (the liveness probe + the NEW provider-owned `ensureWorkspaceHome`), `provider-registry-facade` (catalog/descriptor enrichment).
- **Event carries COMBINED readiness, not raw scope (R4 + round2.7):** the card needs combined readiness (liveness AND provisioning); the event must NOT expose a raw scope-specific status that the UI blindly writes (else `liveness: ready` while provisioning is pending would wrongly flip the card to ready). The registry owns ONE pure combine function (the same one `enrichDescriptor` uses); Core orchestration publishes the already-combined result for the active workspace (see Combined-event workspaceId ownership). Event shape: `{ type: "provider:status"; payload: { providerId: ProviderId; workspaceId: string; readinessStatus: "checking" | "preparing" | "ready" | "failed"; readinessMessage?: string }; timestamp: string }`. The renderer discriminates on `event.type === "provider:status"`, writes `readinessStatus`/`readinessMessage` straight onto the matching descriptor for the active workspace, classifies nothing. The type is declared in `session-window/src/vite-env.d.ts`.
- **Dependency direction — no import cycle (round2.6):** `provider-readiness-registry` is a PURE LEAF — stores raw liveness (global) + provisioning (per workspace) state, runs the combine function, exposes an observable; imports NOTHING from `provider-registry`/adapters. One-way edges only: `provider-registry.enrichDescriptor` → reads registry; `provider-liveness-checker` → writes registry + builds global-home adapters via the factory (NOT via provider-registry); `provider-workspace-provisioner` → writes registry + reads workspace adapters from `provider-registry` and calls `ensureWorkspaceHome`.
- **Combined-event workspaceId ownership (round3.6):** the registry is a pure leaf and does NOT know the active workspace. It exposes (a) a RAW-change observable and (b) a pure `combine(providerId, workspaceId)`. Core orchestration (which owns the active workspace via `workspace-registry`) subscribes to raw changes, computes the combined readiness for the ACTIVE workspace, and publishes the `provider:status` event with `workspaceId = active`. `enrichDescriptor` likewise calls `combine(provider, activeWorkspace)`. So a GLOBAL liveness change re-publishes combined events for the active workspace only; switching workspace re-publishes combined for the newly-active one. Core, not the registry, chooses the workspaceId.
- **Provider classification by capability (round2.10):** branch on the EXISTING `capabilities.requiresProviderHome` flag. `true` (claude, codex, kimi, glm-native, glm-opencode) → full preflight (`adapter.initialize()` on global home) + `ensureWorkspaceHome` provisioning. `false` (openrouter, local-models) → key-presence/reachability liveness + no-op provisioning. Covers kimi/glm-opencode without enumerating them.
- **GAP 1 — global-home factory: explicit path + env isolation (R7 + round2.2/2.3):** adapters are workspace-bound (constructor builds `<workspacePath>/.harness/runtime/providers/<id>/home` and mutates `process.env`). Liveness MUST NOT reuse the workspace-registered adapters. (1) Explicit `providerHomePath` override on the home-based provider facades resolved via `provider-home-manager.resolveProviderHome` — NOT passing the global path where a workspace root is expected (that would append `.harness/...` and break). (2) **process.env isolation across the WHOLE preflight (round3.2):** constructors AND `adapter.initialize()`/the nested SDK read `process.env` (`CODEX_HOME`/`HARNESS_CLAUDE_HOME`/…), so the env override MUST be held for the ENTIRE construct+initialize of one provider and restored after — not just around construction. Because `process.env` is a single global, home-based preflights therefore run SEQUENTIALLY (one provider's construct+initialize at a time, env restored between); API-key providers (no home env) may run concurrently. (Longer-term alternative: remove the global-env side effects so adapters read home only from passed options — out of MVP.) This factory + whole-preflight env isolation is the FIRST, BLOCKING work of Phase 2.
- **GAP 2 — provider-owned light provisioning (R8):** provisioning is PROVIDER-OWNED via a new optional contract method `ensureWorkspaceHome(workspacePath): Promise<void>` on `ProviderAdapter` (CLI-free, mirrors `deleteSessionArtifacts`). Per provider: Codex (auth.json + config materialize, no app-server start), Claude (keychain symlink + `.claude.json` carry-over extracted from `ensureProviderHomeSessionBootstrap` into a CLI-free helper — touches the Claude module + docs), GLM-native/Kimi/glm-opencode (mkdir home + light auth), API-key providers (no-op default). The provisioner calls `adapter.ensureWorkspaceHome` through the contract — provider-home-manager is a building block, not the place for per-provider auth logic.
- **GAP 3 — readiness combination (R6):** the registry's combine function: failed if liveness failed; checking if liveness pending; preparing if liveness ready but provisioning pending; ready if both. Used by both the published event and `enrichDescriptor` (active workspace from `workspace-registry`). `listProviders()` stays argument-free for MVP; per-window/detached-workspace readiness is a deferred nuance (add a `workspaceId` arg later if needed).
- **API-key liveness depth (R9 + round3.1):** ONLY `openrouter` and `local-models` are API-key (`requiresProviderHome: false`). `openrouter` liveness = key presence (lazy MVP); `local-models` = `loadLocalModels` reachability (else failed with actionable message). `glm-opencode` is home-based (`requiresProviderHome: true`) and goes through the FULL preflight + provisioning — it is NOT key-presence. (Corrects the earlier contradiction.)
- **Gates per new module:** each new module needs `module.md`, a `*-facade.ts` (singleton export), a `product-tree.json` + `product-tree.md` entry, `cluster.md` (new cluster), `product-part.md` update, and `DOCUMENTATION_INDEX.md` update — all in the same commit (docs-sync gate). Every source file ≤500 lines (check:architecture).
- **Point tests (R11):** registry transitions + combine + observable publish (Phase 1), liveness ready/failed classification (Phase 2), `ensureWorkspaceHome` idempotency per provider (Phase 3), descriptor combination (Phase 4).

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary; new functionality = new clusters/modules with facades; existing modules touched only for minimal additive contract changes.
- Application Shell is UI/supervisor/client only; not a source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit; update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Provider Readiness Cluster And Status Registry (owner: Codex, updated: 2026-06-29)

### Stream: Readiness registry

1. [DONE] `harness-ai.phase1.stream1.task1` Create the new cluster and the readiness registry as a PURE LEAF, and ABSORB the `provider-health` placeholder (R3): store raw liveness (global) + provisioning (per workspace) state per provider, own the single pure `combine(providerId, workspaceId)` function, and expose a RAW-change observable (Core computes the combined readiness for the active workspace and publishes the `provider:status` event per round3.6 — the registry itself does not know the active workspace); add a point test for transitions + combine + raw observable; delete the empty `provider-registry/modules/provider-health` module (fs + product-tree.json + product-tree.md + provider-registry `cluster.md`) (product-part: provider-runtime / cluster: provider-readiness / module: provider-readiness-registry; remove: provider-registry/modules/provider-health; scope: `product-parts/provider-runtime/clusters/provider-readiness/cluster.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-readiness-registry/module.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-readiness-registry/src/provider-readiness-registry-facade.ts` plus the registry test, `.harness/product-tree/product-tree.json`, `.harness/product-tree/product-tree.md`, `product-parts/provider-runtime/product-part.md`, `product-parts/provider-runtime/clusters/provider-registry/cluster.md`, `docs/DOCUMENTATION_INDEX.md`; expected commit: `feat: add provider-readiness cluster with status registry`). Result: Completed in commit `feat: add provider-readiness cluster with status registry`.
2. [DONE] Git Commit: `feat: add provider-readiness cluster with status registry` (hash: self)

## Phase 2 - Liveness Preflight (owner: Codex, updated: 2026-06-29)

### Stream: Global-home adapter factory (env-isolated)

3. [DONE] `harness-ai.phase2.stream1.task1` (BLOCKING) Scaffold the `provider-liveness-checker` module (module.md + cluster.md + product-tree registration in the SAME commit) and the `global-home-adapter-factory`: add an explicit optional `providerHomePath` override to the Codex and Claude facade constructors (NOT workspace-root reuse), resolve the global home via `provider-home-manager.resolveProviderHome`, and have the factory expose a runner that snapshots/restores `process.env` around the WHOLE construct+initialize preflight of one provider — holding the env override until `initialize()` completes, not just around construction (GAP 1 round3.2), with home-based preflights run sequentially. ≤3 functional files (factory + codex-facade + claude-facade) (product-part: provider-runtime / cluster: provider-readiness / module: provider-liveness-checker, plus additive `providerHomePath` on codex/claude facades; scope: `product-parts/provider-runtime/clusters/provider-readiness/cluster.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-liveness-checker/module.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-liveness-checker/src/global-home-adapter-factory.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.ts` plus product-tree docs + `docs/DOCUMENTATION_INDEX.md`; expected commit: `feat: global-home adapter factory with env isolation`). Result: Completed in commit `feat: global-home adapter factory with env isolation`.
4. [DONE] Git Commit: `feat: global-home adapter factory with env isolation` (hash: self)

5. [DONE] `harness-ai.phase2.stream1.task2` Add the explicit `providerHomePath` override to the remaining home-based provider facades (kimi, glm-native, glm-opencode). The factory from task1 is generic over `providerHomePath` and is NOT edited here (round3.3); exactly 3 functional files (product-part: provider-runtime / cluster: provider-adapters / modules: kimi-provider, glm-native-provider, glm-opencode-provider; scope: `kimi-provider/src/kimi-provider-facade.ts, glm-native-provider/src/glm-native-provider-facade.ts, glm-opencode-provider/src/glm-opencode-provider-facade.ts` plus their `module.md` updates; expected commit: `feat: global-home support for kimi, glm-native, glm-opencode`). Result: Completed in commit `feat: global-home support for kimi, glm-native, glm-opencode`.
6. [DONE] Git Commit: `feat: global-home support for kimi, glm-native, glm-opencode` (hash: self)

### Stream: Liveness checker

7. [DONE] `harness-ai.phase2.stream2.task1` Add the liveness checker: per provider branch on `capabilities.requiresProviderHome` — home-based providers (`requiresProviderHome: true` — claude, codex, kimi, glm-native, glm-opencode) run a full background preflight against the GLOBAL home via the factory (`adapter.initialize()`), one at a time per the whole-preflight env isolation (GAP 1 round3.2); API-key providers (only openrouter, local-models) use key presence and `loadLocalModels` reachability for local-models (R9); classify ready/failed with a human actionable message; write raw liveness into the registry; add a point test for failed-vs-ready classification (product-part: provider-runtime / cluster: provider-readiness / module: provider-liveness-checker; scope: `product-parts/provider-runtime/clusters/provider-readiness/modules/provider-liveness-checker/module.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-liveness-checker/src/provider-liveness-checker-facade.ts` plus the checker test; expected commit: `feat: provider liveness preflight checker`). Result: Completed in commit `feat: provider liveness preflight checker`.
8. [DONE] Git Commit: `feat: provider liveness preflight checker` (hash: self)

## Phase 3 - Workspace Provisioning (owner: Codex, updated: 2026-06-29)

### Stream: Provider-owned ensure-home contract

9. [DONE] `harness-ai.phase3.stream1.task1` Add optional, CLI-free `ensureWorkspaceHome(workspacePath): Promise<void>` to the provider-adapter contract (GAP 2, provider-owned like `deleteSessionArtifacts`; API-key providers leave it unimplemented = no-op default), plus a reusable CLI-free home/auth materialization helper in the home manager; update the home-manager module.md (product-part: provider-runtime / cluster: provider-adapters / module: provider-adapter-contract, and provider-home-and-auth / provider-home-manager; scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/module.md`; expected commit: `feat: provider-owned ensure-workspace-home contract`). Result: Completed in commit `feat: provider-owned ensure-workspace-home contract`.
10. [DONE] Git Commit: `feat: provider-owned ensure-workspace-home contract` (hash: self)

### Stream: Per-provider ensure-home implementations

11. [DONE] `harness-ai.phase3.stream2.task1` Implement Codex `ensureWorkspaceHome` (auth.json + config materialize, no app-server start) with an idempotency point test; update the codex module.md (round3.5) (product-part: provider-runtime / cluster: provider-adapters / module: codex-provider; scope: codex adapter + an ensure helper + test + `codex-provider/module.md`; expected commit: `feat: codex ensure-workspace-home`). Result: Completed in commit `feat: codex ensure-workspace-home`.
12. [DONE] Git Commit: `feat: codex ensure-workspace-home` (hash: self)

13. [DONE] `harness-ai.phase3.stream2.task2` Implement Claude `ensureWorkspaceHome` by extracting the keychain symlink + `.claude.json` carry-over out of `ensureProviderHomeSessionBootstrap` into a CLI-free helper (touches the Claude module + its `module.md`), with an idempotency point test (product-part: provider-runtime / cluster: provider-adapters / module: claude-provider; scope: claude adapter + the new CLI-free keychain/.claude.json helper + `claude-provider/module.md` + test; expected commit: `feat: claude ensure-workspace-home`). Result: Completed in commit `feat: claude ensure-workspace-home`.
14. [DONE] Git Commit: `feat: claude ensure-workspace-home` (hash: self)

15. [DONE] `harness-ai.phase3.stream2.task3` Implement GLM-native `ensureWorkspaceHome` (mkdir home + light auth carry-over) with an idempotency point test; update the module.md (round3.4/3.5 — split per provider) (product-part: provider-runtime / cluster: provider-adapters / module: glm-native-provider; scope: glm-native adapter + test + `glm-native-provider/module.md`; expected commit: `feat: glm-native ensure-workspace-home`). Result: Completed in commit `feat: glm-native ensure-workspace-home`.
16. [DONE] Git Commit: `feat: glm-native ensure-workspace-home` (hash: self)

17. [DONE] `harness-ai.phase3.stream2.task4` Implement Kimi `ensureWorkspaceHome` (mkdir home + light auth carry-over) with an idempotency point test; update the module.md (product-part: provider-runtime / cluster: provider-adapters / module: kimi-provider; scope: kimi adapter + test + `kimi-provider/module.md`; expected commit: `feat: kimi ensure-workspace-home`). Result: Completed in commit `feat: kimi ensure-workspace-home`.
18. [DONE] Git Commit: `feat: kimi ensure-workspace-home` (hash: self)

19. [DONE] `harness-ai.phase3.stream2.task5` Implement glm-opencode `ensureWorkspaceHome` (mkdir home + light auth carry-over) with an idempotency point test; update the module.md (product-part: provider-runtime / cluster: provider-adapters / module: glm-opencode-provider; scope: glm-opencode adapter + test + `glm-opencode-provider/module.md`; expected commit: `feat: glm-opencode ensure-workspace-home`). Result: Completed in commit `feat: glm-opencode ensure-workspace-home`.
20. [DONE] Git Commit: `feat: glm-opencode ensure-workspace-home` (hash: self)

### Stream: Provisioner module

21. [DONE] `harness-ai.phase3.stream3.task1` Add the workspace provisioner: for the selected workspace, mark each provider provisioning 'preparing' in the registry, call `adapter.ensureWorkspaceHome(workspacePath)` via the contract, then mark 'ready'/'failed'; background, no CLI (product-part: provider-runtime / cluster: provider-readiness / module: provider-workspace-provisioner; scope: `product-parts/provider-runtime/clusters/provider-readiness/modules/provider-workspace-provisioner/module.md, product-parts/provider-runtime/clusters/provider-readiness/modules/provider-workspace-provisioner/src/provider-workspace-provisioner-facade.ts, product-parts/provider-runtime/clusters/provider-readiness/cluster.md` plus product-tree docs; expected commit: `feat: provider workspace provisioner`). Result: Completed in commit `feat: provider workspace provisioner`.
22. [DONE] Git Commit: `feat: provider workspace provisioner` (hash: self)

## Phase 4 - Readiness In Descriptor (owner: Codex, updated: 2026-06-29)

### Stream: Descriptor readiness

23. [DONE] `harness-ai.phase4.stream1.task1` Additively expose readiness on `ProviderDescriptor` (which lives in `provider-registry-facade.ts`): add `readinessStatus` ('ready'|'checking'|'preparing'|'failed') and optional `readinessMessage`; have `enrichDescriptor` call the registry's pure `combine(provider, activeWorkspace)` (active workspace from workspace-registry) — do not re-implement precedence; add a point test confirming the combination (product-part: provider-runtime / cluster: provider-registry / module: provider-registry; scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.ts, product-parts/provider-runtime/clusters/provider-registry/modules/provider-registry/module.md` plus the combination test; expected commit: `feat: expose provider readiness in descriptor`). Result: Completed in commit `feat: expose provider readiness in descriptor`.
24. [DONE] Git Commit: `feat: expose provider readiness in descriptor` (hash: self)

## Phase 5 - Core Orchestration And Event Forwarding (owner: Codex, updated: 2026-06-29)

### Stream: Core orchestration

25. [DONE] `harness-ai.phase5.stream1.task1` Wire orchestration in Core (minimal touch): `initialize()` fires the liveness preflight (fire-and-forget) after adapter registration (and thus on Reset Core); `selectWorkspace()`/`addWorkspace()` fire the workspace provisioner for the active workspace; subscribe to the readiness-registry RAW-change observable, compute `combine(provider, activeWorkspace)` and PUBLISH the combined `provider:status` event for the active workspace (round3.6); fan-out `CoreRuntimeApi.subscribe()` over BOTH `sessionEventStreamFacade` and these provider-status events, returning a composed unsubscribe — readiness events stay in-memory, never written to session JSONL (product-part: core-runtime / cluster: runtime-process / module: core-runtime-process; scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `feat: orchestrate provider readiness from core runtime`). Result: Completed in commit `feat: orchestrate provider readiness from core runtime`.
26. [DONE] Git Commit: `feat: orchestrate provider readiness from core runtime` (hash: self)

## Phase 6 - New-Session Cards With Live States (owner: Codex, updated: 2026-06-29)

### Stream: Provider cards

27. [DONE] `harness-ai.phase6.stream1.task1` Render the four card states (Ready clickable / "Checking provider…" / "Preparing workspace…" / Failed non-clickable with message), disable non-ready, add the spinner CSS; declare the `provider:status` event type in `vite-env.d.ts`; subscribe `session-window-facade` to `provider:status` events and write the event's COMBINED `readinessStatus`/`readinessMessage` straight onto the matching descriptor for the active workspace — display-only, the renderer classifies nothing (product-part: application-shell / cluster: session-interface / module: session-window; scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/provider-picker.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat: live provider readiness states in new-session cards`). Result: Completed in commit `feat: live provider readiness states in new-session cards`.
28. [DONE] Git Commit: `feat: live provider readiness states in new-session cards` (hash: self)

## Phase 7 - Verification And Packaging (owner: Codex, updated: 2026-06-29)

### Stream: Build And Evidence

29. [DONE] `harness-ai.phase7.stream1.task1` Run required gates (architecture, lint, knip, typecheck, tests, dup, security, links), then build and package the macOS app (user-confirmed at that time), and record evidence (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify and package provider readiness`). Result: Completed in commit `chore: verify and package provider readiness`.
30. [DONE] Git Commit: `chore: verify and package provider readiness` (hash: self)

## Phase 8 - User Acceptance: Provider Readiness (owner: User, updated: 2026-06-29)

### Stream: Retest

31. [IN_PROGRESS] `harness-ai.phase8.stream1.task1` User retests in the packaged app: at start providers show Checking → Ready/Failed; entering a workspace shows Preparing → Ready; a failed provider is blocked with an actionable message; Reset Core re-runs the checks; cards update live without reopening (scope: user workflow; expected commit: none).
