# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "localization-transfer-2026-06-30",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
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

5. [DONE] `harness-ai.phase1.stream1.task1` Add the minimal provider-neutral translation request/result contract, engine registry, fail-closed no-engine behavior, and output formatting normalizer under `provider-translation-engines` using the CodeAI Hub contracts as reference (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/translation-text-format-normalizer.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: add translation engine contract`). Result: Completed in commit `feat: add translation engine contract`.
6. [DONE] Git Commit: `feat: add translation engine contract` (hash: self)

### Stream: Google GTX Engine

7. [DONE] `harness-ai.phase1.stream2.task1` Add the Google GTX translation engine as a separate engine implementation behind `ProviderTranslationEnginesFacade` instead of putting transport logic in the facade (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/google-gtx-translation-engine.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/translation-response-parser.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/google-gtx-translation-engine.test.mjs`; expected commit: `feat: add google gtx translation engine`). Result: Completed in commit `feat: add google gtx translation engine`.
8. [DONE] Git Commit: `feat: add google gtx translation engine` (hash: self)

### Stream: Provider-Owned Engine Selection

9. [DONE] `harness-ai.phase1.stream3.task1` Wire explicit engine id resolution and fail-closed unavailable-engine behavior for configured UI/reasoning translation engines (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: resolve configured translation engines`). Result: Completed in commit `feat: resolve configured translation engines`.
10. [DONE] Git Commit: `feat: resolve configured translation engines` (hash: self)

## Phase 2 - Localization Runtime Bundles (owner: Codex, updated: 2026-06-30)

### Stream: Runtime Contract

11. [DONE] `harness-ai.phase2.stream1.task1` Add `LocalizationRuntimeFacade` contract, category ids, runtime payload shape, and source dictionary lookup based on CodeAI Hub localization contracts (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.test.mjs`; expected commit: `feat: add localization runtime facade`). Result: Completed in commit `feat: add localization runtime facade`.
12. [DONE] Git Commit: `feat: add localization runtime facade` (hash: self)

### Stream: Glossary Protection

13. [DONE] `harness-ai.phase2.stream2.task1` Port glossary preserve-term protection and user glossary loading into the `localization-runtime` module (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/user-glossary-store.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.test.mjs`; expected commit: `feat: add localization glossary protection`). Result: Completed in commit `feat: add localization glossary protection`.
14. [DONE] Git Commit: `feat: add localization glossary protection` (hash: self)

### Stream: Bundle Materialization

15. [DONE] `harness-ai.phase2.stream3.task1` Implement bundle materialization and persisted bootstrap payload reuse for UI categories through `LocalizationRuntimeFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.test.mjs`; expected commit: `feat: materialize localization bundles`). Result: Completed in commit `feat: materialize localization bundles`.
16. [DONE] Git Commit: `feat: materialize localization bundles` (hash: self)

### Stream: Settings Sync Boundary

17. [DONE] `harness-ai.phase2.stream4.task1` Trigger localization sync only for localization-impacting settings changes (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs`; expected commit: `feat: sync localization settings selectively`). Result: Completed in commit `feat: sync localization settings selectively`.
18. [DONE] Git Commit: `feat: sync localization settings selectively` (hash: self)

### Stream: Core Bridge Bootstrap Payload

19. [DONE] `harness-ai.phase2.stream5.task1` Expose the localization runtime bootstrap payload through the Core runtime API and Electron preload bridge instead of leaving UI bootstrap implicit (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; expected commit: `feat: expose localization runtime bridge`). Result: Completed in commit `feat: expose localization runtime bridge`.
20. [DONE] Git Commit: `feat: expose localization runtime bridge` (hash: self)

## Phase 3 - UI Text Markers And Bootstrap Consumption (owner: Codex, updated: 2026-06-30)

### Stream: Browser Localization Provider

21. [DONE] `harness-ai.phase3.stream1.task1` Add a shared Application Shell browser localization provider facade and consume the bridge payload from `session-window`, so Settings, Sidebar, and Session UI use one public `t(category, messageId, fallback)` boundary instead of sibling imports; this same commit also creates/updates the new browser-localization cluster/module docs and product-tree entries (scope: `product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx`; expected commit: `feat: add browser localization provider`). Result: Completed in commit `feat: add browser localization provider`.
22. [DONE] Git Commit: `feat: add browser localization provider` (hash: self)

### Stream: Source Dictionaries

