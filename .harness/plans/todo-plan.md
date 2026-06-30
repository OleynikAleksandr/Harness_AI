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
  "expectedCommitMessage": "feat: add provider translation engine facade",
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

## Phase 1 - Provider Translation Engines (owner: Codex, updated: 2026-06-30)

### Stream: Shared Translation Contract

3. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` Add the minimal provider-neutral translation contract, Google GTX engine, and output formatting normalizer under `provider-translation-engines` using the CodeAI Hub contracts as reference (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/translation-text-format-normalizer.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: add provider translation engine facade`).
4. [TODO] Git Commit: `feat: add provider translation engine facade` (hash: TBD)

### Stream: Provider-Owned Engine Selection

5. [TODO] `harness-ai.phase1.stream2.task1` Wire explicit engine id resolution and fail-closed unavailable-engine behavior for configured UI/reasoning translation engines (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.test.mjs`; expected commit: `feat: resolve configured translation engines`).
6. [TODO] Git Commit: `feat: resolve configured translation engines` (hash: TBD)

## Phase 2 - Localization Runtime Bundles (owner: Codex, updated: 2026-06-30)

### Stream: Runtime Contract

7. [TODO] `harness-ai.phase2.stream1.task1` Add `LocalizationRuntimeFacade` contract, category ids, runtime payload shape, and source dictionary lookup based on CodeAI Hub localization contracts (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.test.mjs`; expected commit: `feat: add localization runtime facade`).
8. [TODO] Git Commit: `feat: add localization runtime facade` (hash: TBD)

### Stream: Glossary Protection

9. [TODO] `harness-ai.phase2.stream2.task1` Port glossary preserve-term protection and user glossary loading into the `localization-runtime` module (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/user-glossary-store.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/glossary-protector.test.mjs`; expected commit: `feat: add localization glossary protection`).
10. [TODO] Git Commit: `feat: add localization glossary protection` (hash: TBD)

### Stream: Bundle Materialization

11. [TODO] `harness-ai.phase2.stream3.task1` Implement bundle materialization and persisted bootstrap payload reuse for UI categories through `LocalizationRuntimeFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-materializer.test.mjs`; expected commit: `feat: materialize localization bundles`).
12. [TODO] Git Commit: `feat: materialize localization bundles` (hash: TBD)

### Stream: Settings Sync Boundary

13. [TODO] `harness-ai.phase2.stream4.task1` Trigger localization sync only for localization-impacting settings changes and expose the runtime bootstrap payload through Core facade boundaries (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs`; expected commit: `feat: sync localization settings selectively`).
14. [TODO] Git Commit: `feat: sync localization settings selectively` (hash: TBD)

## Phase 3 - UI Text Markers And Bootstrap Consumption (owner: Codex, updated: 2026-06-30)

### Stream: Browser Localization Provider

15. [TODO] `harness-ai.phase3.stream1.task1` Add the Application Shell localization provider and bridge payload consumption so UI reads localized text through `t(category, messageId, fallback)` (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/localization-provider.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/localization-provider.test.mjs`; expected commit: `feat: add session localization provider`).
16. [TODO] Git Commit: `feat: add session localization provider` (hash: TBD)

### Stream: Source Dictionaries

17. [TODO] `harness-ai.phase3.stream2.task1` Add approved English source dictionaries for current Harness AI UI labels, helper text, and user messages (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_labels.json, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_helper_text.json, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/messages_for_the_user.json`; expected commit: `feat: add localization source dictionaries`).
18. [TODO] Git Commit: `feat: add localization source dictionaries` (hash: TBD)

### Stream: Settings Surface Markers

19. [TODO] `harness-ai.phase3.stream3.task1` Replace hardcoded Localization and Core Controls settings copy with marked localization lookups (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/settings-reference-general.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_labels.json, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_helper_text.json`; expected commit: `feat: localize general settings copy`).
20. [TODO] Git Commit: `feat: localize general settings copy` (hash: TBD)

### Stream: Session Surface Markers

21. [TODO] `harness-ai.phase3.stream4.task1` Replace hardcoded session dialog, input, status, and empty-state copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_labels.json, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/messages_for_the_user.json`; expected commit: `feat: localize session surface copy`).
22. [TODO] Git Commit: `feat: localize session surface copy` (hash: TBD)

### Stream: Sidebar And Menu Markers

23. [TODO] `harness-ai.phase3.stream5.task1` Replace hardcoded sidebar, workspace menu, session menu, and Settings entry copy with marked localization lookups (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_labels.json, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source/en/ui_helper_text.json`; expected commit: `feat: localize sidebar and menu copy`).
24. [TODO] Git Commit: `feat: localize sidebar and menu copy` (hash: TBD)

## Phase 4 - Reasoning Translation Overlay (owner: Codex, updated: 2026-06-30)

### Stream: Overlay Contract

25. [TODO] `harness-ai.phase4.stream1.task1` Add `ReasoningTranslationOverlayFacade` with policy resolution from Settings, source hashing, pending-state decision, and translation dispatch through `ProviderTranslationEnginesFacade` (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/source-hash.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.test.mjs`; expected commit: `feat: add reasoning translation overlay facade`).
26. [TODO] Git Commit: `feat: add reasoning translation overlay facade` (hash: TBD)

