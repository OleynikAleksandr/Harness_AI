# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "profile-studio-mvp-2026-07-20",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase21.stream5.task2",
  "expectedCommitMessage": "feat: auto-update claude sdk and model labels",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `docs/evidence/ProfileStudioMvpImplementation.md`.
- **Continuation planning source:**
  `docs/evidence/ProfileStudioCreatorAgentBootstrap.md`.
- **Accepted UI baseline:** `docs/proposals/ProfileStudio.md` and ignored
  `.harness/runtime/prototypes/profile-studio-ui/`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/evidence/ProfileStudioMvpImplementation.md`
  - `docs/evidence/ProfileStudioCreatorAgentBootstrap.md`
  - `docs/architecture/SessionProfiles.md`
  - `docs/proposals/ProfileStudio.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- A task row is a logical row and may wrap onto indented continuation lines.
- Each microtask touches no more than 3 functional files; related module,
  cluster, product-part, architecture, Product Tree and catalog documentation
  updates accompany the same behavior change and do not justify widening the
  functional source scope.
- Product Part / Cluster / Module filesystem ownership is primary. Profile
  Studio uses separate Core Runtime and Application Shell clusters, each with
  facade-only external access.
- Application Shell renders Core read models and forwards raw intents; it does
  not own profile lifecycle, compatibility, authoring, capture parsing or
  approval truth.
- The central Studio session reuses the production Session Surface; prototype
  HTML/CSS is not copied into product code.
- Existing v1 profiles remain readable and are never destructively migrated.
- No visible control is a placeholder: missing behavior is hidden or rendered
  as an honest Core-backed read-only/blocked state.
- The user explicitly authorized `npm run package:mac` after implementation
  and build verification in this scope.
- Quality gates run automatically on every commit. The plan contains no
  separate gate-run phase.
- Commit with `npm run plan:commit -- "<expected commit message>"`.
- Scope archival remains user-directed and is not part of this plan.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-07-20)

### Stream: Recovery Owner

1. [DONE] `harness-ai.phase0.stream1.task1` Create the implementation scope from the user-accepted Profile Studio MVP planning document, including architecture promotion, both new clusters, provider/model lifecycle, fixed Claude creator agent, reusable session surface, package build and final user acceptance (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: create profile studio mvp scope`). Result: Completed in commit `plan: create profile studio mvp scope`.
2. [DONE] Git Commit: `plan: create profile studio mvp scope` (hash: self)

## Phase 1 - Architecture Promotion (owner: Codex, updated: 2026-07-20)

### Stream: Accepted Contract

3. [DONE] `harness-ai.phase1.stream1.task1` Promote the accepted MVP contract into current architecture: add Profile Studio architecture, reconcile Session Profiles v2/legacy boundaries, mark the proposal as promoted for this implementation slice and register the architecture document (scope: `docs/architecture/ProfileStudio.md, docs/architecture/SessionProfiles.md, docs/proposals/ProfileStudio.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: promote profile studio mvp architecture`). Result: Completed in commit `docs: promote profile studio mvp architecture`.
4. [DONE] Git Commit: `docs: promote profile studio mvp architecture` (hash: self)

## Phase 2 - Studio V2 Profile Documents (owner: Codex, updated: 2026-07-20)

### Stream: Session Profiles Compatibility

5. [DONE] `harness-ai.phase2.stream1.task1` Extend `profile-store` with Studio v2 passport/model/lifecycle metadata and Draft-tolerant two-part documents while preserving v1 parsing unchanged (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-document-parser.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs` plus related docs; expected commit: `feat: add studio v2 profile storage`). Result: Completed in commit `feat: add studio v2 profile storage`.
6. [DONE] Git Commit: `feat: add studio v2 profile storage` (hash: self)

7. [DONE] `harness-ai.phase2.stream1.task2` Add atomic Studio draft creation/update operations to `profile-authoring`, using `system-prompt.md`, `custom-instructions.md` and optional `tools.json` without external-editor ownership, and persist the agent-authored purpose in the Studio passport (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-authoring/src/profile-authoring-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-authoring/src/profile-authoring.test.mjs, product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-document-parser.ts` plus related docs; expected commit: `feat: add studio profile authoring operations`). Result: Completed in commit `feat: add studio profile authoring operations`.
8. [DONE] Git Commit: `feat: add studio profile authoring operations` (hash: self)

9. [DONE] `harness-ai.phase2.stream1.task3` Add exact provider+model Studio catalog filtering, keep raw Native/legacy profiles out of Studio listings and keep legacy provider-only session behavior unchanged (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog.test.mjs` plus related docs; expected commit: `feat: add studio provider model catalog`). Result: Completed in commit `feat: add studio provider model catalog`.
10. [DONE] Git Commit: `feat: add studio provider model catalog` (hash: self)

