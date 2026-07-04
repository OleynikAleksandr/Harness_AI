# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "universal-client-2026-07-04",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase2.stream2.task2",
  "expectedCommitMessage": "feat(universal-client): consolidated sse and dialect streaming",
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
3. [DONE] `harness-ai.phase1.stream1.task2` Research (user order, 2026-07-04) for OUR OWN universal client — our own client for every provider except Claude and Codex (Kimi, GLM, Local Models, OpenRouter, future OpenAI-shape vendors), built by taking foreign OSS projects as the base/reference (OpenCode and the others found by the survey) so we do not re-develop what they already solved. FLEXIBILITY BAR (user requirement 2026-07-04): parity with the "grown-up" clients — the client must be able to connect MCP servers, understand skills, spawn subagents, plan mode, etc., like Codex and Claude Code; extensibility is designed into the CORE from day one (tool registry + MCP/skill/subagent hosts as first-class concepts, not a hardcoded fixed tool set), even if layers ship in stages. The OSS foundations are studied for THEIR extensibility architecture too, and existing Harness Core capabilities (MCP/skills/orchestration) are mapped so the client reuses rather than duplicates. Decide and record WITH THE USER: (a) the client capability/parameter set — agent loop, tool registry and execution semantics, extensibility (MCP host, skills, subagents), request parameters and per-provider dialect profiles, SSE streaming and thinking normalization, permissions model, key-based auth (per-provider key), model catalog, context/limit handling, event normalization into Harness provider events; (b) the OSS foundation roles — the survey table with licenses, which project is the CODE base, which are behavior/extensibility/targeted references. Deliverable: `docs/architecture/UniversalClient.md` with the capability set, the survey, the recommendation and the RECORDED USER DECISION in its section 6 — the task does not close and the commit does not happen while section 6 is PENDING (scope: `docs/architecture/UniversalClient.md` (new), `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(architecture): universal client capability set and oss foundation research`). Result: Completed in commit `docs(architecture): universal client capability set and oss foundation research`. Result clarification (2026-07-04, plan review): the FLEXIBILITY-BAR wording in this task line ("MCP/skill/subagent hosts as first-class concepts") was NARROWED by the accepted section-6 decision — MVP reserves EXTENSION BOUNDARIES only (tool-registry source abstraction + a reserved registration point); MCP/skills/subagents are FUTURE MODULES, not MVP hosts (see the Phase 2 scope contract and `UniversalClient.md` sections 3.10 / 6).
4. [DONE] Git Commit: `docs(architecture): universal client capability set and oss foundation research` (hash: self)

## Phase 2 - Universal Client Core And Kimi (owner: Codex + User, updated: 2026-07-04)

> Scope contract: the client CORE lives in a new Core-Runtime cluster
> `universal-client` (agent loop, tool registry, built-in tool executors,
> SSE+dialect streaming, event normalization — Core Authority, doc section
> 3.11); the KIMI endpoint is a thin Provider-Runtime module on top of the
> core. The core is a CONSOLIDATION of the ported reference runtime
> (openrouter/glm-native/local-models `src/reference/**`, ~9.2k lines with
> heavy duplication), not a from-scratch build. MVP contract: full-auto
> permissions (no ask/sandbox), no MCP/skills/subagents (extension points
> only), no tool progress in UI, compaction deferred — per
> `docs/architecture/UniversalClient.md` section 6. Module/file names below
> are PROPOSALS for the user's review; exact file splits are finalized at
> each task's start under the 500-line and ≤3-functional-files rules.
>
> Terminology note (user clarification 2026-07-04): "event normalization"
> here means mapping the PROVIDER OUTPUT stream (SSE chunks) into the existing
> `NormalizedProviderEvent` contract for display — a mechanical output→event
> mapping, NOT an agent and NOT any processing of the user's INPUT prompt. A
> user-INPUT normalization agent (a cheap agent that compacts the user request
> into a machine-readable form, may ask the user clarifying questions, and may
> even pick the session profile) is a SEPARATE future concept, OUT OF this
> client's scope — recorded here only so the two are never conflated.

### Stream: Implementation Plan Breakdown (this task)

