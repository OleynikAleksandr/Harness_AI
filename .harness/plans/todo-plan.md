# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "session-profiles-plan-document-2026-07-02",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** User request (chat, 2026-07-02) — runtime-selectable
  session profiles: per-provider system prompt + system tooling documents,
  loaded by Core at session start from user-editable files, with a virtual
  Native fallback profile. Full provider capability audit and all design
  decisions were agreed in chat on 2026-07-02 and are recorded in
  `docs/architecture/SessionProfiles.md` (this scope's deliverable).
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/SessionProfiles.md`
  - `docs/architecture/NextSessionMode.md`
  - `docs/architecture/CodeAIHubProviderRuntimeAlignment.md`
- **Scope shape:** this cycle delivers the planning document only. The
  implementation phases (cluster, contract, adapters, RPC) and the separately
  discussed UI surface will be planned as follow-up tasks in this plan (or a
  successor plan) only after the user approves the planning document.

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

## Phase 1 - Session Profiles Planning Document (owner: Codex, updated: 2026-07-02)

### Stream: Planning Document

1. [DONE] `harness-ai.phase1.stream1.task1` Write `docs/architecture/SessionProfiles.md` — the detailed planning document for runtime-selectable session profiles (audited provider capabilities with mechanisms per provider, profile model, `~/.harness-ai/Profiles/**` storage layout with `profile.yaml` passport + per-provider `system-prompt.md`/`tooling.yaml` pairs, tooling category vocabulary and applicability matrix, layered system prompt, Native semantics per provider, new Core `session-profiles` cluster with `profile-store`/`profile-catalog`/`profile-materializer` modules, session start contract over `NextSessionMode.managedProfileId`, adapter application strategies, MVP RPC surface, seed profiles, risks, and the implementation phase roadmap) and register it in `docs/DOCUMENTATION_INDEX.md`; bootstrap this plan in the same commit (scope: `docs/architecture/SessionProfiles.md` (new), `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(architecture): add session profiles planning document for runtime prompt and tooling profiles`). Result: Completed in commit `docs(architecture): add session profiles planning document for runtime prompt and tooling profiles`.
2. [DONE] Git Commit: `docs(architecture): add session profiles planning document for runtime prompt and tooling profiles` (hash: self)
3. [IN_PROGRESS] `harness-ai.phase1.stream1.task2` User reviews and approves `docs/architecture/SessionProfiles.md`; after approval the user separately discusses the UI surface, and only then implementation phases are added to the plan (scope: user workflow; expected commit: none).
4. [DONE] `harness-ai.phase1.stream1.task3` Review feedback from task2 (chat, 2026-07-02): rewrite `docs/architecture/SessionProfiles.md` in Russian so the user can read it, keeping file paths, code identifiers, API/option names, provider tool ids and YAML/tree examples in their original form (scope: `docs/architecture/SessionProfiles.md`; expected commit: `docs(architecture): translate session profiles planning document into Russian`). Result: Completed in commit `docs(architecture): translate session profiles planning document into Russian`.
5. [DONE] Git Commit: `docs(architecture): translate session profiles planning document into Russian` (hash: self)
6. [DONE] `harness-ai.phase1.stream1.task4` User review of task2 returned four findings (chat, 2026-07-02): rework `docs/architecture/SessionProfiles.md` — (1) immutable applied-profile snapshot captured at create, resume uses only the snapshot, legacy sessions without snapshot get an explicit no-payload migration contract; (2) Codex tooling categories become MVP no-op with the shared-app-server restart risk documented and a future per-profile process pool as the forward path; (3) GLM Native tool-contract ownership moves from the Core materializer to the GLM adapter profile application layer, keeping the Core payload provider-neutral; (4) explicit Native-default migration policy: `codeai-workflow` seed profile preserving today's managed behavior plus a dedicated breaking-change acceptance gate in the roadmap (scope: `docs/architecture/SessionProfiles.md`; expected commit: `docs(architecture): address session profiles review findings (resume snapshot, codex isolation, glm boundary, native migration)`). Result: Completed in commit `docs(architecture): address session profiles review findings (resume snapshot, codex isolation, glm boundary, native migration)`.
7. [DONE] Git Commit: `docs(architecture): address session profiles review findings (resume snapshot, codex isolation, glm boundary, native migration)` (hash: self)
8. [DONE] `harness-ai.phase1.stream1.task5` User clarification of the immutable snapshot contract (chat, 2026-07-02): the profile is applied exactly once at create; the applied profile snapshot covers the FULL applied contract — profileId, providerId, display name, the materialized system prompt including the Core/system wrapper added at start, effective tooling categories, provider-specific application details (Claude tool whitelist, Codex process/tooling profile key, Kimi agent artifact key/path, GLM tool schema ids) and hash/version; resume uses only the snapshot plus provider-native persisted session/thread state and never rereads `~/.harness-ai/Profiles/**` (provider-side thread/cache desync rationale recorded); changed instructions/tooling require a new session; the GLM Native consequence (system message rebuilt from the snapshot, not from live data) is stated explicitly; roadmap Phase B gets an explicit task for persistent snapshot storage/read-model as session identity/evidence (scope: `docs/architecture/SessionProfiles.md`; expected commit: `docs(architecture): snapshot the full applied profile contract including system wrapper and provider application details`). Result: Completed in commit `docs(architecture): snapshot the full applied profile contract including system wrapper and provider application details`.
9. [DONE] Git Commit: `docs(architecture): snapshot the full applied profile contract including system wrapper and provider application details` (hash: self)