11. [DONE] `harness-ai.phase2.stream1.task4` Materialize Studio v2 prompt from its two source documents with deterministic content hash and no workspace AGENTS/Skills/generic wrapper, while preserving v1 materialization (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-materializer/src/profile-materializer-facade.ts, product-parts/core-runtime/clusters/session-profiles/modules/profile-materializer/src/profile-materializer.test.mjs` plus related docs; expected commit: `feat: materialize studio profile prompts`). Result: Completed in commit `feat: materialize studio profile prompts`.
12. [DONE] Git Commit: `feat: materialize studio profile prompts` (hash: self)

## Phase 3 - Core Profile Studio Cluster (owner: Codex, updated: 2026-07-20)

### Stream: Lifecycle And Agent Authoring

13. [DONE] `harness-ai.phase3.stream1.task1` Create the Core Runtime `profile-studio` cluster and `profile-studio-lifecycle` module/class facade with immutable Draft identity, exact content-hash approval, edit-to-Draft transition and profile↔creator-session binding; add the narrow session-profile facade command that persists Core-approved `Valid` without exposing approval to the agent (scope: lifecycle facade/test and `profile-authoring-facade.ts` plus new cluster/module docs, Core product-part doc and Product Tree; expected commit: `feat: add profile studio lifecycle facade`). Result: Completed in commit `feat: add profile studio lifecycle facade`.
14. [DONE] Git Commit: `feat: add profile studio lifecycle facade` (hash: self)

15. [DONE] `harness-ai.phase3.stream1.task2` Add the `profile-studio-authoring` module/class facade that validates and atomically applies complete agent-produced snapshots through session-profile facades, including donor-path containment and honest provider tool modes (scope: authoring facade/test only plus cluster/module docs and Product Tree; expected commit: `feat: add profile studio authoring facade`). Result: Completed in commit `feat: add profile studio authoring facade`.
16. [DONE] Git Commit: `feat: add profile studio authoring facade` (hash: self)

17. [DONE] `harness-ai.phase3.stream1.task3` Add the `profile-studio-agent` module/class facade with fixed Claude/Opus/high identity, isolated inline instructions, JSON Schema full-snapshot output contract and no ambient settings/filesystem tools (scope: agent facade/test only plus cluster/module docs and Product Tree; expected commit: `feat: add profile studio agent facade`). Result: Completed in commit `feat: add profile studio agent facade`.
18. [DONE] Git Commit: `feat: add profile studio agent facade` (hash: self)

19. [DONE] `harness-ai.phase3.stream1.task4` Add the `profile-studio-read-model` module/class facade for target catalogs, compatible creator sessions and Overview/Prompt/Tools snapshots with Claude subset, Codex fixed and Kimi Draft-only capability truth (scope: read-model facade/test only plus cluster/module docs and Product Tree; expected commit: `feat: add profile studio read model facade`). Result: Completed in commit `feat: add profile studio read model facade`.
20. [DONE] Git Commit: `feat: add profile studio read model facade` (hash: self)

## Phase 4 - Creator Session Runtime (owner: Codex, updated: 2026-07-20)

### Stream: Persistent Standard Session

21. [DONE] `harness-ai.phase4.stream1.task1` Persist optional `profile-creator` session purpose and profile id without overloading primary/subagent session kind, including restore compatibility (scope: `session-request-handler-types.ts, session-history-store.ts, session-history-store.test.mjs` plus related docs; expected commit: `feat: persist profile creator session purpose`). Result: Completed in commit `feat: persist profile creator session purpose`.
22. [DONE] Git Commit: `feat: persist profile creator session purpose` (hash: self)

23. [DONE] `harness-ai.phase4.stream1.task2` Allow Core to create fixed managed Claude creator sessions in the dedicated HARNESS_AI_HOME-aware Studio workspace and supply the Studio output schema on every creator turn/resume (scope: up to 3 session-runtime/profile-studio functional files plus related docs; expected commit: `feat: run persistent profile creator sessions`). Result: Completed in commit `feat: run persistent profile creator sessions`.
24. [DONE] Git Commit: `feat: run persistent profile creator sessions` (hash: self)

25. [DONE] `harness-ai.phase4.stream1.task3` Route Claude structured creator results into controlled assistant text, full-snapshot validation/application and repair notices without parsing free-form renderer text (scope: up to 3 Core/provider functional files plus related docs; expected commit: `feat: apply profile creator structured results`). Result: Completed in commit `feat: apply profile creator structured results`.
26. [DONE] Git Commit: `feat: apply profile creator structured results` (hash: self)

27. [DONE] `harness-ai.phase4.stream1.task4` Expose typed Profile Studio list/get/create/approve commands and update events through Core runtime API, Electron bridge and renderer contract (scope: Core Profile Studio RPC helper/composition, Core runtime dispatch, Electron IPC map, preload bridge and renderer bridge types plus related docs; up to 5 functional files; expected commit: `feat: expose profile studio core bridge`). Result: Completed in commit `feat: expose profile studio core bridge`.
28. [DONE] Git Commit: `feat: expose profile studio core bridge` (hash: self)

## Phase 5 - Reusable Session Surface (owner: Codex, updated: 2026-07-20)

### Stream: Existing Interface Reuse

29. [DONE] `harness-ai.phase5.stream1.task1` Create the `session-surface` module/facade from the existing central SessionId/Dialog/Input/Status composition and make ordinary Session Window consume it without visual or runtime behavior changes (scope: new session-surface facade, session-window-facade.tsx, focused regression test plus cluster/module docs and Product Tree; expected commit: `refactor: extract reusable session surface`). Result: Completed in commit `refactor: extract reusable session surface`.
30. [DONE] Git Commit: `refactor: extract reusable session surface` (hash: self)

## Phase 6 - Application Shell Profile Studio Cluster (owner: Codex, updated: 2026-07-20)

### Stream: Accepted UI Baseline

31. [DONE] `harness-ai.phase6.stream1.task1` Create the Application Shell `profile-studio` cluster with facade-owned sidebar and inspector modules driven only by Core snapshots, including accepted provider/model/profile rows and three read-only tabs (scope: sidebar facade, inspector facade, shared Studio CSS plus cluster/module docs, Application Shell product-part doc and Product Tree; expected commit: `feat: add profile studio sidebar and inspector`). Result: Completed in commit `feat: add profile studio sidebar and inspector`.
32. [DONE] Git Commit: `feat: add profile studio sidebar and inspector` (hash: self)

33. [DONE] `harness-ai.phase6.stream1.task2` Add the `profile-studio-shell` facade and single-window mode switch beside Settings, reuse `SessionSurfaceFacade`, restore ordinary workspace/session mode and exclude detached windows (scope: up to 4 functional files — profile-studio shell facade, shared Studio CSS, session-window integration and session-sidebar entry — plus focused mode test, cluster/module docs and Product Tree; expected commit: `feat: add profile studio application mode`). Result: Completed in commit `feat: add profile studio application mode`.
34. [DONE] Git Commit: `feat: add profile studio application mode` (hash: self)

35. [DONE] `harness-ai.phase6.stream1.task3` Remove the old Settings Profile Creator authoring entry while preserving legacy runtime profiles, translations and normal session picker compatibility (scope: up to 5 functional files — settings tab model/content and the three legacy profile-settings UI sources — plus focused retirement/picker test, module registration removal and related docs; expected commit: `refactor: retire settings profile creator entry`). Result: Completed in commit `refactor: retire settings profile creator entry`.
36. [DONE] Git Commit: `refactor: retire settings profile creator entry` (hash: self)

## Phase 7 - Provider Capability Application (owner: Codex, updated: 2026-07-20)

### Stream: Honest Valid Profiles

37. [DONE] `harness-ai.phase7.stream1.task1` Apply Studio Claude prompt and validated native tool-name subset through the existing Claude managed profile route and record exact application truth (scope: up to 3 Claude/profile functional files plus related docs; expected commit: `feat: apply claude studio profiles`). Result: Completed in commit `feat: apply claude studio profiles`.
38. [DONE] Git Commit: `feat: apply claude studio profiles` (hash: self)

39. [DONE] `harness-ai.phase7.stream1.task2` Preserve Codex prompt-only application with fixed-tool read model and enforce Kimi Draft-only validation until universal-client 25-tool parity exists (scope: up to 2 functional files — central profile-catalog capability gate and Codex applied-detail projection — plus focused tests and related docs; expected commit: `feat: enforce studio provider capability gates`). Result: Completed in commit `feat: enforce studio provider capability gates`.
40. [DONE] Git Commit: `feat: enforce studio provider capability gates` (hash: self)

### Stream: Exact Model Session Routing

41. [DONE] `harness-ai.phase7.stream2.task1` Route the resolved provider model through the ordinary profile picker RPC and immutable session-profile resolution so Valid Studio entries appear only for, and start only with, the exact selected provider/model target (scope: up to 6 functional files — session-window model prop, session profile step, renderer bridge type, Core profile-list RPC, session creation and session-profile resolution — plus focused tests and related docs; expected commit: `fix: route studio model through session picker`). Result: Completed in commit `fix: route studio model through session picker`.
42. [DONE] Git Commit: `fix: route studio model through session picker` (hash: self)

## Phase 8 - Integrated Build Evidence (owner: Codex, updated: 2026-07-20)

### Stream: Production Build

43. [DONE] `harness-ai.phase8.stream1.task1` Run the production build after implementation, verify the Studio contracts in built renderer/runtime artifacts and record integration evidence without packaging yet (scope: `docs/evidence/profile-studio-mvp-build-2026-07-20.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: record profile studio mvp build`). Result: Completed in commit `docs: record profile studio mvp build`.
44. [DONE] Git Commit: `docs: record profile studio mvp build` (hash: self)

## Phase 9 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-20)

### Stream: macOS Package

45. [DONE] `harness-ai.phase9.stream1.task1` Build the user-authorized unsigned macOS package, verify `release/mac-arm64/Harness AI.app` and packaged `app.asar`, launch the rebuilt package and record package identity/retest checklist (scope: `docs/evidence/profile-studio-mvp-package-2026-07-20.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile studio mvp`). Result: Completed in commit `docs: package profile studio mvp`.
46. [DONE] Git Commit: `docs: package profile studio mvp` (hash: self)

## Phase 10 - Packaged Acceptance Defects (owner: Codex + User, updated: 2026-07-21)

### Stream: Atomic Draft Activation

47. [DONE] `harness-ai.phase10.stream1.task1` Repair the packaged create workflow so one successful Draft RPC immediately activates its persisted creator session, keeps Studio sessions in the shared session state, selects the new profile and renders its Core inspector without refresh races even when provider binding fails (scope: up to 2 functional files — Session Window event refresh routing and Profile Studio shell create/select convergence — plus focused tests and related docs; expected commit: `fix: activate profile studio draft sessions`). Result: Completed in commit `fix: activate profile studio draft sessions`.
48. [DONE] Git Commit: `fix: activate profile studio draft sessions` (hash: self)

49. [DONE] `harness-ai.phase10.stream1.task2` Bind a newly created Profile Creator session to the provider/model selected in Profile Studio instead of the fixed Claude/Opus execution identity, while keeping the existing inline creator system prompt/output schema and leaving the unagreed automatic first user turn out of this slice (scope: up to 3 functional files — Profile Studio agent spec, creator-session assembly/turn options and Core Studio session id/provider mapping — plus focused tests and related docs; expected commit: `fix: bind profile creator to selected target`). Result: Completed in commit `fix: bind profile creator to selected target`.
50. [DONE] Git Commit: `fix: bind profile creator to selected target` (hash: self)

### Stream: Rebuilt Acceptance Package

51. [DONE] `harness-ai.phase10.stream2.task1` Rebuild the user-authorized unsigned macOS package, verify the repaired create/select/session/inspector contracts in `app.asar`, launch the rebuilt application and record a focused retest checklist (scope: `docs/evidence/profile-studio-activation-repair-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile studio activation repair`). Result: Completed in commit `docs: package profile studio activation repair`.
52. [DONE] Git Commit: `docs: package profile studio activation repair` (hash: self)

## Phase 11 - Profile Lifecycle Acceptance Defects (owner: Codex + User, updated: 2026-07-21)

### Stream: Persistent Creator Session

53. [DONE] `harness-ai.phase11.stream1.task1` Restore the dedicated Profile Studio workspace as one coherent session list before entering Studio, and initialize the sidebar to the exact provider/model/profile of the newest persisted creator session so its standard session surface survives return and re-entry (scope: up to 2 functional files — Session Window entry routing and Profile Studio shell initial target selection — plus focused tests and related docs; expected commit: `fix: restore profile studio sessions on reentry`). Result: Completed in commit `fix: restore profile studio sessions on reentry`.
54. [DONE] Git Commit: `fix: restore profile studio sessions on reentry` (hash: self)

### Stream: Managed Profile Deletion

55. [DONE] `harness-ai.phase11.stream2.task1` Add one Core-owned delete operation for a Studio profile that validates the v2 Studio identity, removes its contained profile documents and cleans up the bound creator session through the existing Session Runtime cascade (scope: up to 3 functional files — Profile Studio lifecycle/RPC and Core Runtime dispatch — plus focused tests and related docs; expected commit: `feat: delete profile studio profiles`). Result: Completed in commit `feat: delete profile studio profiles`.
56. [DONE] Git Commit: `feat: delete profile studio profiles` (hash: self)

57. [DONE] `harness-ai.phase11.stream2.task2` Expose the Core delete operation through the Electron bridge and add a working per-profile delete action with an in-app confirmation dialog, pending/error state and immediate selection/list/session convergence (scope: up to 6 functional files — Core process bridge, preload, renderer contract, Studio shell/sidebar and shared CSS — plus focused tests and related docs; expected commit: `feat: add profile studio delete control`). Result: Completed in commit `feat: add profile studio delete control`.
58. [DONE] Git Commit: `feat: add profile studio delete control` (hash: self)

### Stream: Rebuilt Acceptance Package

59. [DONE] `harness-ai.phase11.stream3.task1` Rebuild the already user-authorized unsigned macOS package, verify creator-session re-entry and managed profile deletion in `app.asar`, launch the rebuilt application and record the focused retest checklist (scope: `docs/evidence/profile-studio-lifecycle-repair-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile studio lifecycle repair`). Result: Completed in commit `docs: package profile studio lifecycle repair`.
60. [DONE] Git Commit: `docs: package profile studio lifecycle repair` (hash: self)

## Phase 12 - Profile Studio Re-entry Race (owner: Codex + User, updated: 2026-07-21)

### Stream: Workspace-Scoped Session State

61. [DONE] `harness-ai.phase12.stream1.task1` Prevent ordinary-workspace session refreshes from replacing the Profile Studio session list during entry: route Core session events through an immediately updated application-mode authority and ignore stale list responses whose workspace no longer owns the shared session controller (scope: up to 2 functional files — Session Window event routing and shared session-state refresh guards — plus focused tests and related docs; expected commit: `fix: prevent profile studio session refresh races`). Result: Completed in commit `fix: prevent profile studio session refresh races`.
62. [DONE] Git Commit: `fix: prevent profile studio session refresh races` (hash: self)

### Stream: Rebuilt Acceptance Package

63. [DONE] `harness-ai.phase12.stream2.task1` Rebuild the already user-authorized unsigned macOS package, verify the workspace-scoped re-entry guard in `app.asar`, launch the rebuilt package and append focused evidence for the rejected and repaired package (scope: `docs/evidence/profile-studio-lifecycle-repair-package-2026-07-21.md`; expected commit: `docs: package profile studio reentry race repair`). Result: Completed in commit `docs: package profile studio reentry race repair`.
64. [DONE] Git Commit: `docs: package profile studio reentry race repair` (hash: self)

65. [DONE] `harness-ai.phase12.stream2.task2` User retests the packaged Profile Studio workflow: create/select a Draft, return to ordinary sessions, reopen Studio and see the same provider/model/profile plus the complete standard session surface; then confirm managed deletion still works (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — Пользователь подтвердил удаление профиля и восстановление сессии Profile Studio после повторного входа Acceptance Commit: `chore: record plan acceptance profile-studio-mvp-2026-07-20`.

## Phase 13 - Default Profile Creator Agent Setting (owner: Codex + User, updated: 2026-07-21)

### Stream: Core-Owned Creator Agent Choice

66. [DONE] `harness-ai.phase13.stream1.task1` Add the Core-owned system setting for the default Profile Creator Agent with the first managed option `codex-profile-creator-agent` (`Codex / GPT-5.6 Sol / high`), deterministic fallback normalization and system-level persistence (scope: up to 3 functional files — settings store facade, normalization and persistence projection — plus focused tests and related docs; expected commit: `feat: add default profile creator agent setting`). Result: Completed in commit `feat: add default profile creator agent setting`.
67. [DONE] Git Commit: `feat: add default profile creator agent setting` (hash: self)

### Stream: Dedicated Settings Tab

68. [DONE] `harness-ai.phase13.stream2.task1` Add a dedicated `Profile Studio` Settings tab immediately before `General` and a working Default Profile Creator Agent selector backed only by the Core settings snapshot; expose the single Codex option and its fixed provider/model/reasoning metadata without adding the control to the everyday Studio workflow (scope: up to 4 functional files — Profile Studio settings UI facade, tab registry, tab content composition and localization source dictionary — plus focused tests, new module docs, cluster docs and Product Tree; expected commit: `feat: add profile studio settings tab`). Result: Completed in commit `feat: add profile studio settings tab`.
69. [DONE] Git Commit: `feat: add profile studio settings tab` (hash: self)

## Phase 14 - Clean Profile Studio Storage (owner: Codex + User, updated: 2026-07-21)

### Stream: Canonical Profile Roots

70. [DONE] `harness-ai.phase14.stream1.task1` Make `ProfileStudio/Profiles` the only HARNESS_AI_HOME-aware target-profile root, remove first-access seed generation and all seed call sites, and keep catalog/watch/authoring behavior empty until Profile Studio creates real profiles (scope: up to 4 functional files — profile store, retired seed source, profile catalog and Core session-profile RPC — plus focused tests and all related architecture/module/Product Tree documentation; expected commit: `refactor: reset profile studio profile storage`). Result: Completed in commit `refactor: reset profile studio profile storage`.
71. [DONE] Git Commit: `refactor: reset profile studio profile storage` (hash: self)

### Stream: Provider-Only Creator Agent Choice

72. [DONE] `harness-ai.phase14.stream2.task1` Remove the redundant managed-agent id and persist only `profileStudio.defaultCreatorAgentProviderId = codex`; keep the human label and fixed GPT-5.6 Sol/high metadata in the Core-owned option catalog and bind the Settings selector to the provider id (scope: up to 5 functional files — settings store, normalization, Profile Studio settings facade, Settings tab composition and the directly related localization source dictionary — plus focused tests and related docs; expected commit: `refactor: simplify creator agent provider setting`). Result: Completed in commit `refactor: simplify creator agent provider setting`.
73. [DONE] Git Commit: `refactor: simplify creator agent provider setting` (hash: self)

### Stream: Clean Runtime And Test Package

74. [DONE] `harness-ai.phase14.stream3.task1` Stop the packaged app, remove the disposable legacy `Profiles` root and Profile Studio creator sessions, create the clean `ProfileStudio/Profiles` and `ProfileStudio/CreatorAgents/Codex` directories, build/package/launch the user-authorized unsigned macOS app and record exact package identity plus the focused storage/Settings retest checklist (scope: `docs/evidence/profile-studio-storage-reset-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile studio storage reset`). Result: Completed in commit `docs: package profile studio storage reset`.
75. [DONE] Git Commit: `docs: package profile studio storage reset` (hash: self)

76. [DONE] `harness-ai.phase14.stream3.task2` User verifies the rebuilt package starts with an empty target-profile catalog and no restored Creator sessions, while Settings → Profile Studio shows Codex Profile Creator Agent with Codex / GPT-5.6 Sol / high (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Superseded without acceptance by the user-directed Capture-first Creator Agent continuation; final verification moves to `harness-ai.phase16.stream1.task2`.

## Phase 15 - Capture-First Profile Creator Agent (owner: Codex, updated: 2026-07-21)

### Stream: Planning And Accepted Runtime Contract

77. [DONE] `harness-ai.phase15.stream1.task1` Record the agreed Capture-first Creator Agent workflow, raw JSONL donor contract, semantic provider-aware analysis, composite Codex agent profile, Core-generated first message, module split, failure behavior and package acceptance boundary; register the planning source (scope: `docs/evidence/ProfileStudioCreatorAgentBootstrap.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: plan profile creator bootstrap`). Result: Completed in commit `docs: plan profile creator bootstrap`.
78. [DONE] Git Commit: `docs: plan profile creator bootstrap` (hash: self)

79. [DONE] `harness-ai.phase15.stream1.task2` Promote the accepted continuation into current Profile Studio architecture before production changes: separate Creator Agent execution identity from target identity, make raw Capture the sole donor, define the two new Core module/facade boundaries, first-message authority and honest deferred Custom Capture boundary (scope: `docs/architecture/ProfileStudio.md, docs/architecture/SessionProfiles.md, docs/proposals/ProfileStudio.md` plus Product Tree/catalog projections; expected commit: `docs: define profile creator bootstrap architecture`). Result: Completed in commit `docs: define profile creator bootstrap architecture`.
80. [DONE] Git Commit: `docs: define profile creator bootstrap architecture` (hash: self)

### Stream: Composite Creator Agent Profile

81. [DONE] `harness-ai.phase15.stream2.task1` Add the Core Runtime `profile-studio-creator-profile` module/class facade that resolves the selected provider-owned profile below `ProfileStudio/CreatorAgents`, validates `system-prompt.md`, `custom-instructions.md`, declarative `tools.json` and `initial-user-message.md`, composes the exact two-part system prompt and renders only Core-supplied message placeholders with no inline/ambient fallback (scope: new module facade/test plus module/cluster/product-part/Product Tree documentation; expected commit: `feat: load composite profile creator agent`). Result: Completed in commit `feat: load composite profile creator agent`.
82. [DONE] Git Commit: `feat: load composite profile creator agent` (hash: self)

83. [DONE] `harness-ai.phase15.stream2.task2` Finalize the user-space Codex Creator Agent components: revise Custom Instructions for semantic raw-JSONL analysis and marker-drift risks, add the readable initial user-message template, preserve the fresh Native prompt/tooling components, and wire `profile-studio-agent`/session creation to the settings-selected Codex GPT-5.6 Sol/high identity independently of the target provider/model (scope: `~/.harness-ai/ProfileStudio/CreatorAgents/Codex/**` plus up to 3 profile-studio/session-runtime functional files and related docs; expected commit: `feat: compose codex profile creator runtime`). Result: Completed in commit `feat: compose codex profile creator runtime`.
84. [DONE] Git Commit: `feat: compose codex profile creator runtime` (hash: self)

### Stream: Capture-First Bootstrap And First Turn

85. [DONE] `harness-ai.phase15.stream3.task1` Add the Core Runtime `profile-studio-creator-bootstrap` module/class facade that owns Capture-first preparation, target→capture-channel mapping, raw JSONL containment/completion/identity validation, capture id/hash provenance and immutable first-assignment inputs without parsing provider prompt/tool markers (scope: new module facade/test plus module/cluster/product-part/Product Tree documentation; expected commit: `feat: add profile creator capture bootstrap`). Result: Completed in commit `feat: add profile creator capture bootstrap`.
86. [DONE] Git Commit: `feat: add profile creator capture bootstrap` (hash: self)

87. [DONE] `harness-ai.phase15.stream3.task2` Recompose the Core Create Profile RPC so one raw intent preflights the selected Creator Agent, runs a fresh target Native Capture, creates/binds the Draft and Codex creator session only after success, publishes and dispatches exactly one rendered first user message, preserves the session on provider errors and never asks renderer/user to locate Capture artifacts (scope: up to 3 functional files — Core Profile Studio RPC/composition, reusable native-capture entry and session dispatch — plus focused tests and related docs; expected commit: `feat: start capture first profile creator sessions`). Result: Completed in commit `feat: start capture first profile creator sessions`.
88. [DONE] Git Commit: `feat: start capture first profile creator sessions` (hash: self)

89. [DONE] `harness-ai.phase15.stream3.task3` Extend structured target-profile authoring so Codex `codex-fixed` stores the exact extracted Native inventory as `declarative-only` tooling while runtime application remains fixed, preserve Claude subset/Kimi candidate honesty, and keep agent-authored profile documents atomic and Draft-only (scope: up to 3 functional files — Profile Studio agent schema, authoring validation and read model/application projection — plus focused tests and related docs; expected commit: `feat: persist declarative codex tooling`). Result: Completed in commit `feat: persist declarative codex tooling`.
90. [DONE] Git Commit: `feat: persist declarative codex tooling` (hash: self)

### Stream: Honest Application Shell State

91. [DONE] `harness-ai.phase15.stream4.task1` Make the existing Create Profile control render the Core-owned capture/preflight pending state and structured failure without local workflow logic, then converge on the returned selected Draft/session/inspector while preserving delete and leave/re-entry behavior (scope: up to 3 Application Shell Profile Studio functional files plus focused tests and related docs; expected commit: `feat: show profile creator preparation state`). Result: Completed in commit `feat: show profile creator preparation state`.
92. [DONE] Git Commit: `feat: show profile creator preparation state` (hash: self)

93. [DONE] `harness-ai.phase15.stream4.task2` Restore Profile Studio target selection from the selected profile id instead of the Creator Agent execution provider/model, so the new always-Codex creator identity cannot redirect Claude/Kimi Drafts after leave/re-entry (scope: up to 2 Application Shell Profile Studio functional files plus focused tests and related docs; expected commit: `fix: restore profile studio target selection`). Result: Completed in commit `fix: restore profile studio target selection`.
94. [DONE] Git Commit: `fix: restore profile studio target selection` (hash: self)

## Phase 16 - Creator Agent Package And User Acceptance (owner: Codex + User, updated: 2026-07-21)

### Stream: Rebuilt macOS Package

95. [DONE] `harness-ai.phase16.stream1.task1` Build and package the user-authorized unsigned macOS application, verify the composite Codex Creator Agent profile loader, fresh target Capture, Core-generated first-message dispatch and restore contracts inside `app.asar`, launch the package and record exact identity plus the focused retest checklist (scope: `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile creator bootstrap`). Result: Completed in commit `docs: package profile creator bootstrap`.
96. [DONE] Git Commit: `docs: package profile creator bootstrap` (hash: self)

97. [DONE] `harness-ai.phase16.stream1.task2` User retests in the packaged app: choose a target, click Create Profile once, observe Capture preparation, receive a selected persistent creator session with the Core-generated raw JSONL assignment, get the first Codex GPT-5.6 Sol/high Profile Creator Agent interview response without manual Capture/file selection, then verify leave/re-entry and managed deletion (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Rejected on 2026-07-22 — Capture, Draft, session and Core-generated first message succeeded for Claude / Opus / medium, but Codex rejected the first turn because `toolSelection.oneOf` is not permitted in `codex_output_schema`; acceptance moves to Phase 17 after schema repair.

## Phase 17 - Codex Structured Output Schema Repair (owner: Codex + User, updated: 2026-07-22)

### Stream: Strict Schema And Core Parsing

98. [DONE] `harness-ai.phase17.stream1.task1` Replace the unsupported provider-variant `oneOf` and arbitrary nested tool objects with one Codex-compatible strict `toolSelection` envelope carrying validated JSON text; parse it back into the existing provider-specific Core snapshot, preserve authoring/storage behavior and cover the exact rejected-schema regression (scope: up to 2 functional files — Profile Studio Agent facade and focused test — plus its module and related architecture docs; expected commit: `fix: make profile creator schema codex compatible`). Result: Completed in commit `fix: make profile creator schema codex compatible`.
99. [DONE] Git Commit: `fix: make profile creator schema codex compatible` (hash: self)

### Stream: Rebuilt Repair Package

100. [DONE] `harness-ai.phase17.stream2.task1` After explicit user authorization for another package build, rebuild the unsigned macOS application, verify the repaired schema contract in `app.asar`, launch it and append exact package identity plus the focused first-turn retest to the existing Creator Bootstrap package evidence (scope: `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile creator schema repair`). Result: Completed in commit `docs: package profile creator schema repair`.
101. [DONE] Git Commit: `docs: package profile creator schema repair` (hash: self)

102. [DONE] `harness-ai.phase17.stream2.task2` User retests the rebuilt package with Claude / Opus / medium: Create Profile completes Capture, creates the persistent Draft/session, dispatches the Core first message and receives the first Codex GPT-5.6 Sol/high Profile Creator Agent interview response without `invalid_json_schema`; then verify leave/re-entry and managed deletion (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Rejected on 2026-07-22 — the session and Creator Agent now run, but the agent answers in English instead of the Settings-selected user language, and the three-column Studio layout has no horizontal resize controls; acceptance moves to Phase 18.

## Phase 18 - Creator Language And Resizable Studio Panes (owner: Codex + User, updated: 2026-07-22)

### Stream: Core-Owned Communication Language

103. [DONE] `harness-ai.phase18.stream1.task1` Resolve Profile Creator communication language from system Settings `general.localization.categories.systemFeedback` with `defaultLanguage` fallback, append an explicit Core-generated language directive to the custom portion of the effective Creator Agent system prompt, include it in the managed content hash and cover exact language/fallback composition (scope: up to 3 functional files — Creator Profile facade, Session Creation and focused tests — plus related module/architecture docs; expected commit: `fix: localize profile creator communication`). Result: Completed in commit `fix: localize profile creator communication`.
104. [DONE] Git Commit: `fix: localize profile creator communication` (hash: self)

### Stream: Three-Pane Horizontal Resize

105. [DONE] `harness-ai.phase18.stream2.task1` Add two accessible horizontal drag separators owned by the Profile Studio shell, resize left sidebar / central standard session / right inspector within explicit minimum and viewport bounds, remove child fixed-width conflicts and cover pointer/keyboard/layout contracts without changing Core workflow state (scope: up to 3 functional files — Profile Studio Shell facade, shared Studio CSS and focused shell test — plus related module/architecture docs; expected commit: `feat: resize profile studio panes`). Result: Completed in commit `feat: resize profile studio panes`.
106. [DONE] Git Commit: `feat: resize profile studio panes` (hash: self)

### Stream: Rebuilt Acceptance Package

107. [DONE] `harness-ai.phase18.stream3.task1` Build the user-authorized unsigned macOS package, verify the Core language directive and two resizers inside `app.asar`, launch it and append exact identity plus focused language/resize retest steps to the Creator Bootstrap package evidence (scope: `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package profile creator language and resize`). Result: Completed in commit `docs: package profile creator language and resize`.
108. [DONE] Git Commit: `docs: package profile creator language and resize` (hash: self)

109. [DONE] `harness-ai.phase18.stream3.task2` User retests the rebuilt package: a fresh Creator Agent speaks the system-Settings communication language from its first answer; both Studio dividers resize left/sidebar, center/session and right/inspector safely; Capture, persistence, re-entry and deletion remain working (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Rejected on 2026-07-22 — Settings-selected Russian and both horizontal pane resizers work, but Codex JSON Schema output is rendered as the raw `assistantResponse` / `draft` / `nextAction` JSON envelope with escaped newline markers; acceptance moves to Phase 19.

## Phase 19 - Codex Structured Response Projection (owner: Codex + User, updated: 2026-07-22)

### Stream: Provider-Normalized Structured Output

110. [DONE] `harness-ai.phase19.stream1.task1` Normalize a Codex `outputSchema` final agent message at the provider-adapter boundary into the existing `structured_output` event, suppress the serialized JSON dialog message, preserve real newlines inside parsed `assistantResponse` and keep ordinary Codex final answers unchanged (scope: up to 3 production functional files — Codex app-server facade, event router and agent-message projector — plus focused test, Codex/session-request-handler module and related architecture/evidence docs; expected commit: `fix: normalize codex structured output`). Result: Completed in commit `fix: normalize codex structured output`.
111. [DONE] Git Commit: `fix: normalize codex structured output` (hash: self)

### Stream: Rebuilt Acceptance Package

112. [DONE] `harness-ai.phase19.stream2.task1` Build the user-authorized unsigned macOS package, verify the normalized Codex structured-output projection in `app.asar`, launch it and append exact package identity plus focused formatting retest steps to the Creator Bootstrap package evidence (scope: `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package codex creator response projection`). Result: Completed in commit `docs: package codex creator response projection`.
113. [DONE] Git Commit: `docs: package codex creator response projection` (hash: self)

114. [DONE] `harness-ai.phase19.stream2.task2` User retests the rebuilt package: Profile Creator responses contain only readable `assistantResponse` text with real paragraph/list line breaks and no visible JSON envelope; Russian language, both pane resizers, Capture, persistence, re-entry and deletion remain working (completion: user-acceptance; scope: user workflow; expected commit: none). Result: Rejected on 2026-07-22 — final `final_answer` is decoded correctly, but schema-bound Codex `commentary` agent messages still reach the transcript as visible `assistantResponse` / `draft` / `nextAction` JSON envelopes; acceptance moves to Phase 20.

## Phase 20 - Creator Commentary Response Projection (owner: Codex + User, updated: 2026-07-22)

### Stream: Structured Progress Messages

115. [DONE] `harness-ai.phase20.stream1.task1` Normalize schema-bound Codex `commentary` agent messages into phase-marked `structured_output` events while keeping the turn's final-output expectation active; make Core publish only their decoded `assistantResponse` and forbid commentary from applying Draft snapshots or starting automatic repair, while preserving final authoring and ordinary Codex commentary (scope: up to 2 production functional files — Codex agent-message projector and Profile Creator result handler — plus focused test and related provider/Core/architecture/evidence docs; expected commit: `fix: normalize creator commentary output`). Result: Completed in commit `fix: normalize creator commentary output`.
116. [DONE] Git Commit: `fix: normalize creator commentary output` (hash: self)

### Stream: Rebuilt Acceptance Package

117. [DONE] `harness-ai.phase20.stream2.task1` Build the user-authorized unsigned macOS package, verify phase-marked Codex commentary projection and final-only authoring in `app.asar`, launch it and append exact package identity plus focused multi-message retest steps to the Creator Bootstrap package evidence (scope: `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package creator commentary projection`). Result: Completed in commit `docs: package creator commentary projection`.
118. [DONE] Git Commit: `docs: package creator commentary projection` (hash: self)

### Stream: Kimi CLI 2.4.1 Commit Gate Repair (added 2026-11-02)

Plan repair, user-approved on 2026-11-02: the user confirmed the Phase 20
package, but the acceptance commit was blocked by the pre-commit suite. The
Kimi native runtime test copies the real `~/.kimi-code/config.toml`; since the
Kimi CLI config migration of 2026-09-09 its `[thinking]` section carries only
`enabled = true` (effort moved to per-model `default_effort`), so Harness reads
no configured effort, sends ACP `thinking=on` and Kimi CLI 2.4.1 then resolves
the model default effort instead of the Harness-selected level. This repair
runs before the acceptance record; the acceptance row moved below unchanged.

119. [DONE] `harness-ai.phase20.stream3.task1` Keep the Harness-owned Kimi thinking effort with the migrated Kimi CLI 2.4.1 config: when the workspace-home `[thinking]` section exists without `effort`, write the default effort into it so the runtime never sends ACP `thinking=on`, and make the native runtime test hermetic through a fixture Kimi config dir instead of the real `~/.kimi-code` (scope: up to 2 production functional files — Kimi workspace home and native session runtime — plus focused tests, kimi-native-session module doc and related provider docs; expected commit: `fix: keep kimi thinking effort with new cli config`). Result: Completed in commit `fix: keep kimi thinking effort with new cli config`.
120. [DONE] Git Commit: `fix: keep kimi thinking effort with new cli config` (hash: self)

### Stream: Phase 20 User Acceptance

121. [DONE] `harness-ai.phase20.stream2.task2` User retests the rebuilt package: every intermediate and final Profile Creator response contains only decoded `assistantResponse` text with real line breaks and no visible JSON envelope; only the final structured result can author the Draft, while Russian language and Studio pane resizing remain working (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — User accepted on 2026-11-02: intermediate and final Profile Creator responses show only decoded assistantResponse text with real line breaks and no JSON envelope; only the final result authors the Draft; Russian language and Studio pane resizing work Acceptance Commit: `chore: record plan acceptance profile-studio-mvp-2026-07-20`.

## Phase 21 - Live Provider Model Catalogs (owner: Claude + User, updated: 2026-11-02)

User request (2026-11-02): new Kimi models (K3.1) must appear without code
edits — discover them interactively when possible. Verified live on
2026-11-02: `GET https://api.kimi.com/coding/v1/models` returns every Coding
Plan model with `display_name`, `context_length` and `think_efforts`
(`kimi-for-coding` = K2.8 Preview 1M, `kimi-for-coding-highspeed` = K2.7
262K, `k3` 1M, `k3-256k` 262K, `k3.1-pro` 1M, `k3.1-pro-highspeed` 1M), while
Kimi CLI 2.4.1 accepts only model ids declared in its `config.toml`.

### Stream: Core-Owned Live Catalog

122. [DONE] `harness-ai.phase21.stream1.task1` Make the Kimi model catalog Core-owned and live: parse full `/coding/v1/models` rows (id, display name, context window, supported and default thinking efforts), persist the last successful catalog under the Harness product home, serve it through the provider-descriptor facade with a refreshed verified fallback list, and refresh it on Core start (scope: up to 3 production functional files — Kimi model catalog, provider descriptor facade and Core start wiring — plus the kimi-client-provider facade re-export line, focused tests and related provider/Core docs; expected commit: `feat: discover kimi models from live catalog`). Result: Completed in commit `feat: discover kimi models from live catalog`.
123. [DONE] Git Commit: `feat: discover kimi models from live catalog` (hash: self)
124. [DONE] `harness-ai.phase21.stream1.task2` Declare every live catalog model in the Kimi workspace-home CLI config with its live context window and efforts, so native sessions can select newly discovered models (scope: 1 production functional file — Kimi workspace home, which reads the Core-served catalog through the provider-descriptor facade — plus focused tests with a descriptor stub and kimi-native-session docs; expected commit: `feat: configure live kimi models in workspace home`). Result: Completed in commit `feat: configure live kimi models in workspace home`.
125. [DONE] Git Commit: `feat: configure live kimi models in workspace home` (hash: self)

### Stream: Codex And Claude Live Catalogs (added 2026-11-02)

User request (2026-11-02, while away): apply the same live model discovery to
Codex (its Settings list still shows retired models) and Claude (Fable is
missing), then build and install a new package. Verified live on 2026-11-02:
Codex app-server 0.166.0 `model/list` returns every model with `displayName`,
`description`, `hidden`, `supportedReasoningEfforts` and
`defaultReasoningEffort` (visible: `gpt-6.1-sol` default, `gpt-6-astra`,
`gpt-6.1-terra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`,
`gpt-5.6-luna`); Claude Agent SDK 0.3.207 `supportedModels()` returns
`opus[1m]` (Opus 4.8), `claude-fable-5-1[1m]` (Fable 5.1), `sonnet`
(Sonnet 5) and `haiku` (Haiku 4.5) with their effort levels.

126. [DONE] `harness-ai.phase21.stream4.task1` Make the Codex model catalog Core-owned and live: read visible models from the Codex app-server `model/list` through the Harness Codex provider home, persist the last successful catalog under the Harness product home, serve it through the provider-descriptor facade (capture and Profile Studio follow it) with a refreshed verified fallback, and refresh it on Core start (scope: up to 3 production functional files — new Codex model catalog reader, provider descriptor facade and Core start wiring — plus the codex-provider facade re-export and its catalog-based default-model fallback (was the retired `gpt-5.4-mini`), focused tests and related provider/Core docs; expected commit: `feat: discover codex models from app-server`). Result: Completed in commit `feat: discover codex models from app-server`.
127. [DONE] Git Commit: `feat: discover codex models from app-server` (hash: self)
128. [DONE] `harness-ai.phase21.stream4.task2` Make the Claude model catalog Core-owned and live: read `supportedModels()` from the Harness Claude Agent SDK, persist and serve it through the provider-descriptor facade (Fable included; Opus keeps the Harness `ultracode` session-orchestration option) with a refreshed verified fallback, and refresh it on Core start (scope: up to 3 production functional files — new Claude model catalog reader, provider descriptor facade and Core start wiring — plus the claude-provider facade re-export, focused tests and related provider/Core docs; expected commit: `feat: discover claude models from sdk`). Result: Completed in commit `feat: discover claude models from sdk`.
129. [DONE] Git Commit: `feat: discover claude models from sdk` (hash: self)

### Stream: Settings Surfaces

130. [DONE] `harness-ai.phase21.stream2.task1` Make Core settings normalization and the Claude, Codex and Kimi settings tabs use the served live catalogs: model ids, labels, descriptions and per-model reasoning efforts come from Core through a `list-provider-model-catalogs` RPC instead of static renderer imports, and saved legacy ids normalize onto the served catalog (scope: settings normalization, Core RPC/bridge/preload wiring and the Claude/Codex/Kimi settings cards, plus focused tests and related settings docs; expected commit: `feat: show live provider models in settings`). Result: Completed in commit `feat: show live provider models in settings`.
131. [DONE] Git Commit: `feat: show live provider models in settings` (hash: self)

### Stream: Rebuilt Acceptance Package

132. [DONE] `harness-ai.phase21.stream3.task1` Build the user-authorized unsigned macOS package, verify the live Kimi, Codex and Claude catalogs in `app.asar`, install and launch it and record package identity plus focused retest steps in new package evidence (scope: `docs/evidence/live-provider-model-catalogs-package-2026-11-02.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: package live provider model catalogs`). Result: Completed in commit `docs: package live provider model catalogs`.
133. [DONE] Git Commit: `docs: package live provider model catalogs` (hash: self)
### Stream: Claude SDK Freshness (added 2026-11-03)

Plan repair, user-reported on 2026-11-03 while retesting the Phase 21 package:
the Claude settings rows show stale descriptions ("Opus 4.8", "Fable 5",
"Sonnet 5", "Haiku 4.5"). The labels are Anthropic aliases and stay
number-free; the descriptions come live from `supportedModels()` of the
Harness-installed Claude Agent SDK, which is still 0.3.207 — Harness installs
it once into `~/.harness-ai/providers/claude/sdk` and never updates it, while
the Settings SDK version row and its update button target the global npm
package (0.3.316). Verified live: SDK 0.3.317 reports Opus 5.5, Sonnet 5.5,
Haiku 5.5 (now with efforts) and `claude-fable-5[1m]` "Fable 5". The
`autoUpdate` toggle has no runtime consumer. The user asked to keep the labels
current automatically whenever Anthropic ships new models. The reported Kimi
"Authentication required" was an expired Kimi CLI OAuth login (CLI 2.4.1
tombstoned the shared credentials after a rejected refresh); the user
re-logged in, no code change. The acceptance row moved below unchanged.

134. [DONE] `harness-ai.phase21.stream5.task1` Give the Claude provider a Harness SDK update route and a forced catalog refresh: read the Harness-installed Claude Agent SDK version, install the latest SDK into the Harness prefix, and let `refreshClaudeModelCatalog({ force: true })` bypass the catalog TTL (scope: claude-provider `claude-sdk-updates.ts`, `claude-model-catalog.ts`, `claude-provider-facade.ts`, plus focused tests and claude-provider docs; expected commit: `feat: update harness claude sdk in place`). Result: Completed in commit `feat: update harness claude sdk in place`.
135. [DONE] Git Commit: `feat: update harness claude sdk in place` (hash: self)
136. [IN_PROGRESS] `harness-ai.phase21.stream5.task2` Route the Claude SDK version row and update button to the Harness SDK, refresh the Claude model catalog right after a successful Claude SDK update, and make the Claude auto-update toggle work: on Core start, when enabled and a newer SDK is published, update the Harness SDK in the background and refresh the catalog (scope: core-runtime-process `core-provider-tools.ts`, `core-runtime-api.ts`, plus focused tests and core-runtime-process/settings docs; expected commit: `feat: auto-update claude sdk and model labels`).
137. [TODO] Git Commit: `feat: auto-update claude sdk and model labels` (hash: TBD)
138. [TODO] `harness-ai.phase21.stream3.task3` Build the user-authorized unsigned macOS package, update the Harness Claude SDK through the packaged app route, verify the refreshed Claude labels and launch it, and append package identity plus retest steps to the Phase 21 package evidence (scope: `docs/evidence/live-provider-model-catalogs-package-2026-11-02.md`; expected commit: `docs: package claude sdk freshness`).
139. [TODO] Git Commit: `docs: package claude sdk freshness` (hash: TBD)

### Stream: Phase 21 User Acceptance

140. [TODO] `harness-ai.phase21.stream3.task2` User retests the rebuilt package: the Kimi, Codex and Claude settings tabs list the live models (K3.1 Pro, GPT-6.x, Fable) with their reasoning levels, a native Kimi session starts on a newly discovered model with the selected thinking effort, and new Codex and Claude sessions start on a newly listed model (completion: user-acceptance; scope: user workflow; expected commit: none).