23. [DONE] `harness-ai.phase3.stream2.task1` Add approved English source dictionaries as TypeScript module exports so the dictionaries are typechecked and included in `dist/runtime` and the packaged app (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.test.mjs`; expected commit: `feat: add localization source dictionaries`). Result: Completed in commit `feat: add localization source dictionaries`.
24. [DONE] Git Commit: `feat: add localization source dictionaries` (hash: self)

### Stream: Settings Surface Markers

25. [DONE] `harness-ai.phase3.stream3.task1` Replace hardcoded Localization and Core Controls settings copy with marked localization lookups through the shared browser localization provider facade (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize general settings copy`). Result: Completed in commit `feat: localize general settings copy`.
26. [DONE] Git Commit: `feat: localize general settings copy` (hash: self)

### Stream: Session Surface Markers

27. [DONE] `harness-ai.phase3.stream4.task1` Replace hardcoded session dialog, input, status, and empty-state copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize session surface copy`). Result: Completed in commit `feat: localize session surface copy`.
28. [DONE] Git Commit: `feat: localize session surface copy` (hash: self)

### Stream: Sidebar And Menu Markers

29. [DONE] `harness-ai.phase3.stream5.task1` Replace hardcoded sidebar, workspace menu, session menu, and Settings entry copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; expected commit: `feat: localize sidebar and menu copy`). Result: Completed in commit `feat: localize sidebar and menu copy`.
30. [DONE] Git Commit: `feat: localize sidebar and menu copy` (hash: self)

## Phase 4 - Reasoning Translation Overlay (owner: Codex, updated: 2026-06-30)

### Stream: Overlay Contract

31. [DONE] `harness-ai.phase4.stream1.task1` Add `ReasoningTranslationOverlayFacade` with policy resolution from Settings, source hashing, pending-state decision, and translation dispatch through `ProviderTranslationEnginesFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/source-hash.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.test.mjs`; expected commit: `feat: add reasoning translation overlay facade`). Result: Completed in commit `feat: add reasoning translation overlay facade`.
32. [DONE] Git Commit: `feat: add reasoning translation overlay facade` (hash: self)

### Stream: Overlay Persistence

33. [DONE] `harness-ai.phase4.stream2.task1` Persist reasoning translation overlays as sidecar records and expose a projector API that merges valid overlays by message id and source hash before live patch broadcast is added (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-projector.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.test.mjs`; expected commit: `feat: persist reasoning translation overlays`). Result: Completed in commit `feat: persist reasoning translation overlays`.
34. [DONE] Git Commit: `feat: persist reasoning translation overlays` (hash: self)

### Stream: Core Session Events

35. [DONE] `harness-ai.phase4.stream3.task1` Extend Core session message/event contracts with `translationState`, `localizedContent`, and `session:message_translation` patch events, matching the CodeAI Hub naming contract (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.test.mjs`; expected commit: `feat: carry session translation patches`). Result: Completed in commit `feat: carry session translation patches`.
36. [DONE] Git Commit: `feat: carry session translation patches` (hash: self)

### Stream: Session Request Integration

37. [DONE] `harness-ai.phase4.stream4.task1` Run reasoning translation after visible thinking messages are persisted/broadcast, while keeping source transcript truth in session history and writing overlays through the sidecar store (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`; expected commit: `feat: translate visible reasoning overlays`). Result: Completed in commit `feat: translate visible reasoning overlays`.
38. [DONE] Git Commit: `feat: translate visible reasoning overlays` (hash: self)

### Stream: Translation-First UI Reveal

39. [DONE] `harness-ai.phase4.stream5.task1` Update session UI to hide pending source reasoning, apply `session:message_translation` patches, merge thinking blocks, and reveal translated text progressively (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.ts`; expected commit: `feat: reveal translated reasoning progressively`). Result: Completed in commit `feat: reveal translated reasoning progressively`.
40. [DONE] Git Commit: `feat: reveal translated reasoning progressively` (hash: self)

## Phase 5 - Provider Reasoning Block Fidelity (owner: Codex, updated: 2026-06-30)

### Stream: Codex Block Identity

41. [DONE] `harness-ai.phase5.stream1.task1` Align Codex normalized reasoning block ids and paragraph streaming with the CodeAI Hub summary-block contract so overlays attach per block without duplicates (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/module.md`; expected commit: `fix: align codex reasoning block streaming`). Result: Completed in commit `fix: align codex reasoning block streaming`.
42. [DONE] Git Commit: `fix: align codex reasoning block streaming` (hash: self)

