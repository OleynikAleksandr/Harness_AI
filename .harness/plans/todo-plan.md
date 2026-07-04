# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "universal-client-2026-07-04",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task2",
  "expectedCommitMessage": "docs(architecture): universal client capability set and oss foundation research",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user decision package (2026-07-04), recorded in the
  archived plan `.harness/plans/archive/session-profiles-v2-plan-document-2026-07-02.md`
  (Phase 7 DECISIONS block) and summarized below.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/DOCUMENTATION_INDEX.md`
  - `.harness/product-tree/product-tree.md`
  - `docs/architecture/NativePromptComposition.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `.harness/plans/archive/session-profiles-v2-plan-document-2026-07-02.md`
    (Phase 7 DECISIONS block only)
- Keep the context pack short. Use `docs/DOCUMENTATION_INDEX.md` to choose the
  few documents relevant to this scope; do not paste a full Markdown inventory
  into every plan.

## Scope Summary (decision package 2026-07-04)

- **In-house UNIVERSAL CLIENT** for OpenAI-shape providers: one Core-owned
  client core (agent loop, tool execution, SSE streaming, permissions) + thin
  provider endpoint modules for Kimi, GLM, Local Models (new provider),
  OpenRouter (new provider), and any future OpenAI-shape vendor. NOT built on
  OpenCode: rejected for double dependency (providers AND the OpenCode
  roadmap), redundancy, and foreign-engine "Codex moments". OpenCode is the
  SECOND reference project (MIT; behavior is ported, code is never copied);
  CodeAI-Hub remains the first.
- **Order: Kimi FIRST on the client core.** The Kimi auth gate (does
  `api.kimi.com/coding/v1` accept the subscription `api_key` from OUR client;
  key lifetime; 5h/weekly limit reporting) is the first implementation-phase
  check. Kimi access channel = Kimi Code SUBSCRIPTION only; provider help
  documents the single key path.
- **Key-only onboarding for the client four:** paste an API key (Local Models
  = base URL), nothing is downloaded or installed; keys live in Core settings.
- **GLM migration:** GLM keeps running on the embedded OpenCode runtime until
  the universal client is ready, then migrates onto it and the embedded
  OpenCode runtime is removed.
- **Synthetic Native everywhere:** Claude/Codex keep their native channels
  (Agent SDK / app-server) with frozen wrappers from the accepted capture
  dumps; the client four get OUR reference wrapper + the client's tool set.
  The Claude/Codex synthetic-native application and the profile store are
  planned in this scope AFTER the research task settles the client shape.
- Open items carried from the archived scope: native profile storage layout,
  "Update Native Profile" mechanism specifics, Claude `# Memory` ballast
  (decided at wrapper authoring), kimi-provider module afterlife.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub and OpenCode may be read as reference material, but modules are not copied wholesale.
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

## Phase 1 - Client Research (owner: Codex + User, updated: 2026-07-04)

### Stream: Capability Set And OSS Foundation

> Further phases (Kimi endpoint + auth gate, client core implementation, GLM
> migration, Local Models / OpenRouter providers, profile store and synthetic
> native application, packaging + acceptance) are laid out with the user ONLY
> after the research task below lands and its decisions are signed off.

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the universal-client scope plan (plan-only, closes with this same commit): carry the 2026-07-04 decision package from the archived plan into this scope (Context Pack + Scope Summary) and lay out the Phase 1 research task ordered by the user (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): bootstrap universal client scope`). Result: Completed in commit `docs(plan): bootstrap universal client scope`.
2. [DONE] Git Commit: `docs(plan): bootstrap universal client scope` (hash: self)
3. [IN_PROGRESS] `harness-ai.phase1.stream1.task2` Research (user order, 2026-07-04): decide (a) the capability/parameter set our universal client must have — agent loop, MVP tool set and tool execution semantics, request parameters, streaming/SSE handling, permissions model, key-based auth, model catalog, context/limit handling (compaction deferred or not), event normalization into Harness provider events — and (b) which open-source projects we take as the foundation/reference so we do not re-develop what others already solved: survey candidates (OpenCode — established second reference; plus e.g. Cline, Goose, Aider, Continue, gptme and similar agent clients) for architecture, tool implementations, provider dialect handling and licensing; deliverable is a new architecture document with the capability set, the OSS survey table, a recommendation and the recorded user decision (scope: `docs/architecture/UniversalClient.md` (new), `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(architecture): universal client capability set and oss foundation research`).
4. [TODO] Git Commit: `docs(architecture): universal client capability set and oss foundation research` (hash: TBD)
