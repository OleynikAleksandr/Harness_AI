# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-cache-telemetry-2026-07-14",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream1.task2",
  "expectedCommitMessage": "feat: emit claude cache and sdk token usage",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-14 + research evidence
  `docs/evidence/claude-cache-telemetry-research-2026-07-14.md` — Claude SDK
  returns per-turn cache usage (`cache_read_input_tokens`,
  `cache_creation_input_tokens`) in `assistant`/`result` messages. Decision:
  (1) show TWO Tokens figures separated by a dash — first from the legacy
  `/context` scrape, second from SDK usage — to verify they match before
  retiring the legacy probe (retirement is a separate future scope, user
  decision); (2) add the Cache chip for Claude with Codex semantics: tokens
  READ from cache on the last API call.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/evidence/claude-cache-telemetry-research-2026-07-14.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md`
  - `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/module.md`

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
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.
- Scope boundaries: this scope touches only `claude-provider` messaging
  (`src/reference/messaging/**`) and the `usage-context-telemetry` module.
  The dual-figure Tokens display is a TEMPORARY diagnostic; the legacy
  `/context` probe is NOT removed in this scope. Codex modules, the
  `session-window` panel markup and Core contracts are NOT modified; any such
  change requires a new plan line first.
- SDK usage semantics (from the research evidence): dedupe assistant usage by
  `message.id`; context size = `input_tokens + cache_read_input_tokens +
  cache_creation_input_tokens` of the LAST API call; Cache chip value =
  `cache_read_input_tokens` of the LAST API call (Codex parity); a cache reset
  to 0 after tool/thinking changes is legitimate, not a defect.

## Phase 1 - Scope Bootstrap (owner: Codex, updated: 2026-07-14)

### Stream: Plan Fixation

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the scope: commit this active plan, the research evidence and its catalog entry (scope: `.harness/plans/todo-plan.md, docs/evidence/claude-cache-telemetry-research-2026-07-14.md, docs/DOCUMENTATION_INDEX.md`; expected commit: `plan: bootstrap claude cache telemetry scope`). Result: Completed in commit `plan: bootstrap claude cache telemetry scope`.
2. [DONE] Git Commit: `plan: bootstrap claude cache telemetry scope` (hash: self)

## Phase 2 - Claude SDK Usage Telemetry (owner: Codex, updated: 2026-07-14)

### Stream: Provider Usage Extraction

3. [DONE] `harness-ai.phase2.stream1.task1` Add an SDK usage tracker to claude-provider messaging: a new `claude-sdk-usage-tracker.ts` consumes `assistant`/`result` SDK messages already flowing through `dispatchMessage`, dedupes by `message.id`, and keeps a per-session snapshot of the last API call (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`) plus `contextWindow` from `result.modelUsage`; wire it into `message-processor.ts`; store the snapshot on a new `ActiveSession.sdkUsage` field (`session/types.ts`, mirroring the existing `sessionProfile` inline-type-import pattern) so Stream: Telemetry Display's task 2 can read it straight off the session object it already receives, without a passthrough method through `claude-message-finish-handler.ts` (out of both tasks' scope); cover with a module test and update the module doc (scope: `claude-provider/src/reference/messaging/claude-sdk-usage-tracker.ts, claude-provider/src/reference/messaging/message-processor.ts, claude-provider/src/reference/session/types.ts` + paired test + `claude-provider/module.md`; expected commit: `feat: track claude sdk usage per turn`). Result: Completed in commit `feat: track claude sdk usage per turn`.
4. [DONE] Git Commit: `feat: track claude sdk usage per turn` (hash: self)
5. [IN_PROGRESS] `harness-ai.phase2.stream1.task2` Enrich Claude token events from the tracker snapshot: extend `TokenUsageSnapshot` and the emitted `token_usage` stream event and `turn_completed` payload with `cached` (= last-call `cache_read_input_tokens`, Codex parity) and `sdkUsed` (= last-call `input + cache_read + cache_creation`), keeping the legacy `/context` `used`/`limit` untouched; update tests and the module doc (scope: `claude-provider/src/reference/messaging/claude-token-usage-sync.ts, claude-provider/src/reference/messaging/claude-usage-sync.ts` + paired tests + `claude-provider/module.md`; expected commit: `feat: emit claude cache and sdk token usage`).
6. [TODO] Git Commit: `feat: emit claude cache and sdk token usage` (hash: TBD)

### Stream: Telemetry Display

7. [TODO] `harness-ai.phase2.stream2.task1` Show the dual Tokens figure in usage-context-telemetry: read the optional `sdkUsed` field, render the Tokens value as `"<legacy> - <sdk> (<percent>%)"` (dash-separated; percent still from the legacy figure) when `sdkUsed` is present, keep the single-figure format otherwise, and verify the existing `cached` path shows the Cache chip for Claude events; update the facade test and module doc (scope: `usage-context-telemetry/src/usage-context-telemetry-facade.ts` + paired `usage-context-telemetry-facade.test.mjs` + `usage-context-telemetry/module.md`; expected commit: `feat: show dual claude token figures and cache chip`).
8. [TODO] Git Commit: `feat: show dual claude token figures and cache chip` (hash: TBD)

## Phase 3 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-14)

### Stream: Package And Retest

9. [TODO] `harness-ai.phase3.stream1.task1` Package the app for user verification (`npm run package:mac`, allowed by this plan) and record evidence (scope: `docs/evidence/**, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `chore: package claude cache telemetry build`).
10. [TODO] Git Commit: `chore: package claude cache telemetry build` (hash: TBD)
11. [TODO] `harness-ai.phase3.stream1.task2` User retests in the packaged app: Claude status panel shows two dash-separated Tokens figures (legacy vs SDK) and the Cache chip with cache-read tokens; the user compares the figures across real turns to decide (in a future scope) whether the legacy `/context` probe can be retired (scope: user workflow; expected commit: none).
