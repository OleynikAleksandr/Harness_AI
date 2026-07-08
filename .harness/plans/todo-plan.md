# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "codex-uc-reasoning-effort-2026-07-07",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase14.stream1.task2",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request, 2026-07-07 CodexUC reasoning effort audit.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`

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
- Verification/package builds for the current implementation scope are allowed
  by the user's explicit package request.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push
  (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - CodexUC Reasoning Effort (owner: Codex, updated: 2026-07-07)

### Stream: Request Body Contract

1. [DONE] `harness-ai.phase1.stream1.task1` Make CodexUC live requests honor the Core-selected Codex reasoning effort even when a native-bundle request template carries captured `reasoning.effort`; preserve route-owned summary normalization and static template fields. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-responses.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex-uc): honor selected reasoning effort`). Result: Completed in commit `fix(codex-uc): honor selected reasoning effort`.
2. [DONE] Git Commit: `fix(codex-uc): honor selected reasoning effort` (hash: self)

## Phase 2 - Package And User Acceptance (owner: Codex + User, updated: 2026-07-07)

### Stream: Package And Retest

3. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user verification (`npm run package:mac`, user-confirmed) and record evidence. (scope: `docs/evidence/codex-uc-reasoning-effort-package-2026-07-07.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record codex uc reasoning effort package`). Result: Completed in commit `docs(evidence): record codex uc reasoning effort package`.
4. [DONE] Git Commit: `docs(evidence): record codex uc reasoning effort package` (hash: self)
5. [TODO] `harness-ai.phase2.stream1.task2` User retests CodexUC in the packaged app and verifies that the selected Codex reasoning effort is reflected in the outgoing CodexUC route. (scope: user workflow; expected commit: none).

## Phase 3 - CodexUC Native Feedback (owner: Codex, updated: 2026-07-07)

### Stream: Response Feedback Diagnostics

6. [DONE] `harness-ai.phase3.stream1.task1` Record redacted CodexUC response-side feedback so acceptance can distinguish the requested reasoning effort from backend-returned reasoning metadata. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-response-feedback.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-response-feedback.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider-facade.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`; expected commit: `feat(codex-uc): record response reasoning feedback`). Result: Completed in commit `feat(codex-uc): record response reasoning feedback`.
7. [DONE] Git Commit: `feat(codex-uc): record response reasoning feedback` (hash: self)

## Phase 4 - Repackage Feedback Build (owner: Codex + User, updated: 2026-07-07)

### Stream: Package And Retest

8. [DONE] `harness-ai.phase4.stream1.task1` Repackage the app for user verification after CodexUC response-feedback diagnostics and record evidence. (scope: `docs/evidence/codex-uc-response-feedback-package-2026-07-07.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record codex uc feedback package`). Result: Completed in commit `docs(evidence): record codex uc feedback package`.
9. [DONE] Git Commit: `docs(evidence): record codex uc feedback package` (hash: self)
10. [DONE] `harness-ai.phase4.stream1.task2` User retests CodexUC in the packaged app and checks `~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl` for backend-returned reasoning feedback. (scope: user workflow; expected commit: none). Result: Backend feedback confirmed `reasoning.effort: "xhigh"` and `reasoning.summary: "concise"` on the live CodexUC route.

## Phase 5 - CodexUC Detailed Summary Mode (owner: Codex, updated: 2026-07-07)

### Stream: Request Body Contract

