# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "native-capture-reasoning-selection-2026-07-11",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User-approved Native Request Capture scope plus the
  2026-07-11 request to implement the agreed Figma prototype for Core-owned
  Codex subagent sessions, session titles and detached child windows.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/SubagentSessions.md`
  - `docs/architecture/FirstElectronSessionSlice.md`
  - `product-parts/core-runtime/clusters/provider-network-capture/cluster.md`
  - `product-parts/core-runtime/clusters/session-runtime/cluster.md`

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
- Scope closeout/archival is user-directed only: the agent never initiates moving
  `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting
  a fresh empty plan; it may only suggest it and wait for the user's direct order.
- The completed Native Request Capture package was explicitly user-approved.
  The new subagent UI package requires a fresh explicit confirmation.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); this plan does not duplicate them as separate tasks.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-07-11)

### Stream: Recovery Owner

1. [DONE] `harness-ai.phase0.stream1.task1` Create the active scope for Native Request Capture reasoning selection, reasoning-aware filenames, verification, and packaging (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: add native capture reasoning selection scope`). Result: Completed in commit `plan: add native capture reasoning selection scope`.
2. [DONE] Git Commit: `plan: add native capture reasoning selection scope` (hash: self)

## Phase 1 - Core Capture Reasoning Contract (owner: Codex, updated: 2026-07-11)

### Stream: Catalog And Command Validation

3. [DONE] `harness-ai.phase1.stream1.task1` Extend the Core-owned capture catalog with per-model reasoning capabilities/defaults for Claude and Codex, validate an explicit capture reasoning value in Core, and return the capability surface to the UI (scope: `product-parts/provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, related focused tests, provider-descriptor/core-runtime-process module docs, docs/architecture/SessionProfilesV2.md`; expected commit: `feat: add native capture reasoning contract`). Result: Completed in commit `feat: add native capture reasoning contract`.
4. [DONE] Git Commit: `feat: add native capture reasoning contract` (hash: self)

### Stream: Orchestration And Artifact Identity

5. [DONE] `harness-ai.phase1.stream2.task1` Carry the validated reasoning effort through the provider-neutral capture context and encode it immediately after the model in JSONL, diagnostics JSONL, and Markdown artifact filenames (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-orchestrator/src/capture-orchestrator-facade.ts, product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-artifacts-facade.ts, related focused tests and module/cluster docs, docs/architecture/SessionProfilesV2.md`; expected commit: `feat: identify native captures by reasoning`). Result: Completed in commit `feat: identify native captures by reasoning`.
6. [DONE] Git Commit: `feat: identify native captures by reasoning` (hash: self)
7. [DONE] `harness-ai.phase1.stream2.task2` Pass the Core-validated capture reasoning effort into the provider-neutral orchestrator command so production artifact identity and provider context use the same explicit intent (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-native-capture-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md`; expected commit: `fix: pass native capture reasoning command`). Result: Completed in commit `fix: pass native capture reasoning command`.
8. [DONE] Git Commit: `fix: pass native capture reasoning command` (hash: self)

### Stream: Provider Application

9. [DONE] `harness-ai.phase1.stream3.task1` Apply the explicit capture reasoning effort in the Claude interactive CLI (`--effort`) and Codex app-server `turn/start`, record it in provider diagnostics, and prove the provider boundaries with focused tests (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-native-request-capture-service.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/diagnostics/claude-interactive-cli-runner.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/diagnostics/codex-native-request-capture-service.ts, related focused tests and provider module/cluster docs, docs/architecture/SessionProfilesV2.md`; expected commit: `fix: apply native capture reasoning to providers`). Result: Completed in commit `fix: apply native capture reasoning to providers`.
10. [DONE] Git Commit: `fix: apply native capture reasoning to providers` (hash: self)

## Phase 2 - Native Capture UI (owner: Codex, updated: 2026-07-11)

### Stream: Provider And Model Controls

