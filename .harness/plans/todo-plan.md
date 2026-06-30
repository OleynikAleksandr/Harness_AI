# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-transfer-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task1",
  "expectedCommitMessage": "feat: add translation engine contract",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request to port CodeAI Hub localization, UI text marking, glossary protection, and translation-first reasoning reveal into Harness AI.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/ProjectManagerSettingsParity.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
  - `product-parts/core-runtime/clusters/settings-and-localization/cluster.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/cluster.md`
  - `product-parts/application-shell/clusters/session-interface/cluster.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`

## Reference Transfer Rules

- Reuse CodeAI Hub behavior and small proven helpers where possible; do not copy whole modules wholesale.
- Preserve Harness AI Product Part / Cluster / Module ownership.
- New runtime behavior must enter through existing module facades:
  - `LocalizationRuntimeFacade`
  - `ReasoningTranslationOverlayFacade`
  - `ProviderTranslationEnginesFacade`
  - existing session, settings, and application-shell facades
- Application Shell displays Core read models and sends user input only. It must not decide localization policy, reasoning policy, translation engine resolution, glossary rules, provider truth, or persistence truth.
- UI/help/menu copy must be explicitly marked with a localization category and stable message id before it can be translated. Component fallback strings are bootstrap safety only.
- Visible reasoning uses translation-first display: Core keeps source transcript truth, marks pending visible reasoning, writes translated overlays, and the UI reveals localized content progressively.
- Hidden provider reasoning is never translated.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Listed task scope names the functional files. Each source-code task must also update the affected `module.md`, `cluster.md`, `product-part.md`, architecture docs, and catalog entries in the same commit when the code changes behavior, ownership, facade surface, or tracked Markdown inventory.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for workflow, settings, provider state, limits, tokens, reasoning, artifacts or orchestration.
- Any source change updates every related Markdown document in the same commit: affected `module.md`, `cluster.md`, `product-part.md`, architecture docs, product tree docs, README/AGENTS/CLAUDE when relevant, and any related `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-06-30)

### Stream: Active Plan

1. [DONE] `harness-ai.phase0.stream1.task1` Create the active transfer plan for UI localization and reasoning translation (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: create localization transfer scope`). Result: Completed in commit `plan: create localization transfer scope`.
2. [DONE] Git Commit: `plan: create localization transfer scope` (hash: self)

### Stream: Plan Refinement