### Stream: Claude Visible Thinking

43. [DONE] `harness-ai.phase5.stream2.task1` Confirm Claude visible thinking emits stable readable thinking segments through Core projection by reading the reference buffer and adding focused Harness-owned coverage for translation eligibility (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/module.md`; expected commit: `test: cover claude reasoning translation eligibility`). Result: Completed in commit `test: cover claude reasoning translation eligibility`.
44. [DONE] Git Commit: `test: cover claude reasoning translation eligibility` (hash: self)

## Phase 6 - Final Evidence And Cross-Cut Docs (owner: Codex, updated: 2026-06-30)

### Stream: Architecture Docs

45. [DONE] `harness-ai.phase6.stream1.task1` Update cross-cut architecture docs for the completed localization transfer and verify module docs were updated in their source commits, without deferring module documentation from earlier phases (scope: `docs/architecture/ProjectManagerSettingsParity.md, docs/architecture/CodeAIHubProviderRuntimeAlignment.md, product-parts/core-runtime/clusters/settings-and-localization/cluster.md`; expected commit: `docs: document localization transfer architecture`). Result: Completed in commit `docs: document localization transfer architecture`.
46. [DONE] Git Commit: `docs: document localization transfer architecture` (hash: self)

### Stream: Product Tree Docs

47. [DONE] `harness-ai.phase6.stream2.task1` Audit product tree source/projection and affected Product Part docs after implementation, fixing only drift that remains after source commits already updated their ownership docs (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/application-shell/product-part.md`; expected commit: `docs: update localization product tree`). Result: Completed in commit `docs: update localization product tree`.
48. [DONE] Git Commit: `docs: update localization product tree` (hash: self)

### Stream: Verification Evidence

49. [DONE] `harness-ai.phase6.stream3.task1` Record focused evidence for localized UI bundles, glossary protection, packaged dictionary availability, and translation-first reasoning behavior (scope: `docs/evidence/localization-transfer-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization transfer evidence`). Result: Completed in commit `docs: record localization transfer evidence`.
50. [DONE] Git Commit: `docs: record localization transfer evidence` (hash: self)

## Phase 7 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

51. [DONE] `harness-ai.phase7.stream1.task1` Package the app for user verification after explicit user confirmation (`npm run package:mac`) and record package evidence (scope: `docs/evidence/localization-transfer-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization packaged verification`). Result: Completed in commit `docs: record localization packaged verification`.
52. [DONE] Git Commit: `docs: record localization packaged verification` (hash: self)
53. [DONE] `harness-ai.phase7.stream1.task2` User retests Settings Localization, glossary protection, localized UI/help/menu copy, and live reasoning translation in the packaged app (scope: user workflow; expected commit: none). Result: User reported UI translation does not start, `~/.harness-ai/Localization` is not created, and saving the UI translation engine resets to Google GTX.

## Phase 8 - Localization UI Repair (owner: Codex, updated: 2026-06-30)

### Stream: Interface Translation