5. [DONE] `harness-ai.phase2.stream1.task1` Break down the universal-client implementation phases into microtasks per the approved structure and give them to the user for review before execution starts (plan-only): Phase 2 (core + Kimi) as detailed microtasks below, Phases 3-5 as milestones refined on approach (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): break down universal client implementation phases`). Result: Completed in commit `docs(plan): break down universal client implementation phases`.
6. [DONE] Git Commit: `docs(plan): break down universal client implementation phases` (hash: self)

### Stream: Client Core Consolidation (Core-Runtime cluster `universal-client`)

7. [DONE] `harness-ai.phase2.stream2.task1` Bootstrap the `universal-client` cluster and its `client-contract` module: register cluster/module in the product tree, add `cluster.md` + `module.md`, and define the client contract types — `ClientTurnRequest`, `ToolDescriptor` (name + JSON Schema + executor ref), `ToolSource` (built-in now; MCP/skill later), `DialectProfile`, `ClientTurnEvent` — with a unit test (bootstrap touches >3 files, plan allows) (scope: `.harness/product-tree/product-tree.json`, `.harness/product-tree/product-tree.md`, `product-parts/core-runtime/clusters/universal-client/cluster.md`, `product-parts/core-runtime/clusters/universal-client/modules/client-contract/module.md`, `.../client-contract/src/client-contract-facade.ts`, `.../client-contract/src/client-contract.test.mjs`; expected commit: `feat(universal-client): bootstrap cluster and client contract`). Result: Completed in commit `feat(universal-client): bootstrap cluster and client contract`.
8. [DONE] Git Commit: `feat(universal-client): bootstrap cluster and client contract` (hash: self)
9. [IN_PROGRESS] `harness-ai.phase2.stream2.task2` Add the `dialect-streaming` module: consolidate the three reference SSE readers (`open-router-sse-reader`, `glm-native-sse-parser`, `local-models-sse-reader`) into one core SSE parser (data-frames, `[DONE]`, delta.content + thinking + tool_calls accumulation by index, usage from any chunk) plus the declarative `DialectProfile` capability model and the four-thinking-forms normalization; unit test (scope: `.../modules/dialect-streaming/module.md`, `.../dialect-streaming/src/dialect-streaming-facade.ts`, `.../dialect-streaming/src/dialect-streaming.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): consolidated sse and dialect streaming`).
10. [TODO] Git Commit: `feat(universal-client): consolidated sse and dialect streaming` (hash: TBD)
11. [TODO] `harness-ai.phase2.stream2.task3` Add the `tool-registry` module: registry with a source abstraction (built-in source now, MCP/skill registration point reserved), tool-descriptor schema, namespacing, and a pass-through permission boundary (MVP full-auto, no ruleset); unit test (scope: `.../modules/tool-registry/module.md`, `.../tool-registry/src/tool-registry-facade.ts`, `.../tool-registry/src/tool-registry.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): tool registry with source abstraction`).
12. [TODO] Git Commit: `feat(universal-client): tool registry with source abstraction` (hash: TBD)
13. [TODO] `harness-ai.phase2.stream2.task4` Add the `builtin-tools` module, part 1 (file + exec + search): consolidate `read_file`/`write_file`/`edit_file`/`apply_patch`/`exec_command`/`grep_files`/`glob_files` from the reference `glm-native-tool-executors` + patch/file-edit executors, with workspace-path validation and output limits; register descriptors into the registry; unit test (plan allows the consolidation file-count) (scope: `.../modules/builtin-tools/module.md`, `.../builtin-tools/src/builtin-tools-file-exec-search.ts`, `.../builtin-tools/src/builtin-tools.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): built-in file, exec and search tools`).
14. [TODO] Git Commit: `feat(universal-client): built-in file, exec and search tools` (hash: TBD)
15. [TODO] `harness-ai.phase2.stream2.task5` Add `builtin-tools` part 2 (web + output truncation): `web_search`/`web_fetch` with `max_chars`, and shared output truncation (`truncated` marker + on-disk full-output pointer, OpenCode pattern); update the module doc; unit test (scope: `.../builtin-tools/src/builtin-tools-web.ts`, `.../builtin-tools/src/builtin-tools-truncate.ts`, `.../builtin-tools/src/builtin-tools.test.mjs`, `.../modules/builtin-tools/module.md`; expected commit: `feat(universal-client): built-in web tools and output truncation`).
16. [TODO] Git Commit: `feat(universal-client): built-in web tools and output truncation` (hash: TBD)
17. [TODO] `harness-ai.phase2.stream2.task6` Add the `client-core` module (agent loop): turn cycle (request → SSE stream → tool execution → follow-up with `role:"tool"` → repeat until no tool_calls), parallel tool_calls, Core-owned in-session history, doom-loop detection (3 identical calls), retries with backoff + Retry-After (retry 429/5xx, not overflow/auth), AbortController cancel, full-auto execution; unit test (scope: `.../modules/client-core/module.md`, `.../client-core/src/client-core-facade.ts`, `.../client-core/src/client-core.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): agent loop with retries and doom-loop`).
18. [TODO] Git Commit: `feat(universal-client): agent loop with retries and doom-loop` (hash: TBD)
19. [TODO] `harness-ai.phase2.stream2.task7` Emit provider OUTPUT events (mechanical stream→contract mapping, NOT user-input normalization — see the terminology note): map the provider output stream into the existing `NormalizedProviderEvent` contract from the core (`turn_started` → `dialog_message` live/thinking → `turn_completed`/`turn_failed`, `stream_error`), map the error taxonomy (`auth_failed`/`rate_limited`/`quota_exhausted`/`context_overflow`/`network`/`provider_error`/`aborted`), no tool-progress events; unit test (scope: `.../client-core/src/client-core-events.ts`, `.../client-core/src/client-core.test.mjs`, `.../client-core/module.md`; expected commit: `feat(universal-client): emit provider output events`).
20. [TODO] Git Commit: `feat(universal-client): emit provider output events` (hash: TBD)

### Stream: Kimi Endpoint And Live Acceptance (Provider-Runtime)

> Kimi rollout / migration decision (Phase 2, PROPOSED for user review): the
> new `kimi-client-provider` becomes the SINGLE visible `kimi` provider in
> Settings and Start New Session. During development it stays INTERNAL/hidden
> (the live ACP `kimi-provider` keeps serving) until the visibility-switch task
> (task5), which flips the visible `kimi` to the client endpoint and REMOVES
> the ACP `kimi-provider` from the provider picker — its code stays in the
> tree, no new ACP sessions start. NEVER two Kimi entries at once. Full
> retirement/removal of the ACP `kimi-provider` module is the Phase 5
> "afterlife" open item, not Phase 2.

21. [TODO] `harness-ai.phase2.stream3.task1` Add the `kimi-client-provider` module: a thin Provider-Runtime endpoint on the universal-client core — base_url `api.kimi.com/coding/v1`, subscription-key auth from Core settings, Kimi `DialectProfile` (reasoning_content thinking, tool_choice behavior), model `kimi-for-coding`; facade delegates the turn to `client-core`; unit test (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/module.md`, `.../kimi-client-provider/src/kimi-client-provider-facade.ts`, `.../kimi-client-provider/src/kimi-client-provider.test.mjs`, product-tree json+md; expected commit: `feat(kimi-client-provider): kimi endpoint on universal client`).
22. [TODO] Git Commit: `feat(kimi-client-provider): kimi endpoint on universal client` (hash: TBD)
23. [TODO] `harness-ai.phase2.stream3.task2` Bind the Kimi client provider descriptor + registry, kept INTERNAL/hidden: add the `kimi-for-coding` descriptor and bind the provider in the registry but NOT in the visible picker yet (live ACP Kimi keeps serving during development); update module docs (scope: provider-descriptor facade + `module.md`, provider-registry facade + `module.md`; expected commit: `feat(core-runtime): bind kimi client provider descriptor (internal)`).
24. [TODO] Git Commit: `feat(core-runtime): bind kimi client provider descriptor (internal)` (hash: TBD)
25. [TODO] `harness-ai.phase2.stream3.task3` Add Kimi client key storage + help/localization: subscription-key settings entry for the client Kimi and the provider-help strings (where to get the Kimi For Coding key) through the localization runtime (scope: settings/auth-store facade + `module.md`, `localization-runtime` source-dictionaries + `module.md`; expected commit: `feat(core-runtime): kimi client key storage and help`).
26. [TODO] Git Commit: `feat(core-runtime): kimi client key storage and help` (hash: TBD)
27. [TODO] `harness-ai.phase2.stream3.task4` Wire Core session routing / adapter construction for the Kimi client provider: Core session start constructs the `kimi-client-provider` facade and routes turns/events; add the Electron bridge/preload channel only if the renderer needs a new one (scope: core session routing facade + `module.md`, electron bridge/preload only if required (≤3 functional files); expected commit: `feat(core-runtime): route sessions to kimi universal client`).
28. [TODO] Git Commit: `feat(core-runtime): route sessions to kimi universal client` (hash: TBD)
29. [TODO] `harness-ai.phase2.stream3.task5` Visibility switch (migration applied): make the visible `kimi` provider in Settings/Start New Session resolve to the client endpoint and REMOVE the ACP `kimi-provider` from the visible picker (ACP code retained, no new ACP sessions); update descriptor visibility + affected docs (scope: provider-descriptor/registry visibility + affected `module.md` (≤3 functional files); expected commit: `feat(core-runtime): switch visible kimi to universal client`).
30. [TODO] Git Commit: `feat(core-runtime): switch visible kimi to universal client` (hash: TBD)
31. [TODO] `harness-ai.phase2.stream3.task6` Package the app so the user can run the live auth-gate validation of task7 (`npm run package:mac`, user-confirmed); record the package evidence (scope: `docs/evidence/universal-client-kimi-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with universal client kimi`).
32. [TODO] Git Commit: `chore(package): rebuild packaged app with universal client kimi` (hash: TBD)
33. [TODO] `harness-ai.phase2.stream3.task7` User runs a live Kimi session on the packaged universal client (task6 build) and validates the auth-gate acceptance checklist (endpoint/base URL, headers, model id, streaming text, tool_calls, reasoning/thinking, usage/limit reporting, error-body behavior on quota/auth failure); confirms the client is usable (scope: user workflow; expected commit: none).
34. [TODO] `harness-ai.phase2.stream3.task8` Record the Kimi auth-gate EVIDENCE as a tracked recovery artifact from the task7 live run: `docs/evidence/universal-client-kimi-auth-gate-YYYY-MM-DD.md` capturing endpoint/base URL, headers shape, model id, streaming text, tool_calls, thinking/reasoning behavior, usage/limits, and auth/quota error bodies (scope: `docs/evidence/universal-client-kimi-auth-gate-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record kimi auth-gate results`).
35. [TODO] Git Commit: `docs(evidence): record kimi auth-gate results` (hash: TBD)

