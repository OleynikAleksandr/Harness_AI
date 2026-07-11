# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "native-capture-reasoning-selection-2026-07-11",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase8.stream2.task2",
  "expectedCommitMessage": "feat: show subagent calls in dialog",
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
40. [IN_PROGRESS] `harness-ai.phase8.stream2.task2` Merge Core subagent calls into the dialog timeline and add open/detach inline cards with live statuses (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-subagent-timeline.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-dialog-panel.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-core-events.ts, focused tests, related module docs`; expected commit: `feat: show subagent calls in dialog`).
41. [TODO] Git Commit: `feat: show subagent calls in dialog` (hash: TBD)
42. [TODO] `harness-ai.phase8.stream2.task3` Wire child navigation, Core session refresh, title commands, read-only child input behavior and parent breadcrumb into the main and detached session views (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, focused tests, related module docs, docs/architecture/SubagentSessions.md`; expected commit: `feat: open subagent session views`).
43. [TODO] Git Commit: `feat: open subagent session views` (hash: TBD)
44. [TODO] `harness-ai.phase8.stream2.task4` Apply the Figma-aligned subagent tree/card/header states and localized Russian/English copy using existing Harness tokens and lucide icons (scope: `product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, focused tests, related module/localization docs`; expected commit: `style: align subagent session ux`).
45. [TODO] Git Commit: `style: align subagent session ux` (hash: TBD)

## Phase 9 - Local Verification And Design QA (owner: Codex, updated: 2026-07-11)

### Stream: Runnable Evidence

46. [TODO] `harness-ai.phase9.stream1.task1` Run the local build and focused live/mock subagent flow, compare the implemented states against the Figma/reference screenshots in the in-app Browser, and record a passed root Design QA report (scope: `design-qa.md, docs/evidence/**, docs/DOCUMENTATION_INDEX.md`; expected commit: `docs: record subagent session design qa`).
47. [TODO] Git Commit: `docs: record subagent session design qa` (hash: TBD)

## Phase 10 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-11)

### Stream: Packaged Retest

48. [TODO] `harness-ai.phase10.stream1.task1` After fresh explicit user confirmation, build the macOS package, inspect `app.asar`, launch-smoke the app and record package evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: record subagent session package`).
49. [TODO] Git Commit: `docs: record subagent session package` (hash: TBD)
50. [TODO] `harness-ai.phase10.stream1.task2` User retests inline subagent cards, sidebar tree, child transcript, detach, auto title and rename in the packaged app (scope: user workflow; expected commit: none).