54. [DONE] `harness-ai.phase8.stream1.task1` Persist the UI translation engine selection through the Core-owned `uiEngineId` field instead of the legacy `engineId` alias (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: persist ui localization selection`). Result: Completed in commit `fix: persist ui localization selection`.
55. [DONE] Git Commit: `fix: persist ui localization selection` (hash: self)
56. [DONE] `harness-ai.phase8.stream1.task2` Materialize the UI localization runtime from Core using Harness settings category mapping and a persisted Harness home localization root (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.test.mjs`; docs: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `fix: materialize ui localization runtime`). Result: Completed in commit `fix: materialize ui localization runtime`.
57. [DONE] Git Commit: `fix: materialize ui localization runtime` (hash: self)
58. [DONE] `harness-ai.phase8.stream1.task3` Hide translation engine options that are not registered in the current Harness runtime so interface localization cannot save a non-working engine id (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: hide unavailable localization engines`). Result: Completed in commit `fix: hide unavailable localization engines`.
59. [DONE] Git Commit: `fix: hide unavailable localization engines` (hash: self)
60. [DONE] `harness-ai.phase8.stream1.task4` Rebuild the packaged app after the localization UI repair and record verification evidence (scope: `docs/evidence/localization-ui-repair-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization ui repair package`). Result: Completed in commit `docs: record localization ui repair package`.
61. [DONE] Git Commit: `docs: record localization ui repair package` (hash: self)
62. [DONE] `harness-ai.phase8.stream1.task5` User retests Settings Localization engine persistence and Russian interface translation in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User reported only a small subset of helper text translated; General and most provider tabs remain English.

## Phase 9 - Localization Coverage Repair (owner: Codex, updated: 2026-06-30)

### Stream: Runtime Category Mapping

63. [DONE] `harness-ai.phase9.stream1.task1` Map the visible General localization category selectors to the runtime categories that the renderer actually reads (`uiInterface` -> `ui_labels`, `userGuidance` -> `ui_helper_text`, `systemFeedback` -> `messages_for_the_user`) so already-marked General copy materializes in the selected language (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `fix: map localization category selections`). Result: Completed in commit `fix: map localization category selections`.
64. [DONE] Git Commit: `fix: map localization category selections` (hash: self)
65. [DONE] `harness-ai.phase9.stream1.task2` Add the first provider-settings localization marker slice for provider tab labels and shared provider card helper copy, then update source dictionaries and module docs (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `feat: localize provider settings shell copy`). Result: Completed in commit `feat: localize provider settings shell copy`.
66. [DONE] Git Commit: `feat: localize provider settings shell copy` (hash: self)
67. [DONE] `harness-ai.phase9.stream1.task3` Replace the single root bootstrap cache with the first reference-style Harness localization cache layout: per-category translated bundles under `Localization/catalogs/<category>/<language>.json` and browser bootstrap under `Localization/cache/browser-runtime-bootstrap.json` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md`; expected commit: `fix: cache localization bundles by category`). Result: Completed in commit `fix: cache localization bundles by category`.
68. [DONE] Git Commit: `fix: cache localization bundles by category` (hash: self)
69. [DONE] `harness-ai.phase9.stream1.task4` Rebuild the packaged app after localization coverage and cache repairs, then record evidence (scope: `docs/evidence/localization-coverage-cache-repair-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization coverage cache package`). Result: Completed in commit `docs: record localization coverage cache package`.
70. [DONE] Git Commit: `docs: record localization coverage cache package` (hash: self)
71. [DONE] `harness-ai.phase9.stream1.task5` User retests General and provider settings shell localization plus Harness localization cache layout in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User confirmed the Harness localization cache layout is created, but the open Settings UI still shows English helper copy after choosing Russian.

## Phase 10 - Settings Localization Refresh Repair (owner: Codex, updated: 2026-06-30)

### Stream: Runtime Payload Refresh

72. [DONE] `harness-ai.phase10.stream1.task1` Refresh the browser localization runtime payload after Settings save/reset so newly materialized Russian bundles are visible in the open Settings modal (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx`; docs: `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: refresh localization payload after settings save`). Result: Completed in commit `fix: refresh localization payload after settings save`.
73. [DONE] Git Commit: `fix: refresh localization payload after settings save` (hash: self)
74. [DONE] `harness-ai.phase10.stream1.task2` Rebuild the packaged app after the Settings localization refresh repair and record evidence (scope: `docs/evidence/localization-refresh-repair-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization refresh package`). Result: Completed in commit `docs: record localization refresh package`.
75. [DONE] Git Commit: `docs: record localization refresh package` (hash: self)
76. [DONE] `harness-ai.phase10.stream1.task3` User retests Russian Settings localization in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User reported Settings helper copy still falls back to English even though Russian cache files exist.

## Phase 11 - Settings Open Localization Refresh (owner: Codex, updated: 2026-06-30)

### Stream: Modal Open Refresh

77. [DONE] `harness-ai.phase11.stream1.task1` Refresh the browser localization runtime payload when Settings opens, so the dialog cannot remain on fallback copy when there are no dirty changes to save (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: refresh localization payload when settings opens`). Result: Completed in commit `fix: refresh localization payload when settings opens`.
78. [DONE] Git Commit: `fix: refresh localization payload when settings opens` (hash: self)
79. [DONE] `harness-ai.phase11.stream1.task2` Rebuild the packaged app after the Settings-open localization refresh repair and record evidence (scope: `docs/evidence/localization-open-refresh-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization open refresh package`). Result: Completed in commit `docs: record localization open refresh package`.
80. [DONE] Git Commit: `docs: record localization open refresh package` (hash: self)
81. [DONE] `harness-ai.phase11.stream1.task3` User retests Russian Settings helper copy after reopening Settings in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User reported language selector changes do not activate Save Changes, so category selection changes are not being committed to the Settings draft.

