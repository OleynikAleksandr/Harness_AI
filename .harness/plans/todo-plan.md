# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-reasoning-display-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase13.stream1.task1",
  "expectedCommitMessage": "chore: verify claude codex kimi reasoning repair",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request - port CodeAI-HUB session reasoning display into Harness AI.
- **Reference project:** `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `AGENTS.md`
  - `.harness/product-tree/product-tree.md`
  - `product-parts/core-runtime/clusters/session-runtime/cluster.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/module.md`
  - `product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- No release/package build starts as a release decision without explicit user confirmation (user requested building a new app for testing in this scope).
- Scope closeout/archival is user-directed only.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-06-28)

### Stream: Planning

1. [DONE] `harness-ai.phase1.stream1.task1` Open a new active scope for session reasoning display porting (scope: `.harness/plans/todo-plan.md`; expected commit: `chore: start session reasoning display scope`). Result: Completed in commit `chore: start session reasoning display scope`.
2. [DONE] Git Commit: `chore: start session reasoning display scope` (hash: self)

## Phase 2 - Reference And Shared Module (owner: Codex, updated: 2026-06-28)

### Stream: Core Runtime

3. [DONE] `harness-ai.phase2.stream1.task1` Inspect CodeAI-HUB reasoning display flow, then add the minimal Harness shared reasoning display module with a facade and focused tests (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/**, product-parts/core-runtime/clusters/session-runtime/cluster.md, product-parts/core-runtime/product-part.md, .harness/product-tree/**`; expected commit: `feat: add session reasoning display module`). Result: Completed in commit `feat: add session reasoning display module`.
4. [DONE] Git Commit: `feat: add session reasoning display module` (hash: self)

## Phase 3 - Session Wiring (owner: Codex, updated: 2026-06-28)

### Stream: Dialog Surface

5. [DONE] `harness-ai.phase3.stream1.task1` Wire provider reasoning/thinking events through the shared module into Core session messages for all providers using the common event path (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`; expected commit: `feat: show provider reasoning in sessions`). Result: Completed in commit `feat: show provider reasoning in sessions`.
6. [DONE] Git Commit: `feat: show provider reasoning in sessions` (hash: self)

## Phase 4 - Docs And Verification (owner: Codex, updated: 2026-06-28)

### Stream: Build And Evidence

7. [DONE] `harness-ai.phase4.stream1.task1` Update architecture/product-tree docs, run required checks, build, package the macOS app, and record verification evidence (scope: `docs/architecture/**, docs/evidence/**, .harness/product-tree/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify session reasoning display`). Result: Completed in commit `chore: verify session reasoning display`.
8. [DONE] Git Commit: `chore: verify session reasoning display` (hash: self)

## Phase 5 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

9. [DONE] `harness-ai.phase5.stream1.task1` User relaunches the packaged app and verifies provider reasoning is visible in session dialogs (scope: user workflow; expected commit: none). Result: User reported reasoning is still not visible and asked to port the reference provider-native reasoning flow instead of re-solving it locally.

## Phase 6 - Codex Reasoning Parity (owner: Codex, updated: 2026-06-28)

### Stream: Provider Adapter

10. [DONE] `harness-ai.phase6.stream1.task1` Port the minimal CodeAI-HUB Codex app-server reasoning summary path: request turn-level summaries and normalize live/final reasoning notifications into thinking dialog messages (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.ts, product-parts/provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.test.mjs`; docs: codex-provider `module.md`, provider-event-normalizer `module.md`; expected commit: `fix: enable codex reasoning summaries`). Result: Completed in commit `fix: enable codex reasoning summaries`.
11. [DONE] Git Commit: `fix: enable codex reasoning summaries` (hash: self)

## Phase 7 - Provider Reasoning Audit (owner: Codex, updated: 2026-06-28)

### Stream: Provider Adapter

12. [DONE] `harness-ai.phase7.stream1.task1` Compare the remaining Harness provider adapters against CodeAI-HUB reasoning emitters and port the next smallest provider-native reasoning path needed for visible thinking (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/session-provider-adapter-helpers.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/session-provider-adapter-helpers.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/module.md`; expected commit: `fix: port provider reasoning emitters`). Result: Completed in commit `fix: port provider reasoning emitters`.
13. [DONE] Git Commit: `fix: port provider reasoning emitters` (hash: self)

## Phase 8 - Rebuild And Retest (owner: Codex, updated: 2026-06-28)

### Stream: Verification

14. [DONE] `harness-ai.phase8.stream1.task1` Update docs/evidence, run gates, build, package macOS app, and hand off for user retest (scope: `docs/evidence/**, docs/architecture/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify provider reasoning parity`). Result: Completed in commit `chore: verify provider reasoning parity`.
15. [DONE] Git Commit: `chore: verify provider reasoning parity` (hash: self)

## Phase 9 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

16. [DONE] `harness-ai.phase9.stream1.task1` User relaunches the packaged app and verifies provider reasoning is visible in session dialogs (scope: user workflow; expected commit: none). Result: GLM Native and OpenRouter/Gemini reasoning appeared. Codex and Kimi still did not show reasoning. Claude did not appear to run from the workspace containing `CLAUDE.md` and did not show reasoning.

## Phase 10 - UI Authority Rule (owner: Codex, updated: 2026-06-28)

### Stream: Documentation

17. [DONE] `harness-ai.phase10.stream1.task1` Document that UI surfaces must never infer product truth, including reasoning/thinking classification (scope: `AGENTS.md, .harness/plans/todo-plan.md`; expected commit: `docs: clarify ui cannot infer product truth`). Result: Completed in commit `docs: clarify ui cannot infer product truth`.
18. [DONE] Git Commit: `docs: clarify ui cannot infer product truth` (hash: self)

## Phase 11 - Claude Workspace Context (owner: Codex, updated: 2026-06-28)

### Stream: Provider Adapter

19. [DONE] `harness-ai.phase11.stream1.task1` Run Claude CLI provider sessions from the active workspace path so Claude can load workspace files such as `CLAUDE.md` (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md`; expected commit: `fix: run claude sessions from workspace`). Result: Completed in commit `fix: run claude sessions from workspace`.
20. [DONE] Git Commit: `fix: run claude sessions from workspace` (hash: self)

## Phase 12 - Codex And Kimi Native Reasoning Repair (owner: Codex, updated: 2026-06-28)

### Stream: Provider Adapter

21. [DONE] `harness-ai.phase12.stream1.task1` Inspect the actual Codex/Kimi native event outputs from the latest retest, pass Core-owned Codex reasoning effort into `turn/start`, and normalize Kimi CLI `stream-json` thinking chunks from the workspace cwd (scope: `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/**, product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/**, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/**, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/**`; expected commit: `fix: restore codex and kimi thinking events`). Result: Completed in commit `fix: restore codex and kimi thinking events`.
22. [DONE] Git Commit: `fix: restore codex and kimi thinking events` (hash: self)

## Phase 13 - Rebuild And Retest (owner: Codex, updated: 2026-06-28)

### Stream: Verification

23. [IN_PROGRESS] `harness-ai.phase13.stream1.task1` Update evidence, run gates, build, package macOS app, and hand off for user retest (scope: `docs/evidence/**, .harness/plans/todo-plan.md`; expected commit: `chore: verify claude codex kimi reasoning repair`).
24. [TODO] Git Commit: `chore: verify claude codex kimi reasoning repair` (hash: TBD)

## Phase 14 - User Workflow Acceptance (owner: User, updated: 2026-06-28)

### Stream: Retest

25. [TODO] `harness-ai.phase14.stream1.task1` User relaunches the packaged app and verifies Claude workspace context plus Codex/Kimi reasoning display (scope: user workflow; expected commit: none).
