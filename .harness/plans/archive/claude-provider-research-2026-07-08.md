# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-provider-research-2026-07-08",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request, 2026-07-08: start a new Claude provider
  research scope after closing the Codex/CodexUC scope.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `docs/architecture/NativePromptComposition.md`
  - `docs/architecture/ProfileCompilationAndBenchmarking.md`
  - `docs/architecture/UniversalClient.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`

### Codex/CodexUC Findings To Carry Into Claude Research

These are the required links from the closed Codex/CodexUC scope. Read them
before drawing conclusions about Claude:

- `docs/architecture/CodexManagedPromptToolingEconomics.md` — task-specific
  control of system prompt and system tooling materially reduced token/cache
  footprint without observed completion-quality loss in the Electron benchmark.
- `docs/architecture/ProfileCompilationAndBenchmarking.md` — managed profile
  compilation, prompt/tool bundles, benchmark parity profiles and lean profiles.
- `docs/architecture/UniversalClient.md` — universal-client boundary and the
  rule that provider-specific adapters own tool-loop/event normalization for
  custom/direct clients.
- `docs/architecture/SessionProfiles.md` — live Codex app-server vs CodexUC
  profile/tooling/phase contracts, including provider namespace boundaries,
  native-bundle sidecars and CodexUC adapter-owned phase protocol.
- `docs/architecture/CodexCacheAnchorThread.md` — Codex cache-anchor and
  rollback inspection findings; useful as the comparison model for any Claude
  cache/context/resume research.
- `docs/evidence/codex-app-server-cache-anchor-package-2026-07-08.md` — accepted
  retest proving the app-server cache timing fix and second-turn cache anchor.
- `docs/evidence/codex-uc-custom-tool-call-package-2026-07-08.md` — packaged
  evidence for CodexUC native `custom_tool_call` loop execution.
- `docs/evidence/codex-uc-phase-protocol-retest-2026-07-08.md` — accepted
  retest showing commentary/final phase protocol must be adapter-owned when the
  upstream route lacks an app-server-style terminal phase.
- `.harness/plans/archive/codex-uc-reasoning-effort-2026-07-07.md` — full
  archived Codex/CodexUC scope with the chronological decisions, retests and
  closure notes.

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
  `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or
  starting a fresh empty plan — it may only suggest it and wait for the user's
  direct order.
- Verification/package builds for the current implementation scope are allowed
  when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and
  push (`.husky/pre-push`); plans never include a separate phase or task just
  to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Claude Provider Research (owner: Codex, updated: 2026-07-08)

### Stream: Native Surface And Managed Profile Control

1. [DONE] `harness-ai.phase1.stream1.task1` Research the Claude provider path as the next comparison target after Codex/CodexUC: inspect the current Harness Claude adapter contract, existing Claude architecture/evidence docs, CodeAI-Hub reference notes where needed, and the known Claude Agent SDK/native capture behavior; produce a first architecture note that identifies what Harness can control for Claude system prompt, tool inventory, settings sources, memory/context ballast, phase/event semantics, cache/context/resume behavior and benchmark design, explicitly comparing each point with the Codex/CodexUC findings linked above. (scope: `docs/architecture/ClaudeProviderResearch.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(claude): start provider research`). Result: Completed in commit `docs(claude): start provider research`.
2. [DONE] Git Commit: `docs(claude): start provider research` (hash: self)

## Phase 2 - Claude Electron Benchmark Setup (owner: Codex, updated: 2026-07-08)

### Stream: Workspace Fixtures And Minimal Profile Brief

3. [DONE] `harness-ai.phase2.stream1.task1` Prepare the two Claude Electron benchmark workspaces and write the experiment brief for the agent that will build the Claude minimal profile: seed `/Users/oleksandroliinyk/VSCODE/Test_Claude_full/` and `/Users/oleksandroliinyk/VSCODE/Test_Claude_min/` with the same initial task fixtures, document the full-vs-min comparison, specify the minimal Claude profile requirements using the CodexUC lean Electron benchmark profile as source material, and record the exact first prompt to use in both sessions. (scope: `docs/evidence/claude-electron-profile-economics-experiment-2026-07-08.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`, external workspace files under `/Users/oleksandroliinyk/VSCODE/Test_Claude_full/**` and `/Users/oleksandroliinyk/VSCODE/Test_Claude_min/**`; expected commit: `docs(claude): prepare electron benchmark experiment`). Result: Completed in commit `docs(claude): prepare electron benchmark experiment`.
4. [DONE] Git Commit: `docs(claude): prepare electron benchmark experiment` (hash: self)