11. [DONE] `harness-ai.phase2.stream1.task1` Add a model-aware reasoning selector to the Native Request Capture card for Claude and Codex, submit the selected Core-declared value, localize its label, and cover the renderer contract without deriving provider truth in UI (scope: `product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/native-capture-card.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, focused UI tests, provider-settings-ui/localization-runtime module docs`; expected commit: `feat: select reasoning for native capture`). Result: Completed in commit `feat: select reasoning for native capture`.
12. [DONE] Git Commit: `feat: select reasoning for native capture` (hash: self)

## Phase 3 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-11)

### Stream: Live Proof And Package

13. [DONE] `harness-ai.phase3.stream1.task1` Prove a GPT-5.6 Sol Ultra capture records `turn/start.effort=ultra` while preserving the provider-normalized upstream payload, verify reasoning-aware artifact filenames, run the explicitly approved macOS package build, inspect `app.asar`, launch-smoke the app, and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record native capture reasoning package`). Result: Completed in commit `docs: record native capture reasoning package`.
14. [DONE] Git Commit: `docs: record native capture reasoning package` (hash: self)
15. [DONE] `harness-ai.phase3.stream1.task2` User retests reasoning selection and capture artifacts in the packaged app for Claude and Codex (scope: user workflow; expected commit: none). Result: User supplied the packaged Codex retest and moved the active work to subagent session UX.

## Phase 4 - Subagent UX Planning (owner: Codex, updated: 2026-07-11)

### Stream: Architecture And Recovery

16. [DONE] `harness-ai.phase4.stream1.task1` Record the Core/provider/UI subagent session contract, acceptance criteria and implementation microtasks without archiving the existing active scope (scope: `docs/architecture/SubagentSessions.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `plan: add subagent session ux implementation`). Result: Completed in commit `plan: add subagent session ux implementation`.
17. [DONE] Git Commit: `plan: add subagent session ux implementation` (hash: self)

## Phase 5 - Provider Subagent Events (owner: Codex, updated: 2026-07-11)

### Stream: Codex App Server Normalization

18. [DONE] `harness-ai.phase5.stream1.task1` Add provider-neutral subagent event contracts and normalize Codex `collabAgentToolCall`, `thread/started`, and `thread/status/changed` notifications without rollout-text inference (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-event-normalizer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-event-router.ts, focused tests, related provider docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: surface codex subagent events`). Result: Completed in commit `feat: surface codex subagent events`.
19. [DONE] Git Commit: `feat: surface codex subagent events` (hash: self)

## Phase 6 - Core Session Graph (owner: Codex, updated: 2026-07-11)

### Stream: Session Runtime Foundations

20. [DONE] `harness-ai.phase6.stream1.task1` Extract the existing provider binding lifecycle from the 499-line request-handler facade to create safe additive headroom without changing behavior (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-provider-binding-lifecycle.ts, focused tests`; expected commit: `refactor: extract session provider binding lifecycle [skip-docs]`). Result: Completed in commit `refactor: extract session provider binding lifecycle [skip-docs]`.
21. [DONE] Git Commit: `refactor: extract session provider binding lifecycle [skip-docs]` (hash: self)
22. [DONE] `harness-ai.phase6.stream1.task2` Add persisted Core child-session metadata, provider-neutral subagent statuses, timeline call events and event hydration/coalescing contracts (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: add core subagent session contracts`). Result: Completed in commit `feat: add core subagent session contracts`.
23. [DONE] Git Commit: `feat: add core subagent session contracts` (hash: self)
24. [DONE] `harness-ai.phase6.stream1.task3` Implement provider-event routing and the Core subagent lifecycle that creates/adopts child bindings, maintains parent-child status and records spawn timeline items (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-provider-event-router.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: orchestrate core subagent sessions`). Result: Completed in commit `feat: orchestrate core subagent sessions`.
25. [DONE] Git Commit: `feat: orchestrate core subagent sessions` (hash: self)
26. [DONE] `harness-ai.phase6.stream1.task4` Wire the subagent lifecycle into the request handler, persist/restore child records and cascade parent deletion so no orphan descendants remain (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-provider-binding-lifecycle.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-history-store.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: persist core subagent session tree`). Result: Completed in commit `feat: persist core subagent session tree`.
27. [DONE] Git Commit: `feat: persist core subagent session tree` (hash: self)

## Phase 7 - Session Identity And Window Commands (owner: Codex, updated: 2026-07-11)

### Stream: Titles And IPC

28. [DONE] `harness-ai.phase7.stream1.task1` Add one-shot Core auto titles, manual rename locking and regenerate-title commands (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-title-service.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: manage core session titles`). Result: Completed in commit `feat: manage core session titles`.
29. [DONE] Git Commit: `feat: manage core session titles` (hash: self)
30. [DONE] `harness-ai.phase7.stream1.task2` Expose title commands through the Core process bridge and preload API (scope: `product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, focused tests and related module docs`; expected commit: `feat: expose session title commands`). Result: Completed in commit `feat: expose session title commands`.
31. [DONE] Git Commit: `feat: expose session title commands` (hash: self)
32. [DONE] `harness-ai.phase7.stream1.task3` Make detached session windows unique per workspace/session so repeat opens focus the existing child window and completion never closes it (scope: `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: focus existing detached sessions`). Result: Completed in commit `feat: focus existing detached sessions`.
33. [DONE] Git Commit: `feat: focus existing detached sessions` (hash: self)

