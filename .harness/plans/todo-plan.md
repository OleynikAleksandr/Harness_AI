# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "profile-studio-mvp-2026-07-20",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase12.stream2.task1",
  "expectedCommitMessage": "docs: package profile studio reentry race repair",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `docs/evidence/ProfileStudioMvpImplementation.md`.
- **Accepted UI baseline:** `docs/proposals/ProfileStudio.md` and ignored
  `.harness/runtime/prototypes/profile-studio-ui/`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/evidence/ProfileStudioMvpImplementation.md`
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

63. [IN_PROGRESS] `harness-ai.phase12.stream2.task1` Rebuild the already user-authorized unsigned macOS package, verify the workspace-scoped re-entry guard in `app.asar`, launch the rebuilt package and append focused evidence for the rejected and repaired package (scope: `docs/evidence/profile-studio-lifecycle-repair-package-2026-07-21.md`; expected commit: `docs: package profile studio reentry race repair`).
64. [TODO] Git Commit: `docs: package profile studio reentry race repair` (hash: TBD)

65. [TODO] `harness-ai.phase12.stream2.task2` User retests the packaged Profile Studio workflow: create/select a Draft, return to ordinary sessions, reopen Studio and see the same provider/model/profile plus the complete standard session surface; then confirm managed deletion still works (completion: user-acceptance; scope: user workflow; expected commit: none).