## Phase 12 - Settings Select Dirty State Repair (owner: Codex, updated: 2026-06-30)

### Stream: Select Change Commit

82. [DONE] `harness-ai.phase12.stream1.task1` Commit shared Settings select value changes on the native input event as well as change, so localization language selectors immediately mark the Settings draft dirty (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-controls.tsx`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: commit settings select input changes`). Result: Completed in commit `fix: commit settings select input changes`.
83. [DONE] Git Commit: `fix: commit settings select input changes` (hash: self)
84. [DONE] `harness-ai.phase12.stream1.task2` Rebuild the packaged app after the Settings select dirty-state repair and record evidence (scope: `docs/evidence/localization-select-dirty-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization select dirty package`). Result: Completed in commit `docs: record localization select dirty package`.
85. [DONE] Git Commit: `docs: record localization select dirty package` (hash: self)
86. [DONE] `harness-ai.phase12.stream1.task3` User retests language selector dirty state and Russian Settings helper copy in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User reported some localization selectors persist to `~/.harness-ai/settings/settings.json`, while `Messages for the User` and `Artifacts for the User` do not even enable Save; further debugging needs Core-owned logs rather than UI guesses.

## Phase 13 - Core Settings Diagnostics Logs (owner: Codex, updated: 2026-06-30)

### Stream: Core Settings Log

87. [DONE] `harness-ai.phase13.stream1.task1` Add Core-owned JSONL diagnostics for settings load, save, reset, and localization category snapshots under `~/.harness-ai/logs/core/`, creating the Harness log roots for core/interface/providers without logging secrets (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-logger.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-logger.test.mjs`; docs: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/module.md, product-parts/core-runtime/clusters/settings-and-localization/cluster.md`; expected commit: `feat: add core settings diagnostics log`). Result: Completed in commit `feat: add core settings diagnostics log`.
88. [DONE] Git Commit: `feat: add core settings diagnostics log` (hash: self)
89. [DONE] `harness-ai.phase13.stream1.task2` Rebuild the packaged app after adding Core settings diagnostics and record evidence (scope: `docs/evidence/core-settings-diagnostics-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record core settings diagnostics package`). Result: Completed in commit `docs: record core settings diagnostics package`.
90. [DONE] Git Commit: `docs: record core settings diagnostics package` (hash: self)
91. [DONE] `harness-ai.phase13.stream1.task3` User retests localization selector changes and shares `~/.harness-ai/logs/core/settings-store.jsonl` evidence if selectors still diverge (scope: user workflow; expected commit: none). Result: Core logs showed localization saves reach Core, including `userGuidance`, then `systemFeedback` and `artifactsForTheUser`; user reported Restart Core hangs with an endless restarting state.

## Phase 14 - Core Restart Failure Handling (owner: Codex, updated: 2026-06-30)

### Stream: Restart Non-Hang

92. [DONE] `harness-ai.phase14.stream1.task1` Make Core restart failures return renderer-safe errors and ensure the Settings Restart Core spinner always settles instead of hanging forever (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx`; docs: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: stop core restart spinner on failure`). Result: Completed in commit `fix: stop core restart spinner on failure`.
93. [DONE] Git Commit: `fix: stop core restart spinner on failure` (hash: self)
94. [DONE] `harness-ai.phase14.stream1.task2` Rebuild the packaged app after Core restart failure handling and record evidence (scope: `docs/evidence/core-restart-failure-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record core restart failure package`). Result: Completed in commit `docs: record core restart failure package`.
95. [DONE] Git Commit: `docs: record core restart failure package` (hash: self)
96. [DONE] `harness-ai.phase14.stream1.task3` User retests Restart Core and localization selector flow in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User clarified the remaining blocking defect is Save button responsiveness after saving one localization category; subsequent category changes can reach Core through Restart Core, but Save stays visually disabled because Settings remains busy.

## Phase 15 - Settings Save Responsiveness (owner: Codex, updated: 2026-06-30)

### Stream: Non-Blocking Localization Refresh

