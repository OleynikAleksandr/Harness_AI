# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "universal-client-2026-07-04",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": null,
  "expectedCommitMessage": null,
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
  - `docs/architecture/UniversalClient.md` (the client: capability set, OSS
    foundation roles, user decisions)
  - `docs/architecture/NativePromptComposition.md`
  - `docs/architecture/SessionProfilesV2.md`
  - `.harness/plans/archive/session-profiles-v2-plan-document-2026-07-02.md`
    (Phase 7 DECISIONS block only)
- Keep the context pack short. Use `docs/DOCUMENTATION_INDEX.md` to choose the
  few documents relevant to this scope; do not paste a full Markdown inventory
  into every plan.

## Scope Summary (decision package 2026-07-04)

- **In-house UNIVERSAL CLIENT — our OWN client for EVERY provider except
  Claude and Codex** (those two keep their native vendor channels: Claude
  Agent SDK / Codex app-server). The client four today: Kimi, GLM, Local
  Models (new provider), OpenRouter (new provider); any future OpenAI-shape
  vendor joins as a thin endpoint module on the same core. We write ONE
  Core-owned client core (agent loop, tool execution, SSE streaming,
  permissions, event normalization) and take FOREIGN OSS PROJECTS AS THE
  BASE/REFERENCE — OpenCode (MIT, the second reference project) and the
  others surveyed by the Phase 1 research — so we do not re-develop what
  they already solved. Architecture document of the client:
  `docs/architecture/UniversalClient.md`. Embedding OpenCode as the runtime
  core was REJECTED: double dependency (providers AND the OpenCode roadmap),
  redundancy, foreign-engine "Codex moments"; behavior is ported, code is
  never copied. CodeAI-Hub remains the first reference project.
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

> Discovery (2026-07-04, research session — COMPLETE, decisions recorded):
> the task2 deliverable `docs/architecture/UniversalClient.md` is written and
> registered in `docs/DOCUMENTATION_INDEX.md`; its section 6 is now ACCEPTED
> (7 recorded decisions), refined via a document review from another agent.
> The doc is ready to commit; the only remaining step of task2 is the commit
> itself (`npm run plan:commit -- "docs(architecture): universal client
> capability set and oss foundation research"`), pending the user's go.
> Recorded decisions (section 6): (1) foundation — our ported CodeAI-Hub
> runtime = code base, OpenCode = behavior/extensibility reference (its
> Vercel-AI-SDK RUNTIME dependency rejected; its protocol/dialect code studied
> only as reference — we write our own thin SSE+dialect layer), pi/Continue-
> adapters/Cline/Codex/Goose/kimi-cli = targeted; (2) Kimi first; (3) modular
> extensibility as a BOUNDARY only — MCP/skills/subagents are future modules,
> not built or designed in MVP; (4) permissions MVP = FULL AUTO / pass-through
> (no ask/allow-deny/sandbox/approval UI — one-turn coding unusable without
> auto); (5) compaction deferred; (6) Kimi endpoint accepted as proven (works
> in OpenCode by API key, user-verified — the earlier UA-allowlist risk was
> WRONG and removed), first task lifts/validates the wire form against an
> acceptance checklist; (7) tool progress NOT in MVP. Key findings: code
> foundation already in the repo (CodeAI-Hub runtime in openrouter/local-
> models/glm-native `src/reference/**`), so the core is a consolidation, not
> from-scratch; Harness has NO MCP/skills/subagents today (client only makes
> its ARCHITECTURE ready to add them later as modules); the client reuses Core
> contracts (profiles, event stream, telemetry, adapter contract, auth store,
> provider registry). NEXT STEP: commit task2, then lay out the implementation
> phases (Kimi first).

1. [DONE] `harness-ai.phase1.stream1.task1` Bootstrap the universal-client scope plan (plan-only, closes with this same commit): carry the 2026-07-04 decision package from the archived plan into this scope (Context Pack + Scope Summary) and lay out the Phase 1 research task ordered by the user (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): bootstrap universal client scope`). Result: Completed in commit `docs(plan): bootstrap universal client scope`.
2. [DONE] Git Commit: `docs(plan): bootstrap universal client scope` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task2` Research (user order, 2026-07-04) for OUR OWN universal client — our own client for every provider except Claude and Codex (Kimi, GLM, Local Models, OpenRouter, future OpenAI-shape vendors), built by taking foreign OSS projects as the base/reference (OpenCode and the others found by the survey) so we do not re-develop what they already solved. FLEXIBILITY BAR (user requirement 2026-07-04): parity with the "grown-up" clients — the client must be able to connect MCP servers, understand skills, spawn subagents, plan mode, etc., like Codex and Claude Code; extensibility is designed into the CORE from day one (tool registry + MCP/skill/subagent hosts as first-class concepts, not a hardcoded fixed tool set), even if layers ship in stages. The OSS foundations are studied for THEIR extensibility architecture too, and existing Harness Core capabilities (MCP/skills/orchestration) are mapped so the client reuses rather than duplicates. Decide and record WITH THE USER: (a) the client capability/parameter set — agent loop, tool registry and execution semantics, extensibility (MCP host, skills, subagents), request parameters and per-provider dialect profiles, SSE streaming and thinking normalization, permissions model, key-based auth (per-provider key), model catalog, context/limit handling, event normalization into Harness provider events; (b) the OSS foundation roles — the survey table with licenses, which project is the CODE base, which are behavior/extensibility/targeted references. Deliverable: `docs/architecture/UniversalClient.md` with the capability set, the survey, the recommendation and the RECORDED USER DECISION in its section 6 — the task does not close and the commit does not happen while section 6 is PENDING (scope: `docs/architecture/UniversalClient.md` (new), `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(architecture): universal client capability set and oss foundation research`). Result: Completed in commit `docs(architecture): universal client capability set and oss foundation research`.
4. [DONE] Git Commit: `docs(architecture): universal client capability set and oss foundation research` (hash: self)