## Phase 3 - GLM Migration (milestones, refined on approach; owner: Codex + User)

> Detailed microtasks are laid out with the user when Phase 2 lands. Milestones:
> (a) `glm-client-provider` endpoint module on the core (GLM DialectProfile:
> thinking/reasoning_effort/tool_stream, Z.ai base_url `api.z.ai/api/coding/paas/v4`);
> (b) switch live GLM from the embedded OpenCode runtime to the universal client;
> (c) remove the embedded OpenCode runtime (`glm-opencode-provider`) and the
> `@opencode-ai/sdk` dependency; (d) package + user acceptance.

## Phase 4 - Local Models And OpenRouter Providers (milestones; owner: Codex + User)

> Milestones: (a) `local-models-client-provider` endpoint (base-URL onboarding,
> `/v1/models`, context-length detection Ollama/LM Studio/llama.cpp, no-auth);
> (b) `openrouter-client-provider` endpoint (key, `/api/v1/models`,
> reasoning_details, usage-always); (c) Settings UI + provider help for both
> (key / base URL, per Core localization); (d) package + user acceptance.

## Phase 5 - Synthetic Native Profiles (milestones; owner: Codex + User)

> Milestones: (a) native profile store for the client four (our reference
> wrapper + client tool set, B2 model) read via the same parser as managed;
> (b) apply the profile in each endpoint module (systemPrompt from the frozen
> wrapper + live-context generator); (c) Claude/Codex synthetic native from the
> accepted capture dumps + the "Update Native Profile" command/UI; (d) shared
> live-context generator; (e) package + user acceptance. Carries the archived
> open items (profile storage layout, Update-Native mechanism, Claude `# Memory`
> ballast, kimi-provider ACP module afterlife).