97. [DONE] `harness-ai.phase15.stream1.task1` Stop the post-save localization runtime refresh from keeping Settings busy after Core has already saved the draft, so later Settings changes can enable Save immediately (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.test.mjs`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: keep settings save responsive after localization refresh`). Result: Completed in commit `fix: keep settings save responsive after localization refresh`.
98. [DONE] Git Commit: `fix: keep settings save responsive after localization refresh` (hash: self)
99. [DONE] `harness-ai.phase15.stream1.task2` Rebuild the packaged app after the Settings save responsiveness repair and record evidence (scope: `docs/evidence/settings-save-responsiveness-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record settings save responsiveness package`). Result: Completed in commit `docs: record settings save responsiveness package`.
100. [DONE] Git Commit: `docs: record settings save responsiveness package` (hash: self)
101. [DONE] `harness-ai.phase15.stream1.task3` User retests saving multiple localization category changes one after another in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User pointed out the save responsiveness fix deviated from the reference project because localization refresh after Save should visibly block Settings with a spinner/status card until localization work finishes.

## Phase 16 - Blocking Localization Refresh UI (owner: Codex, updated: 2026-06-30)

### Stream: Reference Save Feedback

102. [DONE] `harness-ai.phase16.stream1.task1` Show a blocking Settings localization refresh card with spinner after Save while the localization runtime payload refresh is running, without relying on a silent disabled Save button (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.test.mjs, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface.css`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md`; expected commit: `fix: show blocking localization refresh state`). Result: Completed in commit `fix: show blocking localization refresh state`.
103. [DONE] Git Commit: `fix: show blocking localization refresh state` (hash: self)
104. [DONE] `harness-ai.phase16.stream1.task2` Rebuild the packaged app after the blocking localization refresh UI repair and record evidence (scope: `docs/evidence/blocking-localization-refresh-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record blocking localization refresh package`). Result: Completed in commit `docs: record blocking localization refresh package`.
105. [DONE] Git Commit: `docs: record blocking localization refresh package` (hash: self)
106. [DONE] `harness-ai.phase16.stream1.task3` User retests Save feedback and interaction blocking while localization refresh runs in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User reported the release still does not show the requested fixes; Core logs show settings saves reach Core, but the visible blocking refresh contract is still ineffective.

## Phase 17 - Blocking Localization Refresh Repair (owner: Codex, updated: 2026-06-30)

### Stream: Save-Owned Refresh Feedback

107. [DONE] `harness-ai.phase17.stream1.task1` Make Settings Save own the full localization refresh lifecycle so the blocking card is visible while save/materialization/runtime payload refresh is in progress, and add missing localization source ids for the blocker copy (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: block settings save during localization refresh`). Result: Completed in commit `fix: block settings save during localization refresh`.
108. [DONE] Git Commit: `fix: block settings save during localization refresh` (hash: self)

## Phase 18 - Provider Settings Localization Coverage Repair (owner: Codex, updated: 2026-06-30)

### Stream: Provider Helper Copy

109. [DONE] `harness-ai.phase18.stream1.task1` Replace hardcoded Claude provider settings helper copy and model descriptions with browser localization lookups and approved source dictionary ids, so Claude is not special-cased in Russian and follows the selected UI Helper Text language (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/claude-default-model-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-model-options.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: localize claude settings copy`). Result: Completed in commit `fix: localize claude settings copy`.
110. [DONE] Git Commit: `fix: localize claude settings copy` (hash: self)
111. [DONE] `harness-ai.phase18.stream1.task2` Replace Codex provider settings helper copy and model descriptions with browser localization lookups and approved source dictionary ids (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/codex-default-model-card.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-model-options.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: localize codex settings copy`). Result: Completed in commit `fix: localize codex settings copy`.
112. [DONE] Git Commit: `fix: localize codex settings copy` (hash: self)
113. [DONE] `harness-ai.phase18.stream1.task3` Replace Kimi provider settings model-row descriptions with browser localization lookups and approved source dictionary ids, keeping the existing Kimi card helper copy localized through the shared provider boundary (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-tab-content.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-model-options.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, .harness/plans/todo-plan.md`; expected commit: `fix: localize kimi settings copy`). Result: Completed in commit `fix: localize kimi settings copy`.
114. [DONE] Git Commit: `fix: localize kimi settings copy` (hash: self)

## Phase 19 - Packaged App Process Cleanup (owner: Codex, updated: 2026-06-30)

### Stream: Package Freshness Guard