## Phase 8 - Session UI (owner: Codex, updated: 2026-07-11)

### Stream: Refactors For Bounded Files

34. [DONE] `harness-ai.phase8.stream1.task1` Extract the existing dialog panel from its 499-line facade before adding timeline items, preserving behavior (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-dialog-panel.tsx, focused tests`; expected commit: `refactor: extract session dialog panel [skip-docs]`). Result: Completed in commit `refactor: extract session dialog panel [skip-docs]`.
35. [DONE] Git Commit: `refactor: extract session dialog panel [skip-docs]` (hash: self)
36. [DONE] `harness-ai.phase8.stream1.task2` Extract session hydration/list state from the near-limit window facade before wiring child sessions, preserving behavior (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, focused tests`; expected commit: `refactor: extract session window state [skip-docs]`). Result: Completed in commit `refactor: extract session window state [skip-docs]`.
37. [DONE] Git Commit: `refactor: extract session window state [skip-docs]` (hash: self)

### Stream: Tree, Timeline And Child View

38. [DONE] `harness-ai.phase8.stream2.task1` Render a recursive sidebar tree with child counts/statuses, open/detach controls, resizable width, in-app rename dialog and regenerate-title action (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: show subagent session tree`). Result: Completed in commit `feat: show subagent session tree`.
39. [DONE] Git Commit: `feat: show subagent session tree` (hash: self)
40. [DONE] `harness-ai.phase8.stream2.task2` Merge Core subagent calls into the dialog timeline and add open/detach inline cards with live statuses (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-subagent-timeline.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-dialog-panel.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-core-events.ts, focused tests, related module docs`; expected commit: `feat: show subagent calls in dialog`). Result: Completed in commit `feat: show subagent calls in dialog`.
41. [DONE] Git Commit: `feat: show subagent calls in dialog` (hash: self)
42. [DONE] `harness-ai.phase8.stream2.task3` Wire child navigation, Core session refresh, title commands, read-only child input behavior and parent breadcrumb into the main and detached session views (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: open subagent session views`). Result: Completed in commit `feat: open subagent session views`.
43. [DONE] Git Commit: `feat: open subagent session views` (hash: self)
44. [DONE] `harness-ai.phase8.stream2.task3b` Track simultaneous parent and child turns independently so a child `turn_started` event cannot re-enable the still-running parent composer (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-core-events.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, focused tests, related module docs, .harness/plans/todo-plan.md`; expected commit: `fix: track concurrent session turns`). Result: Completed in commit `fix: track concurrent session turns`.
45. [DONE] Git Commit: `fix: track concurrent session turns` (hash: self)
46. [DONE] `harness-ai.phase8.stream2.task4` Apply the Figma-aligned subagent tree/card/header states and localized Russian/English copy using existing Harness tokens and lucide icons (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, focused tests, related module/localization docs`; expected commit: `style: align subagent session ux`). Result: Completed in commit `style: align subagent session ux`.
47. [DONE] Git Commit: `style: align subagent session ux` (hash: self)
48. [DONE] `harness-ai.phase8.stream2.task5` Apply visual-QA corrections to remove duplicated child subtitles, preserve useful task/status metadata, strengthen child status markers and normalize focus/header prominence (scope: `product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, related module docs, .harness/plans/todo-plan.md`; expected commit: `fix: polish subagent session visuals`). Result: Completed in commit `fix: polish subagent session visuals`.
49. [DONE] Git Commit: `fix: polish subagent session visuals` (hash: self)

## Phase 9 - Local Verification And Design QA (owner: Codex, updated: 2026-07-11)

### Stream: Runnable Evidence

50. [DONE] `harness-ai.phase9.stream1.task1` Run the local build and focused live/mock subagent flow, compare the implemented states against the Figma/reference screenshots in the in-app Browser, and record a passed root Design QA report (scope: `design-qa.md, docs/evidence/**, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: record subagent session design qa`). Result: Completed in commit `docs: record subagent session design qa`.
51. [DONE] Git Commit: `docs: record subagent session design qa` (hash: self)

## Phase 10 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-11)

### Stream: Packaged Defect Correction

52. [DONE] `harness-ai.phase10.stream0.task1` Normalize the actual Codex `subAgentActivity` and child turn lifecycle notifications, preserve structured agent identity, and inherit the parent reasoning effort when Core creates a child session (scope: `.harness/plans/todo-plan.md, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-event-normalizer.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: route codex subagent activity`). Result: Completed in commit `fix: route codex subagent activity`.
53. [DONE] Git Commit: `fix: route codex subagent activity` (hash: self)
54. [DONE] `harness-ai.phase10.stream0.task2` Hydrate persisted Codex descendant threads and their completed transcript items after Core/app restart so existing physical subagent sessions materialize in the Core session graph without rollout-text inference (scope: `.harness/plans/todo-plan.md, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-history-loader.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-facade.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: hydrate codex subagent history`). Result: Completed in commit `fix: hydrate codex subagent history`.
55. [DONE] Git Commit: `fix: hydrate codex subagent history` (hash: self)
56. [DONE] `harness-ai.phase10.stream0.task3` Deduplicate stable provider message ids when persisted Codex child transcripts are replayed on later restarts, while preserving live-tail completion semantics (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-live-tail-dedupe.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: dedupe restored provider messages`). Result: Completed in commit `fix: dedupe restored provider messages`.
57. [DONE] Git Commit: `fix: dedupe restored provider messages` (hash: self)
58. [DONE] `harness-ai.phase10.stream0.task4` Resolve child reasoning metadata from the same Core turn settings when a legacy parent record does not contain its selected effort, so restored Codex Ultra children retain honest UI metadata (scope: `.harness/plans/todo-plan.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: resolve subagent reasoning metadata`). Result: Completed in commit `fix: resolve subagent reasoning metadata`.
59. [DONE] Git Commit: `fix: resolve subagent reasoning metadata` (hash: self)
60. [DONE] `harness-ai.phase10.stream0.task5` Filter ancestor-inherited collaboration items from child `thread/read` history by structured agent-path ownership so historical sibling/self activities cannot create false nested calls or return completed children to running (scope: `.harness/plans/todo-plan.md, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-history-loader.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: filter inherited subagent history`). Result: Completed in commit `fix: filter inherited subagent history`.
61. [DONE] Git Commit: `fix: filter inherited subagent history` (hash: self)
62. [DONE] `harness-ai.phase10.stream0.task6` Preserve the structured agent-path task name when forked Codex `thread.preview` contains inherited parent text, keeping inline cards and child headers deterministic (scope: `.harness/plans/todo-plan.md, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-event-normalizer.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: preserve structured subagent task names`). Result: Completed in commit `fix: preserve structured subagent task names`.
63. [DONE] Git Commit: `fix: preserve structured subagent task names` (hash: self)
64. [DONE] `harness-ai.phase10.stream0.task7` Recompute the parent timeline-call when historical child session metadata resolves to a terminal status, keeping restored card/tree/header state consistent (scope: `.harness/plans/todo-plan.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: complete restored subagent calls`). Result: Completed in commit `fix: complete restored subagent calls`.
65. [DONE] Git Commit: `fix: complete restored subagent calls` (hash: self)
66. [DONE] `harness-ai.phase10.stream0.task8` Load persisted Core event files before reconstructing in-memory messages so stable provider-id dedupe can suppress transcript replay on subsequent packaged restarts (scope: `.harness/plans/todo-plan.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-types.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-history-restore.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: hydrate core messages before provider replay`). Result: Completed in commit `fix: hydrate core messages before provider replay`.
67. [DONE] Git Commit: `fix: hydrate core messages before provider replay` (hash: self)

### Stream: Packaged Retest

68. [DONE] `harness-ai.phase10.stream1.task1` After fresh explicit user confirmation, build the macOS package, inspect `app.asar`, launch-smoke the app and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record subagent session package`). Result: Completed in commit `docs: record subagent session package`.
69. [DONE] Git Commit: `docs: record subagent session package` (hash: self)
70. [DONE] `harness-ai.phase10.stream1.task2` User retests inline subagent cards, sidebar tree, child transcript, detach, auto title and rename in the packaged app (scope: user workflow; expected commit: none). Result: User audit confirmed the packaged tree and exposed inherited parent transcript replay plus lossy terminal-status recovery.

## Phase 11 - Post-Audit Provider Recovery Repair (owner: Codex, updated: 2026-07-12)

### Stream: Child Transcript And Terminal Semantics

71. [DONE] `harness-ai.phase11.stream1.task1` Filter parent-fork transcript items from restored Codex child sessions and derive honest live/historical terminal status from app-server turn data instead of treating every interrupted or not-loaded thread as completed (scope: `.harness/plans/todo-plan.md, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-history-loader.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-subagent-event-normalizer.ts, focused tests, codex-provider module docs, docs/architecture/SubagentSessions.md`; expected commit: `fix: preserve codex child recovery semantics`). Result: Completed in commit `fix: preserve codex child recovery semantics`.
72. [DONE] Git Commit: `fix: preserve codex child recovery semantics` (hash: self)

### Stream: Package And User Retest

73. [DONE] `harness-ai.phase11.stream2.task1` Build the explicitly approved macOS package, inspect the repaired `app.asar`, run a safe launch smoke and record focused verification evidence for clean child transcript recovery and terminal statuses (scope: `.harness/plans/todo-plan.md, docs/evidence/**, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: record codex child recovery package`). Result: Completed in commit `docs: record codex child recovery package`.
74. [DONE] Git Commit: `docs: record codex child recovery package` (hash: self)
75. [DONE] `harness-ai.phase11.stream2.task2` User retests restored child transcripts, interrupted/completed statuses and the existing subagent navigation in the rebuilt packaged app (scope: user workflow; expected commit: none). Result: User accepted the rebuilt package and the implemented subagent recovery feature; active scope remains open for a later visual adjustment.

## Phase 12 - Subagent UI Visual Follow-Up (owner: Codex + User, updated: 2026-07-12)

### Stream: Next-Session Handoff

76. [DONE] `harness-ai.phase12.stream0.task1` Record the accepted package and queue a deliberately abstract next-session task for user-directed visual changes to the subagent interface without choosing files, layout or behavior before clarification (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: queue subagent visual follow-up`). Result: Completed in commit `plan: queue subagent visual follow-up`.
77. [DONE] Git Commit: `plan: queue subagent visual follow-up` (hash: self)
78. [DONE] `harness-ai.phase12.stream1.task1` At the beginning of the next session, clarify the requested visual adjustments related to subagents, define the exact UI scope and implementation microtasks, then proceed only within that newly agreed boundary (scope: clarification and plan refinement only until user details are provided; expected commit: none). Result: User directed the first visual step: render agent reply markdown (including tables) in dialog bubbles like a VS Code-style preview instead of raw text; the agreed scope lives in Stream: Dialog Markdown Rendering.

### Stream: Dialog Markdown Rendering

79. [DONE] `harness-ai.phase12.stream2.task1` Define the user-approved dialog markdown scope: assistant and thinking bubbles render GFM markdown (tables included) through a renderer-only formatting component, user/system messages stay plain text, and dependency plus first use land in one commit because the knip gate rejects unused dependencies (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: define dialog markdown rendering scope`). Result: Completed in commit `plan: define dialog markdown rendering scope`.
80. [DONE] Git Commit: `plan: define dialog markdown rendering scope` (hash: self)
81. [DONE] `harness-ai.phase12.stream2.task2` Render assistant and thinking dialog bubbles through a session markdown component built on `react-markdown` + `remark-gfm` with `skipHtml`, external links delegated to the existing window-open bridge, and no provider-truth classification in the renderer (scope: `package.json, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-dialog-panel.tsx, focused tests, session-window module docs, .harness/product-tree/**`; expected commit: `feat: render markdown in session dialog`). Result: Completed in commit `feat: render markdown in session dialog`.
82. [DONE] Git Commit: `feat: render markdown in session dialog` (hash: self)
83. [DONE] `harness-ai.phase12.stream2.task3` Style rendered markdown inside dialog bubbles — tables, lists, headings, code blocks, inline code, blockquotes, links — for the dark session theme and replace the plain-text `pre-wrap` contract for markdown content (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, session-window module docs`; expected commit: `style: format markdown session replies`). Result: Completed in commit `style: format markdown session replies`.
84. [DONE] Git Commit: `style: format markdown session replies` (hash: self)

### Stream: Sidebar Status Indicators

85. [DONE] `harness-ai.phase12.stream3.task1` Define the user-approved sidebar indicator scope: in-flight subagent rows (pending/running) show a neutral hollow ring, settled outcomes keep a filled dot with clear colors (green completed, orange interrupted; failed/not_found stay red, shutdown stays grey), inline cards and the child header share the settled colors, and the user explicitly ordered a fresh macOS package after the fix (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: define subagent indicator scope`). Result: Completed in commit `plan: define subagent indicator scope`.
86. [DONE] Git Commit: `plan: define subagent indicator scope` (hash: self)
87. [DONE] `harness-ai.phase12.stream3.task2` Shape the sidebar subagent status indicators: neutral hollow ring for pending/running rows, filled green completed and filled orange interrupted dots, settled colors shared with inline timeline cards and the child session header (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, session-sidebar module docs, docs/architecture/SubagentSessions.md`; expected commit: `style: shape subagent status indicators`). Result: Completed in commit `style: shape subagent status indicators`.
88. [DONE] Git Commit: `style: shape subagent status indicators` (hash: self)
89. [DONE] `harness-ai.phase12.stream3.task3` Build the explicitly user-ordered macOS package with the dialog markdown and indicator changes, inspect `app.asar`, run a safe launch smoke and record verification evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record dialog markdown and indicator package`). Result: Completed in commit `docs: record dialog markdown and indicator package`.
90. [DONE] Git Commit: `docs: record dialog markdown and indicator package` (hash: self)

### Stream: Packaged Markdown Feedback

91. [DONE] `harness-ai.phase12.stream4.task1` Record the user's packaged retest feedback: markdown tables must wrap by whole words instead of inherited anywhere-breaks that shatter narrow header columns, and thinking plates must return to the pre-markdown plain-text format (thin weight, pre-wrap line breaks); the user's package order stays active for this correction cycle (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: queue markdown feedback corrections`). Result: Completed in commit `plan: queue markdown feedback corrections`.
92. [DONE] Git Commit: `plan: queue markdown feedback corrections` (hash: self)
93. [DONE] `harness-ai.phase12.stream4.task2` Restore plain-text thinking plates (markdown only for regular assistant replies) and stop word-shattering in markdown tables by resetting `word-break`/`overflow-wrap` to normal inside table content (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-dialog-panel.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, session-window module docs`; expected commit: `fix: restore thinking format and table wrapping`). Result: Completed in commit `fix: restore thinking format and table wrapping`.
94. [DONE] Git Commit: `fix: restore thinking format and table wrapping` (hash: self)
95. [DONE] `harness-ai.phase12.stream4.task3` Rebuild the user-ordered macOS package with the feedback corrections, inspect `app.asar`, run a safe launch smoke and record verification evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record markdown feedback package`). Result: Completed in commit `docs: record markdown feedback package`.
96. [DONE] Git Commit: `docs: record markdown feedback package` (hash: self)

### Stream: Sentence Line Breaks

97. [DONE] `harness-ai.phase12.stream5.task1` Record the accepted markdown feedback package and the user's next readability request: every sentence in a regular assistant reply paragraph starts on a new line (sentence-end punctuation + space + uppercase heuristic inside paragraphs only, code/tables/lists untouched), with author soft line breaks kept visible; the package order stays active for this cycle (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: queue sentence line breaks`). Result: Completed in commit `plan: queue sentence line breaks`.
98. [DONE] Git Commit: `plan: queue sentence line breaks` (hash: self)
99. [DONE] `harness-ai.phase12.stream5.task2` Split assistant reply paragraphs onto one line per sentence via a renderer-only paragraph formatter (`.!?` + whitespace + uppercase lookahead on text nodes) and render paragraph newlines with `pre-line` so author soft breaks stay visible (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, session-window module docs`; expected commit: `feat: split assistant sentences onto lines`). Result: Completed in commit `feat: split assistant sentences onto lines`.
100. [DONE] Git Commit: `feat: split assistant sentences onto lines` (hash: self)
101. [DONE] `harness-ai.phase12.stream5.task3` Rebuild the user-ordered macOS package with the sentence line breaks, inspect `app.asar`, run a safe launch smoke and record verification evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record sentence break package`). Result: Completed in commit `docs: record sentence break package`.
102. [DONE] Git Commit: `docs: record sentence break package` (hash: self)

### Stream: Markdown File Links

103. [DONE] `harness-ai.phase12.stream6.task1` Record the user's link feedback: markdown links wrap as whole units (no mid-hyphen breaks) and absolute file:line links open the file in the workspace VS Code window at the referenced line, reusing the existing `vscode://file` window-open route without new IPC; the package order stays active for this cycle (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: queue file link handling`). Result: Completed in commit `plan: queue file link handling`.
104. [DONE] Git Commit: `plan: queue file link handling` (hash: self)
105. [DONE] `harness-ai.phase12.stream6.task2` Resolve absolute unix/file-URI markdown hrefs with optional `:line[:column]` into `vscode://file/...` anchors handled by the existing Electron window-open bridge, and wrap rendered links as unbreakable inline blocks (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, focused tests, session-window module docs`; expected commit: `feat: open file links in vs code`). Result: Completed in commit `feat: open file links in vs code`.
106. [DONE] Git Commit: `feat: open file links in vs code` (hash: self)
107. [DONE] `harness-ai.phase12.stream6.task3` Rebuild the user-ordered macOS package with the file-link handling, inspect `app.asar`, run a safe launch smoke and record verification evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record file link package`). Result: Completed in commit `docs: record file link package`.
108. [DONE] Git Commit: `docs: record file link package` (hash: self)

### Stream: Web Link Opening

109. [DONE] `harness-ai.phase12.stream7.task1` Record the user's confirmation that web links must be clickable and open in the default system browser: the window-open route extends its explicit allowlist to `http(s)://` beside `vscode://file/` with no other protocols, and the package order stays active for this cycle (scope: `.harness/plans/todo-plan.md`; expected commit: `plan: queue web link opening`). Result: Completed in commit `plan: queue web link opening`.
110. [DONE] Git Commit: `plan: queue web link opening` (hash: self)
111. [DONE] `harness-ai.phase12.stream7.task2` Allow `https://` and `http://` targets through the Electron window-open opener so web links in rendered replies open in the system browser, prove the exact protocol allowlist with a focused test, and sync the opener/session-window docs plus product tree (scope: `product-parts/application-shell/clusters/electron-host/modules/vscode-link-opener/src/vscode-link-opener-facade.mjs, focused tests, vscode-link-opener/session-window module docs, .harness/product-tree/**`; expected commit: `feat: open web links in system browser`). Result: Completed in commit `feat: open web links in system browser`.
112. [DONE] Git Commit: `feat: open web links in system browser` (hash: self)
113. [DONE] `harness-ai.phase12.stream7.task3` Rebuild the user-ordered macOS package with the web-link opening, inspect `app.asar`, run a safe launch smoke and record verification evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record web link package`). Result: Completed in commit `docs: record web link package`.
114. [DONE] Git Commit: `docs: record web link package` (hash: self)