### Stream: Core Session Events

27. [TODO] `harness-ai.phase4.stream2.task1` Extend Core session message/event contracts with `translationState`, `localizedText`, and `session:message-translation` patch events (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.test.mjs`; expected commit: `feat: carry session translation patches`).
28. [TODO] Git Commit: `feat: carry session translation patches` (hash: TBD)

### Stream: Session Request Integration

29. [TODO] `harness-ai.phase4.stream3.task1` Run reasoning translation after visible thinking messages are persisted/broadcast, while keeping source transcript truth in session history (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`; expected commit: `feat: translate visible reasoning overlays`).
30. [TODO] Git Commit: `feat: translate visible reasoning overlays` (hash: TBD)

### Stream: Overlay Persistence

31. [TODO] `harness-ai.phase4.stream4.task1` Persist reasoning translation overlays as sidecar records and merge valid overlays into restored session history by message id and source hash (scope: `product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.test.mjs`; expected commit: `feat: persist reasoning translation overlays`).
32. [TODO] Git Commit: `feat: persist reasoning translation overlays` (hash: TBD)

### Stream: Translation-First UI Reveal

33. [TODO] `harness-ai.phase4.stream5.task1` Update session UI to hide pending source reasoning, show localized pending copy, apply translation patches, merge thinking blocks, and reveal translated text progressively (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/translated-text-reveal.test.mjs`; expected commit: `feat: reveal translated reasoning progressively`).
34. [TODO] Git Commit: `feat: reveal translated reasoning progressively` (hash: TBD)

## Phase 5 - Provider Reasoning Block Fidelity (owner: Codex, updated: 2026-06-30)

### Stream: Codex Block Identity

35. [TODO] `harness-ai.phase5.stream1.task1` Align Codex normalized reasoning block ids and paragraph streaming with the CodeAI Hub summary-block contract so overlays attach per block without duplicates (scope: `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.test.mjs, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/module.md`; expected commit: `fix: align codex reasoning block streaming`).
36. [TODO] Git Commit: `fix: align codex reasoning block streaming` (hash: TBD)

### Stream: Claude Visible Thinking

37. [TODO] `harness-ai.phase5.stream2.task1` Confirm Claude visible thinking emits stable readable thinking segments through Core projection and add focused coverage for translation eligibility (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/messaging/claude-thinking-live-buffer.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.test.mjs`; expected commit: `test: cover claude reasoning translation eligibility`).
38. [TODO] Git Commit: `test: cover claude reasoning translation eligibility` (hash: TBD)

## Phase 6 - Documentation And Evidence (owner: Codex, updated: 2026-06-30)

### Stream: Architecture Docs

39. [TODO] `harness-ai.phase6.stream1.task1` Update architecture and module docs for localization runtime, translation engines, reasoning overlays, and UI text marking boundaries (scope: `docs/architecture/ProjectManagerSettingsParity.md, docs/architecture/CodeAIHubProviderRuntimeAlignment.md, product-parts/core-runtime/clusters/settings-and-localization/cluster.md`; expected commit: `docs: document localization transfer architecture`).
40. [TODO] Git Commit: `docs: document localization transfer architecture` (hash: TBD)

### Stream: Product Tree Docs

41. [TODO] `harness-ai.phase6.stream2.task1` Update product tree source/projection and affected Product Part docs for the implemented localization and reasoning overlay modules (scope: `.harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, product-parts/provider-runtime/product-part.md`; expected commit: `docs: update localization product tree`).
42. [TODO] Git Commit: `docs: update localization product tree` (hash: TBD)

### Stream: Verification Evidence

43. [TODO] `harness-ai.phase6.stream3.task1` Record focused evidence for localized UI bundles, glossary protection, and translation-first reasoning behavior (scope: `docs/evidence/localization-transfer-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization transfer evidence`).
44. [TODO] Git Commit: `docs: record localization transfer evidence` (hash: TBD)

## Phase 7 - Package & User Acceptance (owner: Codex + User, updated: 2026-06-30)

### Stream: Package And Retest

45. [TODO] `harness-ai.phase7.stream1.task1` Package the app for user verification after explicit user confirmation (`npm run package:mac`) and record package evidence (scope: `docs/evidence/localization-transfer-packaged-app-2026-06-30.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record localization packaged verification`).
46. [TODO] Git Commit: `docs: record localization packaged verification` (hash: TBD)
47. [TODO] `harness-ai.phase7.stream1.task2` User retests Settings Localization, glossary protection, localized UI/help/menu copy, and live reasoning translation in the packaged app (scope: user workflow; expected commit: none).