11. [DONE] `harness-ai.phase5.stream1.task1` Replace the route-owned CodexUC `reasoning.summary: "concise"` normalization with `reasoning.summary: "detailed"` because live backend probes accept `detailed`/`auto` and `concise` yields only low-value visible summary text. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-responses.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex-uc): request detailed reasoning summary`). Result: Completed in commit `fix(codex-uc): request detailed reasoning summary`.
12. [DONE] Git Commit: `fix(codex-uc): request detailed reasoning summary` (hash: self)

## Phase 6 - Repackage Detailed Summary Build (owner: Codex + User, updated: 2026-07-07)

### Stream: Package And Retest

13. [DONE] `harness-ai.phase6.stream1.task1` Repackage the app for user verification after switching CodexUC to backend-accepted detailed reasoning summary mode and record evidence. (scope: `docs/evidence/codex-uc-detailed-summary-package-2026-07-07.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record codex uc detailed summary package`). Result: Completed in commit `docs(evidence): record codex uc detailed summary package`.
14. [DONE] Git Commit: `docs(evidence): record codex uc detailed summary package` (hash: self)
15. [TODO] `harness-ai.phase6.stream1.task2` User retests CodexUC in the packaged app and checks `~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl` for backend-returned `reasoning.summary: "detailed"` feedback. (scope: user workflow; expected commit: none).

## Phase 7 - Codex App-Server Profile And Reasoning Parity (owner: Codex, updated: 2026-07-08)

### Stream: App-Server Validation

16. [DONE] `harness-ai.phase7.stream1.task1` Split local and seeded Codex app-server profiles from CodexUC profiles under `~/.harness-ai/Profiles`, remove app-server-owned tool/request payload files from the app-server copies, and stop treating Codex app-server profiles as CodexUC-applicable. (scope: local `~/.harness-ai/Profiles/**`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/seed-profiles.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog-facade.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-catalog/src/profile-catalog.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `product-parts/core-runtime/clusters/session-profiles/cluster.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(session-profiles): split codex provider namespaces`). Result: Completed in commit `fix(session-profiles): split codex provider namespaces`.
17. [DONE] Git Commit: `fix(session-profiles): split codex provider namespaces` (hash: self)
18. [DONE] `harness-ai.phase7.stream1.task2` Make CodexUC native request capture read its native-bundle profiles from `Profiles/CodexUC`. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-native-capture.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-provider.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex-uc): read codex uc profile namespace`). Result: Completed in commit `fix(codex-uc): read codex uc profile namespace`.
19. [DONE] Git Commit: `fix(codex-uc): read codex uc profile namespace` (hash: self)
20. [DONE] `harness-ai.phase7.stream1.task3` Restore Codex app-server visible reasoning summary to detailed mode for packaged retest. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/process/codex-provider-home-config.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `docs/architecture/SessionProfiles.md`, `docs/evidence/codex-reference-summary-config-2026-06-28.md`; expected commit: `fix(codex): restore app-server detailed reasoning`). Result: Completed in commit `fix(codex): restore app-server detailed reasoning`.
21. [DONE] Git Commit: `fix(codex): restore app-server detailed reasoning` (hash: self)

## Phase 8 - Codex App-Server Retest Findings (owner: Codex, updated: 2026-07-08)

### Stream: Reasoning Summary Item Shape

22. [DONE] `harness-ai.phase8.stream1.task1` Restore Codex app-server visible reasoning when app-server completes reasoning summaries as `{ type: "summary_text", text }` objects instead of string arrays. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-event-router.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex): parse app-server reasoning summary objects`). Result: Completed in commit `fix(codex): parse app-server reasoning summary objects`.
23. [DONE] Git Commit: `fix(codex): parse app-server reasoning summary objects` (hash: self)

## Phase 9 - Codex App-Server Tool Capture Parity (owner: Codex, updated: 2026-07-08)

### Stream: Captured Tool Payload

24. [DONE] `harness-ai.phase9.stream1.task1` Refresh CodexUC synthetic-native structured tools from the newest Codex app-server Native Request Capture and mirror the updated sidecar into the local CodexUC profile. (scope: local `~/.harness-ai/Profiles/CodexUC/codex-synthetic-native/tools.json`, local `~/.harness-ai/Profiles/CodexUC/codex-synthetic-native-custom/tools.json`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/codex-synthetic-native-seed-prompt.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex-uc): refresh synthetic native tools from app-server capture`). Result: Completed in commit `fix(codex-uc): refresh synthetic native tools from app-server capture`.
25. [DONE] Git Commit: `fix(codex-uc): refresh synthetic native tools from app-server capture` (hash: self)
26. [DONE] `harness-ai.phase9.stream1.task2` Stop seeding and requiring `tooling.yaml` for Codex app-server profiles because app-server ignores profile tooling metadata and owns tool availability through its process registry/flags. (scope: local `~/.harness-ai/Profiles/Codex/codex-app-server-synthetic-native/tooling.yaml`, local `~/.harness-ai/Profiles/Codex/codex-app-server-synthetic-native-custom/tooling.yaml`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store-facade.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/seed/seed-profiles.ts`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/profile-store.test.mjs`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/module.md`, `product-parts/core-runtime/clusters/session-profiles/cluster.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(session-profiles): omit codex app-server tooling sidecar`). Result: Completed in commit `fix(session-profiles): omit codex app-server tooling sidecar`.
27. [DONE] Git Commit: `fix(session-profiles): omit codex app-server tooling sidecar` (hash: self)

## Phase 10 - Packaged Retest Regression (owner: Codex, updated: 2026-07-08)

### Stream: Codex Workspace Home

28. [DONE] `harness-ai.phase10.stream1.task1` Make the Core provider-home manager preserve Codex app-server visible reasoning by materializing workspace `config.toml` with `model_reasoning_summary = "detailed"` instead of reintroducing suppressing `none`. (scope: `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts`, `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.test.mjs`, `product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/module.md`; expected commit: `fix(codex): keep workspace home reasoning detailed`). Result: Completed in commit `fix(codex): keep workspace home reasoning detailed`.
29. [DONE] Git Commit: `fix(codex): keep workspace home reasoning detailed` (hash: self)

## Phase 11 - CodexUC Live Envelope Parity (owner: Codex, updated: 2026-07-08)

### Stream: Request Diagnostics

30. [DONE] `harness-ai.phase11.stream1.task1` Record sanitized live CodexUC request-envelope diagnostics so packaged retests can compare the applied synthetic-native instructions/tools against Codex app-server request captures without relying on model self-report. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-response-feedback.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/codex-uc-response-feedback.test.mjs`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/module.md`; expected commit: `feat(codex-uc): record request envelope diagnostics`) Result: Completed in commit `feat(codex-uc): record request envelope diagnostics`.
31. [DONE] Git Commit: `feat(codex-uc): record request envelope diagnostics` (hash: self)

## Phase 12 - CodexUC Native Developer Input Prefix (owner: Codex, updated: 2026-07-08)

### Stream: Static Native Profile Envelope

32. [DONE] `harness-ai.phase12.stream1.task1` Add a static native Responses input-prefix sidecar to CodexUC synthetic-native profiles and prepend it to live CodexUC requests so the app-server developer input layer participates in cache/tool-surface parity tests. (scope: `product-parts/core-runtime/clusters/session-profiles/modules/profile-store/src/**`, `product-parts/core-runtime/clusters/session-profiles/modules/profile-materializer/src/**`, `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-uc-provider/src/**`, related module docs; expected commit: `feat(codex-uc): apply native input prefix`) Result: Completed in commit `feat(codex-uc): apply native input prefix`.
33. [DONE] Git Commit: `feat(codex-uc): apply native input prefix` (hash: self)

## Phase 13 - Codex App-Server Cache Anchor Stability (owner: Codex, updated: 2026-07-08)

### Stream: App-Server History Mode

34. [DONE] `harness-ai.phase13.stream1.task1` Align the live Codex app-server thread history mode with the Native Request Capture path so the static native prompt prefix becomes cacheable by the second turn instead of depending on extended-history bootstrap behavior. (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-facade.ts`, `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/module.md`, `docs/architecture/SessionProfiles.md`; expected commit: `fix(codex): stabilize app-server cache anchor`). Result: Completed in commit `fix(codex): stabilize app-server cache anchor`.
35. [DONE] Git Commit: `fix(codex): stabilize app-server cache anchor` (hash: self)

## Phase 14 - Repackage Cache Anchor Build (owner: Codex + User, updated: 2026-07-08)

### Stream: Package And Retest

36. [DONE] `harness-ai.phase14.stream1.task1` Repackage the app for user verification after the Codex app-server cache-anchor history-mode fix and record evidence. (scope: `docs/evidence/codex-app-server-cache-anchor-package-2026-07-08.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record codex cache anchor package`). Result: Completed in commit `docs(evidence): record codex cache anchor package`.
37. [DONE] Git Commit: `docs(evidence): record codex cache anchor package` (hash: self)
38. [IN_PROGRESS] `harness-ai.phase14.stream1.task2` User retests Codex app-server and CodexUC in the packaged app and verifies cache parity timing after the second visible turn. (scope: user workflow; expected commit: none).