3. [DONE] `harness-ai.phase0.stream2.task1` Refine the active localization transfer plan after critical self-review before implementation (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: refine localization transfer scope`). Result: Completed in commit `plan: refine localization transfer scope`.
4. [DONE] Git Commit: `plan: refine localization transfer scope` (hash: self)

## Phase 1 - Provider Translation Engines (owner: Codex, updated: 2026-06-30)

### Stream: Shared Translation Contract

5. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` Add the minimal provider-neutral translation request/result contract, engine registry, fail-closed no-engine behavior, and output formatting normalizer under `provider-translation-engines` using the CodeAI Hub contracts as reference (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/translation-text-format-normalizer.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: add translation engine contract`).
6. [TODO] Git Commit: `feat: add translation engine contract` (hash: TBD)

### Stream: Google GTX Engine

7. [TODO] `harness-ai.phase1.stream2.task1` Add the Google GTX translation engine as a separate engine implementation behind `ProviderTranslationEnginesFacade` instead of putting transport logic in the facade (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/google-gtx-translation-engine.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/translation-response-parser.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/google-gtx-translation-engine.test.mjs`; expected commit: `feat: add google gtx translation engine`).
8. [TODO] Git Commit: `feat: add google gtx translation engine` (hash: TBD)

### Stream: Provider-Owned Engine Selection

9. [TODO] `harness-ai.phase1.stream3.task1` Wire explicit engine id resolution and fail-closed unavailable-engine behavior for configured UI/reasoning translation engines (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: resolve configured translation engines`).
10. [TODO] Git Commit: `feat: resolve configured translation engines` (hash: TBD)

## Phase 2 - Localization Runtime Bundles (owner: Codex, updated: 2026-06-30)

### Stream: Runtime Contract

11. [TODO] `harness-ai.phase2.stream1.task1` Add `LocalizationRuntimeFacade` contract, category ids, runtime payload shape, and source dictionary lookup based on CodeAI Hub localization contracts (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.test.mjs`; expected commit: `feat: add localization runtime facade`).
12. [TODO] Git Commit: `feat: add localization runtime facade` (hash: TBD)

### Stream: Glossary Protection

13. [TODO] `harness-ai.phase2.stream2.task1` Port glossary preserve-term protection and user glossary loading into the `localization-runtime` module (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/user-glossary-store.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.test.mjs`; expected commit: `feat: add localization glossary protection`).
14. [TODO] Git Commit: `feat: add localization glossary protection` (hash: TBD)

### Stream: Bundle Materialization

15. [TODO] `harness-ai.phase2.stream3.task1` Implement bundle materialization and persisted bootstrap payload reuse for UI categories through `LocalizationRuntimeFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.test.mjs`; expected commit: `feat: materialize localization bundles`).
16. [TODO] Git Commit: `feat: materialize localization bundles` (hash: TBD)

### Stream: Settings Sync Boundary

17. [TODO] `harness-ai.phase2.stream4.task1` Trigger localization sync only for localization-impacting settings changes (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs`; expected commit: `feat: sync localization settings selectively`).
18. [TODO] Git Commit: `feat: sync localization settings selectively` (hash: TBD)

### Stream: Core Bridge Bootstrap Payload

19. [TODO] `harness-ai.phase2.stream5.task1` Expose the localization runtime bootstrap payload through the Core runtime API and Electron preload bridge instead of leaving UI bootstrap implicit (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat: expose localization runtime bridge`).
20. [TODO] Git Commit: `feat: expose localization runtime bridge` (hash: TBD)

## Phase 3 - UI Text Markers And Bootstrap Consumption (owner: Codex, updated: 2026-06-30)

### Stream: Browser Localization Provider

21. [TODO] `harness-ai.phase3.stream1.task1` Add a shared Application Shell browser localization provider facade and consume the bridge payload from `session-window`, so Settings, Sidebar, and Session UI use one public `t(category, messageId, fallback)` boundary instead of sibling imports; this same commit also creates/updates the new browser-localization cluster/module docs and product-tree entries (scope: `product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`; expected commit: `feat: add browser localization provider`).
22. [TODO] Git Commit: `feat: add browser localization provider` (hash: TBD)

### Stream: Source Dictionaries

23. [TODO] `harness-ai.phase3.stream2.task1` Add approved English source dictionaries as TypeScript module exports so the dictionaries are typechecked and included in `dist/runtime` and the packaged app (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.test.mjs`; expected commit: `feat: add localization source dictionaries`).
24. [TODO] Git Commit: `feat: add localization source dictionaries` (hash: TBD)

### Stream: Settings Surface Markers

25. [TODO] `harness-ai.phase3.stream3.task1` Replace hardcoded Localization and Core Controls settings copy with marked localization lookups through the shared browser localization provider facade (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize general settings copy`).
26. [TODO] Git Commit: `feat: localize general settings copy` (hash: TBD)

### Stream: Session Surface Markers

27. [TODO] `harness-ai.phase3.stream4.task1` Replace hardcoded session dialog, input, status, and empty-state copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize session surface copy`).
28. [TODO] Git Commit: `feat: localize session surface copy` (hash: TBD)

### Stream: Sidebar And Menu Markers

29. [TODO] `harness-ai.phase3.stream5.task1` Replace hardcoded sidebar, workspace menu, session menu, and Settings entry copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize sidebar and menu copy`).
30. [TODO] Git Commit: `feat: localize sidebar and menu copy` (hash: TBD)

## Phase 4 - Reasoning Translation Overlay (owner: Codex, updated: 2026-06-30)

### Stream: Overlay Contract

31. [TODO] `harness-ai.phase4.stream1.task1` Add `ReasoningTranslationOverlayFacade` with policy resolution from Settings, source hashing, pending-state decision, and translation dispatch through `ProviderTranslationEnginesFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/source-hash.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.test.mjs`; expected commit: `feat: add reasoning translation overlay facade`).
32. [TODO] Git Commit: `feat: add reasoning translation overlay facade` (hash: TBD)

### Stream: Overlay Persistence

33. [TODO] `harness-ai.phase4.stream2.task1` Persist reasoning translation overlays as sidecar records and expose a projector API that merges valid overlays by message id and source hash before live patch broadcast is added (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-projector.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.test.mjs`; expected commit: `feat: persist reasoning translation overlays`).
34. [TODO] Git Commit: `feat: persist reasoning translation overlays` (hash: TBD)