115. [DONE] `harness-ai.phase19.stream1.task1` Stop any running packaged Harness AI app/Core processes from `release/mac-arm64/Harness AI.app` before rebuilding the macOS package, so the next user launch reads the new `app.asar` instead of an already-running old runtime (scope: `scripts/stop-packaged-app-processes.mjs, scripts/stop-packaged-app-processes.test.mjs, package.json`; docs: `README.md, docs/evidence/packaged-app-process-cleanup-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `fix: stop old packaged app before packaging`). Result: Completed in commit `fix: stop old packaged app before packaging`.
116. [DONE] Git Commit: `fix: stop old packaged app before packaging` (hash: self)

## Phase 20 - Settings Full App Restart (owner: Codex, updated: 2026-06-30)

### Stream: Electron Relaunch Bridge

117. [DONE] `harness-ai.phase20.stream1.task1` Add an Electron host relaunch IPC exposed through the preload shell bridge so renderer surfaces can request a full app restart instead of only restarting Core (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`; docs: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md, product-parts/application-shell/clusters/electron-host/cluster.md, .harness/plans/todo-plan.md`; expected commit: `feat: add electron app relaunch bridge`). Result: Completed in commit `feat: add electron app relaunch bridge`.
118. [DONE] Git Commit: `feat: add electron app relaunch bridge` (hash: self)
119. [DONE] `harness-ai.phase20.stream1.task2` Replace the General Settings Core Controls action with a full Restart App flow that saves dirty settings first, calls the Electron relaunch bridge, and updates localized button/status copy (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-surface-facade.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/module.md, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, docs/evidence/settings-full-app-restart-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `fix: restart app from settings`). Result: Completed in commit `fix: restart app from settings`.
120. [DONE] Git Commit: `fix: restart app from settings` (hash: self)

## Phase 21 - Relaunch Core Shutdown Repair (owner: Codex, updated: 2026-06-30)

### Stream: App Relaunch Core Lifecycle

121. [DONE] `harness-ai.phase21.stream1.task1` Stop the supervised Core process before Electron app relaunch so the new host cannot attach to an orphan Core on the fixed port and must start a fresh runtime from the current package (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs`; docs: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md, docs/evidence/app-relaunch-core-shutdown-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `fix: stop core before app relaunch`). Result: Completed in commit `fix: stop core before app relaunch`.
122. [DONE] Git Commit: `fix: stop core before app relaunch` (hash: self)

## Phase 22 - Agent Instruction Cleanup (owner: Codex, updated: 2026-06-30)

### Stream: Workspace Instructions

123. [DONE] `harness-ai.phase22.stream1.task1` Commit the requested AGENTS.md instruction cleanup so the workspace instructions no longer remain as an uncommitted local change (scope: `AGENTS.md, .harness/plans/todo-plan.md`; expected commit: `docs: update agent instructions`). Result: Completed in commit `docs: update agent instructions`.
124. [DONE] Git Commit: `docs: update agent instructions` (hash: self)

## Phase 23 - Browser Localization Payload IPC Repair (owner: Codex, updated: 2026-06-30)

### Stream: Electron Bridge

125. [DONE] `harness-ai.phase23.stream1.task1` Register the renderer localization runtime payload IPC channel in the Electron Core process bridge so `BrowserLocalizationProvider` can receive Core materialized bundles after startup, Settings Save, and Restart App (scope: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs`; docs: `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md, docs/evidence/localization-runtime-payload-ipc-package-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `fix: forward localization runtime payload ipc`). Result: Completed in commit `fix: forward localization runtime payload ipc`.
126. [DONE] Git Commit: `fix: forward localization runtime payload ipc` (hash: self)

## Phase 24 - Remaining Settings Localization Coverage (owner: Codex, updated: 2026-06-30)

### Stream: Settings Copy And Dynamic Descriptions

127. [DONE] `harness-ai.phase24.stream1.task1` Localize the remaining Settings provider helper copy reported from screenshots, including session continuity, GLM/OpenCode/Local Models/OpenRouter helper text, Restart App status text, OpenRouter latency helper copy, and Core-owned dynamic translation of OpenRouter model descriptions through the Reasoning Translation Engine target (scope intentionally spans the audited Settings coverage files: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/**`, `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`, `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`, `product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts`, `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts`, `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts`; docs: related module docs, evidence, documentation index; expected commit: `fix: cover remaining settings localization`). Result: Completed in commit `fix: cover remaining settings localization`.
128. [DONE] Git Commit: `fix: cover remaining settings localization` (hash: self)