### Stream: Core Session Events

35. [TODO] `harness-ai.phase4.stream3.task1` Extend Core session message/event contracts with `translationState`, `localizedContent`, and `session:message_translation` patch events, matching the CodeAI Hub naming contract (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.test.mjs`; expected commit: `feat: carry session translation patches`).
36. [TODO] Git Commit: `feat: carry session translation patches` (hash: TBD)

### Stream: Session Request Integration

37. [TODO] `harness-ai.phase4.stream4.task1` Run reasoning translation after visible thinking messages are persisted/broadcast, while keeping source transcript truth in session history and writing overlays through the sidecar store (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`; expected commit: `feat: translate visible reasoning overlays`).
38. [TODO] Git Commit: `feat: translate visible reasoning overlays` (hash: TBD)

### Stream: Translation-First UI Reveal

39. [TODO] `harness-ai.phase4.stream5.task1` Update session UI to hide pending source reasoning, apply `session:message_translation` patches, merge thinking blocks, and reveal translated text progressively (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.ts`; expected commit: `feat: reveal translated reasoning progressively`).
40. [TODO] Git Commit: `feat: reveal translated reasoning progressively` (hash: TBD)

## Phase 5 - Provider Reasoning Block Fidelity (owner: Codex, updated: 2026-06-30)

### Stream: Codex Block Identity

41. [TODO] `harness-ai.phase5.stream1.task1` Align Codex normalized reasoning block ids and paragraph streaming with the CodeAI Hub summary-block contract so overlays attach per block without duplicates (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/module.md`; expected commit: `fix: align codex reasoning block streaming`).
42. [TODO] Git Commit: `fix: align codex reasoning block streaming` (hash: TBD)

### Stream: Claude Visible Thinking

43. [TODO] `harness-ai.phase5.stream2.task1` Confirm Claude visible thinking emits stable readable thinking segments through Core projection by reading the reference buffer and adding focused Harness-owned coverage for translation eligibility (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/module.md`; expected commit: `test: cover claude reasoning translation eligibility`).
44. [TODO] Git Commit: `test: cover claude reasoning translation eligibility` (hash: TBD)

## Phase 6 - Final Evidence And Cross-Cut Docs (owner: Codex, updated: 2026-06-30)

### Stream: Architecture Docs

45. [TODO] `harness-ai.phase6.stream1.task1` Update cross-cut architecture docs for the completed localization transfer and verify module docs were updated in their source commits, without deferring module documentation from earlier phases (scope: `docs/architecture/ProjectManagerSettingsParity.md, docs/architecture/CodeAIHubProviderRuntimeAlignment.md, product-parts/core-runtime/clusters/settings-and-localization/cluster.md`; expected commit: `docs: document localization transfer architecture`).
46. [TODO] Git Commit: `docs: document localization transfer architecture` (hash: TBD)

### Stream: Product Tree Docs

47. [TODO] `harness-ai.phase6.stream2.task1` Audit product tree source/projection and affected Product Part docs after implementation, fixing only drift that remains after source commits already updated their ownership docs (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/application-shell/product-part.md`; expected commit: `docs: update localization product tree`).
48. [TODO] Git Commit: `docs: update localization product tree` (hash: TBD)

### Stream: Verification Evidence

49. [TODO] `harness-ai.phase6.stream3.task1` Record focused evidence for localized UI bundles, glossary protection, packaged dictionary availability, and translation-first reasoning behavior (scope: `docs/evidence/localization-transfer-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization transfer evidence`).
50. [TODO] Git Commit: `docs: record localization transfer evidence` (hash: TBD)

## Phase 7 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

51. [TODO] `harness-ai.phase7.stream1.task1` Package the app for user verification after explicit user confirmation (`npm run package:mac`) and record package evidence (scope: `docs/evidence/localization-transfer-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization packaged verification`).
52. [TODO] Git Commit: `docs: record localization packaged verification` (hash: TBD)
53. [TODO] `harness-ai.phase7.stream1.task2` User retests Settings Localization, glossary protection, localized UI/help/menu copy, and live reasoning translation in the packaged app (scope: user workflow; expected commit: none).
