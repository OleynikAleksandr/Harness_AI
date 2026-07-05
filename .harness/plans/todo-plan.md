# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "universal-client-2026-07-04",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase4.stream3.task2",
  "expectedCommitMessage": "feat(universal-client): return reasoning details through turn history",
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
- **NO session continuity across updates (user decision 2026-07-04):** the
  app is in development, not in production use; the user kills all sessions
  on every update. Provider migrations, visibility switches and module
  removals must NOT build or keep extra machinery to serve pre-existing
  sessions of old channels; afterlife removals (ACP kimi, glm-native) may
  drop old-session compatibility freely.

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
9. [DONE] `harness-ai.phase2.stream2.task2` Add the `dialect-streaming` module: consolidate the three reference SSE readers (`open-router-sse-reader`, `glm-native-sse-parser`, `local-models-sse-reader`) into one core SSE parser (data-frames, `[DONE]`, delta.content + thinking + tool_calls accumulation by index, usage from any chunk) plus the declarative `DialectProfile` capability model and the four-thinking-forms normalization; unit test (scope: `.../modules/dialect-streaming/module.md`, `.../dialect-streaming/src/dialect-streaming-facade.ts`, `.../dialect-streaming/src/dialect-streaming.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): consolidated sse and dialect streaming`). Result: Completed in commit `feat(universal-client): consolidated sse and dialect streaming`.
10. [DONE] Git Commit: `feat(universal-client): consolidated sse and dialect streaming` (hash: self)
11. [DONE] `harness-ai.phase2.stream2.task3` Add the `tool-registry` module: registry with a source abstraction (built-in source now, MCP/skill registration point reserved), tool-descriptor schema, namespacing, and a pass-through permission boundary (MVP full-auto, no ruleset); unit test (scope: `.../modules/tool-registry/module.md`, `.../tool-registry/src/tool-registry-facade.ts`, `.../tool-registry/src/tool-registry.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): tool registry with source abstraction`). Result: Completed in commit `feat(universal-client): tool registry with source abstraction`.
12. [DONE] Git Commit: `feat(universal-client): tool registry with source abstraction` (hash: self)
13. [DONE] `harness-ai.phase2.stream2.task4` Add the `builtin-tools` module, part 1 (file + exec + search): consolidate `read_file`/`write_file`/`edit_file`/`apply_patch`/`exec_command`/`grep_files`/`glob_files` from the reference `glm-native-tool-executors` + patch/file-edit executors, with workspace-path validation and output limits; register descriptors into the registry; unit test (plan allows the consolidation file-count) (scope: `.../modules/builtin-tools/module.md`, `.../builtin-tools/src/builtin-tools-file-exec-search.ts`, `.../builtin-tools/src/builtin-tools.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): built-in file, exec and search tools`). Result: Completed in commit `feat(universal-client): built-in file, exec and search tools`.
14. [DONE] Git Commit: `feat(universal-client): built-in file, exec and search tools` (hash: self)
15. [DONE] `harness-ai.phase2.stream2.task5` Add `builtin-tools` part 2 (web + output truncation): `web_search`/`web_fetch` with `max_chars`, and shared output truncation (`truncated` marker + on-disk full-output pointer, OpenCode pattern); update the module doc; unit test (scope: `.../builtin-tools/src/builtin-tools-web.ts`, `.../builtin-tools/src/builtin-tools-truncate.ts`, `.../builtin-tools/src/builtin-tools.test.mjs`, `.../modules/builtin-tools/module.md`; expected commit: `feat(universal-client): built-in web tools and output truncation`). Result: Completed in commit `feat(universal-client): built-in web tools and output truncation`.
16. [DONE] Git Commit: `feat(universal-client): built-in web tools and output truncation` (hash: self)
17. [DONE] `harness-ai.phase2.stream2.task6` Add the `client-core` module (agent loop): turn cycle (request → SSE stream → tool execution → follow-up with `role:"tool"` → repeat until no tool_calls), parallel tool_calls, Core-owned in-session history, doom-loop detection (3 identical calls), retries with backoff + Retry-After (retry 429/5xx, not overflow/auth), AbortController cancel, full-auto execution; unit test (scope: `.../modules/client-core/module.md`, `.../client-core/src/client-core-facade.ts`, `.../client-core/src/client-core.test.mjs`, product-tree json+md; expected commit: `feat(universal-client): agent loop with retries and doom-loop`). Result: Completed in commit `feat(universal-client): agent loop with retries and doom-loop`.
18. [DONE] Git Commit: `feat(universal-client): agent loop with retries and doom-loop` (hash: self)
19. [DONE] `harness-ai.phase2.stream2.task7` Emit provider OUTPUT events (mechanical stream→contract mapping, NOT user-input normalization — see the terminology note): map the provider output stream into the existing `NormalizedProviderEvent` contract from the core (`turn_started` → `dialog_message` live/thinking → `turn_completed`/`turn_failed`, `stream_error`), map the error taxonomy (`auth_failed`/`rate_limited`/`quota_exhausted`/`context_overflow`/`network`/`provider_error`/`aborted`), no tool-progress events; unit test (scope: `.../client-core/src/client-core-events.ts`, `.../client-core/src/client-core.test.mjs`, `.../client-core/module.md`; expected commit: `feat(universal-client): emit provider output events`). Result: Completed in commit `feat(universal-client): emit provider output events`.
20. [DONE] Git Commit: `feat(universal-client): emit provider output events` (hash: self)

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

21. [DONE] `harness-ai.phase2.stream3.task1` Add the `kimi-client-provider` module: a thin Provider-Runtime endpoint on the universal-client core — base_url `api.kimi.com/coding/v1`, subscription-key auth from Core settings, Kimi `DialectProfile` (reasoning_content thinking, tool_choice behavior), model `kimi-for-coding`; facade delegates the turn to `client-core`; unit test (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/module.md`, `.../kimi-client-provider/src/kimi-client-provider-facade.ts`, `.../kimi-client-provider/src/kimi-client-provider.test.mjs`, product-tree json+md; expected commit: `feat(kimi-client-provider): kimi endpoint on universal client`). Result: Completed in commit `feat(kimi-client-provider): kimi endpoint on universal client`.
22. [DONE] Git Commit: `feat(kimi-client-provider): kimi endpoint on universal client` (hash: self)
23. [DONE] `harness-ai.phase2.stream3.task2` Bind the Kimi client provider descriptor + registry, kept INTERNAL/hidden: add the `kimi-for-coding` descriptor and bind the provider in the registry but NOT in the visible picker yet (live ACP Kimi keeps serving during development); update module docs (scope: provider-descriptor facade + `module.md`, provider-registry facade + `module.md`; expected commit: `feat(core-runtime): bind kimi client provider descriptor (internal)`). Scope clarification (2026-07-04, during implementation): extending the `ProviderId` union forces the exhaustive `PROVIDER_KEY_BY_ID` map in the settings-store facade to gain a `kimi-client` entry; it is added as a type-completeness bridge aliasing the `kimi` section (nothing reads it) and the dedicated settings entry stays in task3 — settings-store facade + `module.md` join this task's scope (3 functional files total, within the limit). Result: Completed in commit `feat(core-runtime): bind kimi client provider descriptor (internal)`.
24. [DONE] Git Commit: `feat(core-runtime): bind kimi client provider descriptor (internal)` (hash: self)
25. [DONE] `harness-ai.phase2.stream3.task3` Add Kimi client key storage + help/localization: subscription-key settings entry for the client Kimi and the provider-help strings (where to get the Kimi For Coding key) through the localization runtime (scope: settings/auth-store facade + `module.md`, `localization-runtime` source-dictionaries + `module.md`; expected commit: `feat(core-runtime): kimi client key storage and help`). Result: Completed in commit `feat(core-runtime): kimi client key storage and help`.
26. [DONE] Git Commit: `feat(core-runtime): kimi client key storage and help` (hash: self)
27. [DONE] `harness-ai.phase2.stream3.task3a` Return the final turn history from the client core agent loop (inserted 2026-07-04 while starting task4: the loop builds the full in-turn history — assistant messages and tool results — but returns void, so an endpoint adapter cannot carry complete multi-turn session history; rebuilding it from display events would silently drop tool exchanges): `runClientTurn` resolves with the final in-turn message history; additive change, existing callers may ignore the return value; unit test (scope: `.../client-core/src/client-core-facade.ts`, `.../client-core/src/client-core.test.mjs`, `.../client-core/module.md`; expected commit: `feat(universal-client): return final turn history from agent loop`). Result: Completed in commit `feat(universal-client): return final turn history from agent loop`.
28. [DONE] Git Commit: `feat(universal-client): return final turn history from agent loop` (hash: self)
29. [DONE] `harness-ai.phase2.stream3.task4` Wire Core session routing / adapter construction for the Kimi client provider: Core session start constructs the `kimi-client-provider` facade and routes turns/events; add the Electron bridge/preload channel only if the renderer needs a new one (scope: core session routing facade + `module.md`, electron bridge/preload only if required (≤3 functional files); expected commit: `feat(core-runtime): route sessions to kimi universal client`). Result: Completed in commit `feat(core-runtime): route sessions to kimi universal client`.
30. [DONE] Git Commit: `feat(core-runtime): route sessions to kimi universal client` (hash: self)
31. [DONE] `harness-ai.phase2.stream3.task5` Visibility switch (migration applied): make the visible `kimi` provider in Settings/Start New Session resolve to the client endpoint and REMOVE the ACP `kimi-provider` from the visible picker (ACP code retained, no new ACP sessions); update descriptor visibility + affected docs (scope: provider-descriptor/registry visibility + affected `module.md` (≤3 functional files); expected commit: `feat(core-runtime): switch visible kimi to universal client`). Result: Completed in commit `feat(core-runtime): switch visible kimi to universal client`.
32. [DONE] Git Commit: `feat(core-runtime): switch visible kimi to universal client` (hash: self)
33. [DONE] `harness-ai.phase2.stream3.task5a` Kimi client settings section (user order 2026-07-04: an API-key field must exist in the Settings tab of every provider connected to the universal client — Kimi now, before the package build): add the typed `kimiClient` providers section (`apiKey`, `defaultModel` pinned to `kimi-for-coding`) to the settings store — defaults, system-settings persistence, auth-file sync and auth overlay like the other key-based providers — and retarget `PROVIDER_KEY_BY_ID` from the `kimi` bridge alias to the dedicated section; normalization pins the model id (scope: settings-store facade, settings-normalization, settings-store `module.md`; expected commit: `feat(core-runtime): kimi client settings section`). Result: Completed in commit `feat(core-runtime): kimi client settings section`.
34. [DONE] Git Commit: `feat(core-runtime): kimi client settings section` (hash: self)
35. [DONE] `harness-ai.phase2.stream3.task5b` Kimi client API key card in Settings (user order 2026-07-04): a reusable client API-key card component for universal-client providers (title/description/help strings parameterized per provider), mounted in the Kimi Settings tab bound to `providers.kimiClient.apiKey`, using the task3 provider-help strings; add the card title label to the approved dictionaries (scope: provider-settings-ui client-api-key card (new) + settings-tab-content, localization-runtime source-dictionaries, affected `module.md`; expected commit: `feat(settings-ui): kimi client api key card`). Scope clarification (2026-07-04, during implementation): mounting the card pushed `settings-tab-content.tsx` over the 500-line cap, so the shared card helpers (`DefaultModelCard`, `ConnectionProviderSettings`, `localizeModelOptions`) are split verbatim into a new `settings-provider-cards.tsx` — a mechanical cap split joining this task's scope as the 4th functional file (same nature as the task5a projections split). Result: Completed in commit `feat(settings-ui): kimi client api key card`.
36. [DONE] Git Commit: `feat(settings-ui): kimi client api key card` (hash: self)
37. [DONE] `harness-ai.phase2.stream3.task6` Package the app so the user can run the live auth-gate validation of task7 (`npm run package:mac`, user-confirmed 2026-07-04: build AFTER the API-key card lands); record the package evidence (scope: `docs/evidence/universal-client-kimi-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with universal client kimi`). Result: Completed in commit `chore(package): rebuild packaged app with universal client kimi`.
38. [DONE] Git Commit: `chore(package): rebuild packaged app with universal client kimi` (hash: self)
39. [DONE] `harness-ai.phase2.stream3.task7` User runs a live Kimi session on the packaged universal client (task6 build) and validates the auth-gate acceptance checklist (endpoint/base URL, headers, model id, streaming text, tool_calls, reasoning/thinking, usage/limit reporting, error-body behavior on quota/auth failure); confirms the client is usable (scope: user workflow; expected commit: none). Result: ACCEPTED by the user 2026-07-04 — live Kimi session on the packaged build works through OUR universal client end-to-end; the user's verdict: "я проверил, всё работает" (no blocking findings reported). The auth gate is PASSED: the Kimi Code subscription channel accepts the pasted key from our client in a real session.
40. [DONE] `harness-ai.phase2.stream3.task8` Record the Kimi auth-gate EVIDENCE as a tracked recovery artifact from the task7 live run: `docs/evidence/universal-client-kimi-auth-gate-YYYY-MM-DD.md` capturing endpoint/base URL, headers shape, model id, streaming text, tool_calls, thinking/reasoning behavior, usage/limits, and auth/quota error bodies (scope: `docs/evidence/universal-client-kimi-auth-gate-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record kimi auth-gate results`). Result: Completed in commit `docs(evidence): record kimi auth-gate results`.
41. [DONE] Git Commit: `docs(evidence): record kimi auth-gate results` (hash: self)

## Phase 3 - GLM Migration (owner: Codex + User, materialized: 2026-07-04)

> Scope contract (user order 2026-07-04: materialize Phase 3): move the
> visible GLM onto the universal client and REMOVE the embedded OpenCode
> runtime. Shape mirrors the accepted Kimi rollout: a new thin
> Provider-Runtime endpoint `glm-client-provider` on the Core client core
> (GLM DialectProfile: Z.ai base_url `api.z.ai/api/coding/paas/v4`,
> `Accept-Language: en-US,en` header, `reasoning_content` thinking,
> `tool_choice` auto-only, usage in the final chunk; request body carries GLM
> thinking params `thinking: {type}` + `reasoning_effort` + `tool_stream` via
> a new per-turn extraBody contract RESTRICTED to provider-specific keys —
> reserved core-owned body fields are never overridable by an endpoint),
> key-only onboarding (the Z.ai Coding
> Plan subscription key; `providers.glmClient` section + the reusable client
> API-key card per the user's standing order), a Core-owned multi-model
> catalog (glm-5.2 default, glm-5.1, glm-5-turbo, glm-4.7, glm-4.6 — fixed by
> us, no official coding-plan list), then the visibility switch: the visible
> GLM = `glm-client` (name "GLM"), `glm-native` goes INTERNAL as retired
> legacy code (NO session-continuity obligation — user decision 2026-07-04:
> sessions are killed on every update during development; full module
> removal joins the Phase 5 afterlife open item next to the ACP kimi), and
> `glm-opencode` leaves the picker and is REMOVED end-to-end (module,
> `@opencode-ai/sdk` + opencode CLI update path, Settings tab/schema,
> localization, telemetry/session entries, provider id). Old glm-opencode
> sessions simply stop working after the unbind task — no graceful-legacy
> machinery is built for them. Session profiles are untouched in this phase
> (PROFILE_SUPPORTED_PROVIDER_IDS keeps `glm-native`; client-four profiles
> are Phase 5). Removal is ordered so every commit compiles: consumers first
> (routing, UI, renderer reads), then the settings schema (with a one-commit
> `PROVIDER_KEY_BY_ID` bridge like the accepted kimi-client pattern), then
> session/telemetry literals, then the `glm-opencode` provider id, then the
> module + dependency deletion. Module/file names below are PROPOSALS; exact
> file splits are finalized at each task's start under the 500-line and
> ≤3-functional-files rules (mechanical cap/removal splits may join a task's
> scope with a recorded clarification, as accepted in Phase 2).

### Stream: Phase Breakdown (this task)

42. [DONE] `harness-ai.phase3.stream1.task1` Materialize Phase 3 into the microtasks below per the user's direct order 2026-07-04 (plan-only, closes with this same commit) (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): break down glm migration phase`). Result: Completed in commit `docs(plan): break down glm migration phase`.
43. [DONE] Git Commit: `docs(plan): break down glm migration phase` (hash: self)
44. [DONE] `harness-ai.phase3.stream1.task2` Apply the Phase 3 review fixes from the second agent's review (user-delivered 2026-07-04; plan-only, closes with this same commit). Accepted findings: (P1) restrict `extraBody` — reserved core keys never overridable, conflict test required; (P1) dependency order — settings section and key storage land BEFORE the endpoint module (order corrected to settings -> descriptor/registry bind -> auth+help -> endpoint; note: auth-store aliases and `PROVIDER_KEY_BY_ID` are `ProviderId`-typed, so they follow the union extension, not precede it; the adapter's missing-key text is an English literal like the accepted kimi-client pattern, provider-help dictionary strings serve Settings UI); (P1) package task requires a fresh explicit user confirmation — no inherited-permission wording; (P1) architecture docs join the switch/removal scopes (`docs/architecture/UniversalClient.md` GLM-channel statements, `docs/architecture/CodeAIHubProviderRuntimeAlignment.md` GLM OpenCode section); (P2) acceptance checklist covers existing glm-native sessions (readable AND can send — the adapter stays registered) and glm-opencode sessions (history readable, send fails with the controlled adapter-not-registered error); (P2) Settings-UI task lists affected `module.md`s explicitly; (P2) schema removal states legacy-settings tolerance (merge ignores unknown sections, save projections drop them, load never fails); (P2) the final sweep is scoped to production/runtime references and current docs — archived plans and evidence history are NOT rewritten (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): apply glm phase review fixes`). Result: Completed in commit `docs(plan): apply glm phase review fixes`.
45. [DONE] Git Commit: `docs(plan): apply glm phase review fixes` (hash: self)
46. [DONE] `harness-ai.phase3.stream1.task3` Drop the session-continuity requirement from Phase 3 (user decision 2026-07-04; plan-only, closes with this same commit): the app is in development and the user kills all sessions on every update, so no extra machinery serves pre-existing sessions of old channels — `glm-native` goes internal as retired legacy code without a keep-sending obligation, old glm-opencode sessions simply stop working after the unbind, and the acceptance checklist drops its existing-session items (this narrows the review-fix P2 acceptance expansion recorded in task2 above); the Scope Summary records the decision for the whole scope including the Phase 5 afterlife removals (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): drop session continuity requirement`). Result: Completed in commit `docs(plan): drop session continuity requirement`.
47. [DONE] Git Commit: `docs(plan): drop session continuity requirement` (hash: self)

### Stream: GLM Client Endpoint And Switch

48. [DONE] `harness-ai.phase3.stream2.task1` Per-turn extra body params in the client core (additive contract change GLM needs): `ClientTurnRequest.extraBody?: Readonly<Record<string, unknown>>` in `client-contract`, merged into the OpenAI-shape request by `client-core-http` `buildRequestBody` with the Core contract boundary enforced — reserved core-owned keys (`model`, `messages`, `tools`, `stream`, `stream_options`, `tool_choice`, `parallel_tool_calls`) are NEVER overridable by an endpoint (core fields win / reserved keys are dropped), and a unit test covers the conflict case plus the plain GLM-shape merge (`thinking`/`reasoning_effort`/`tool_stream`) (scope: `.../client-contract/src/client-contract-facade.ts`, `.../client-core/src/client-core-http.ts`, tests + affected `module.md`s; expected commit: `feat(universal-client): per-turn extra body params`). Result: Completed in commit `feat(universal-client): per-turn extra body params`.
49. [DONE] Git Commit: `feat(universal-client): per-turn extra body params` (hash: self)
50. [DONE] `harness-ai.phase3.stream2.task2` Add the `providers.glmClient` settings section (`apiKey`, `defaultModel` validated against the client GLM catalog with glm-5.2 fallback, `reasoningEffort` defaulting to max like glmNative): defaults, system persistence, and normalization; NO `PROVIDER_KEY_BY_ID`/auth-file sync/auth overlay yet (the provider id joins the union in the next task, then auth-store aliases land in task4) (scope: settings-store facade, settings-store projections, settings-normalization + settings-store `module.md`; expected commit: `feat(core-runtime): glm client settings section`). Result: Completed in commit `feat(core-runtime): glm client settings section`.
51. [DONE] Git Commit: `feat(core-runtime): glm client settings section` (hash: self)
52. [DONE] `harness-ai.phase3.stream2.task3` Bind the GLM client provider descriptor + registry, INTERNAL: `ProviderId` union += `glm-client`, `PROVIDER_KEY_BY_ID` += `glm-client -> glmClient` (the section exists since the previous task), descriptor `CLIENT_PROVIDER_MODELS` += the GLM catalog and `HTTP_COMPATIBLE_PROVIDER_IDS` += `glm-client`, registry `PROVIDERS` += internal entry (name "GLM", moduleId `glm-client-provider`); registry `enrichDescriptor` sets `defaultModelId` only for SINGLE-model client catalogs (multi-model GLM resolves through settings like the vendor providers); registry test (scope: provider-descriptor facade, provider-registry facade (+ its test), settings-store facade (one map line) + affected `module.md`s; expected commit: `feat(core-runtime): bind glm client provider descriptor (internal)`). Result: Completed in commit `feat(core-runtime): bind glm client provider descriptor (internal)`.
53. [DONE] Git Commit: `feat(core-runtime): bind glm client provider descriptor (internal)` (hash: self)
54. [DONE] `harness-ai.phase3.stream2.task4` GLM client key storage + help: auth-store aliases `glmClient`/`glm-client` with the existing `GLM_API_KEY`/`ZAI_API_KEY` env fallbacks (same Z.ai Coding Plan key as glm-native; the union carries the id since the previous task), settings-store auth overlay/sync for `providers.glmClient`, and the `settings.provider.glmClient.*` provider-help strings (where the Z.ai Coding Plan key comes from) in the approved dictionaries (scope: provider-auth-store facade + `module.md`, settings-store facade + `module.md`, localization-runtime source-dictionaries + `module.md`; expected commit: `feat(core-runtime): glm client key storage and help`). Result: Completed in commit `feat(core-runtime): glm client key storage and help`.
55. [DONE] Git Commit: `feat(core-runtime): glm client key storage and help` (hash: self)
56. [DONE] `harness-ai.phase3.stream2.task5` Add the `glm-client-provider` module on the kimi-client pattern, with its Core dependencies already in place (settings section, auth-store key path, descriptor binding): `GLM_DIALECT` (Z.ai base_url `api.z.ai/api/coding/paas/v4`, `Accept-Language: en-US,en` header, reasoning_content, auto_only, usage final chunk), `buildGlmTurnRequest` (extraBody: `thinking: {type: "enabled"}`, `reasoning_effort` resolved from the Core settings snapshot per turn — Core-owned truth, exact wiring finalized at task start, `tool_stream: true`), and the `GlmClientProviderFacade` ProviderAdapter (in-memory sessions, final-history carry-over, `NormalizedProviderEvent` emission + `stream_error` on failure, Stop-keeps-history; a missing key fails the turn with the English adapter literal — the accepted kimi-client pattern — while the localized provider-help strings serve Settings UI); unit test; product tree (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-client-provider/module.md`, `.../src/glm-client-provider-facade.ts`, `.../src/glm-client-provider.test.mjs`, product-tree json+md; expected commit: `feat(glm-client-provider): glm endpoint on universal client`). Result: Completed in commit `feat(glm-client-provider): glm endpoint on universal client`.
57. [DONE] Git Commit: `feat(glm-client-provider): glm endpoint on universal client` (hash: self)
58. [DONE] `harness-ai.phase3.stream2.task6` Route Core sessions to the GLM client: `buildProviderAdapterInstance` case `glm-client` (model intentionally passed — the client GLM is multi-model, the adapter pins the dialect not the model) and `PROVIDER_IDS` += `glm-client` (RPC id validation + startup registration; liveness passes via the HTTP branch) (scope: core-provider-adapter-registration, core-provider-lifecycle + core-runtime-process `module.md`; expected commit: `feat(core-runtime): route sessions to glm universal client`). Result: Completed in commit `feat(core-runtime): route sessions to glm universal client`.
59. [DONE] Git Commit: `feat(core-runtime): route sessions to glm universal client` (hash: self)
60. [DONE] `harness-ai.phase3.stream2.task7` GLM client Settings UI: `GlmClientApiKeyCard` preset on the reusable client API-key card (user's standing order: every client provider gets one), mounted in the GLM tab above the glm-native block, plus the client GLM default-model selection (`PROVIDER_MODEL_OPTIONS.glmClient` catalog + ModelRows bound to `providers.glmClient.defaultModel`); card title label + model descriptions in the approved dictionaries if new ids are needed (scope: client-api-key-card, settings-tab-content, settings-model-options + provider-settings-ui `module.md`; if dictionary labels are added, source-dictionaries + localization-runtime `module.md` join as a recorded split finalized at task start; expected commit: `feat(settings-ui): glm client api key card and models`). Result: Completed in commit `feat(settings-ui): glm client api key card and models`.
61. [DONE] Git Commit: `feat(settings-ui): glm client api key card and models` (hash: self)
62. [DONE] `harness-ai.phase3.stream2.task8` Visibility switch (migration applied): `glm-client` -> visible (the single visible "GLM"), `glm-native` -> internal as retired legacy code (NO session-continuity obligation per the 2026-07-04 user decision — whether it stays registered is an implementation detail, not a requirement; module removal joins the Phase 5 afterlife item), `glm-opencode` -> internal (leaves the picker ahead of its removal); renderer model resolve gains the `glm-client` settings case (`getProviderModel` -> `providers.glmClient.defaultModel`); update `docs/architecture/UniversalClient.md` GLM-channel statements (GLM no longer "on embedded OpenCode until the client is ready" — the switch is applied); registry test updated (scope: provider-registry facade (+ test), provider-picker, `docs/architecture/UniversalClient.md` + affected `module.md`s; expected commit: `feat(core-runtime): switch visible glm to universal client`). Result: Completed in commit `feat(core-runtime): switch visible glm to universal client`.
63. [DONE] Git Commit: `feat(core-runtime): switch visible glm to universal client` (hash: self)

### Stream: Embedded OpenCode Runtime Removal

64. [DONE] `harness-ai.phase3.stream3.task1` Unbind the OpenCode runtime from Core routing: `PROVIDER_IDS` -= `glm-opencode`, remove the `buildProviderAdapterInstance` case and the liveness `createHomeAdapter` case; old glm-opencode sessions simply stop working — no legacy-session machinery is built (2026-07-04 user decision: no session continuity across updates) (scope: core-provider-lifecycle, core-provider-adapter-registration, provider-liveness-checker + `module.md`s; expected commit: `feat(core-runtime): unbind embedded opencode runtime`). Result: Completed in commit `feat(core-runtime): unbind embedded opencode runtime`.
65. [DONE] Git Commit: `feat(core-runtime): unbind embedded opencode runtime` (hash: self)
66. [DONE] `harness-ai.phase3.stream3.task2` Remove the OpenCode Settings tab surface: drop the `glmOpenCode` tab from `SETTINGS_TABS` + its `settings-tab-content` branch and delete `opencode-settings-card.tsx` (scope: settings-tab-content, settings-model-options, delete opencode-settings-card + provider-settings-ui `module.md`; expected commit: `feat(settings-ui): remove opencode settings tab`). Result: Completed in commit `feat(settings-ui): remove opencode settings tab`.
67. [DONE] Git Commit: `feat(settings-ui): remove opencode settings tab` (hash: self)
68. [DONE] `harness-ai.phase3.stream3.task3` Remove the OpenCode version-update path: `core-provider-tools` PROVIDER_PACKAGE_MAP `glmOpenCode` entry (+ `.opencode/bin` PATH entry), narrow `UpdatableProviderId`, and drop the OpenCode wiring from the settings versions surface (scope: core-provider-tools, provider-version-controls, settings-surface-facade + `module.md`s; expected commit: `feat(core-runtime): remove opencode version update path`). Result: Completed in commit `feat(core-runtime): remove opencode version update path`.
69. [DONE] Git Commit: `feat(core-runtime): remove opencode version update path` (hash: self)
70. [DONE] `harness-ai.phase3.stream3.task4` Remove renderer reads of the OpenCode settings: `provider-picker` `getProviderModel` case and the `vite-env.d.ts` renderer settings mirror (+ any remaining session-window read found at task start) (scope: provider-picker, vite-env.d.ts (+ session-window only if required) + session-window `module.md`; expected commit: `feat(session-ui): remove opencode renderer settings reads`). Result: Completed in commit `feat(session-ui): remove opencode renderer settings reads`.
71. [DONE] Git Commit: `feat(session-ui): remove opencode renderer settings reads` (hash: self)
72. [DONE] `harness-ai.phase3.stream3.task5` Remove the OpenCode settings schema: drop `providers.glmOpenCode` from `HarnessSettings`/defaults/persistence/auth-sync/overlay and the glmOpenCode normalization rules; `PROVIDER_KEY_BY_ID` keeps a one-commit bridge `glm-opencode -> glmNative` until the id leaves the union (accepted kimi-client bridge pattern). LEGACY TOLERANCE (review P2): existing user settings files may still carry a `glmOpenCode` section — `mergeSettings` already ignores unknown sections structurally and the save projections drop them on the next save; the task verifies load NEVER fails on a legacy key (unit check in the settings-store test if one exists, otherwise asserted via the normalization test). Scope clarification (2026-07-04 implementation): removing the typed settings section makes the `provider-turn-options` glm-opencode branch uncompilable, so that branch/test moves into this task; task6 keeps the remaining telemetry/runner literals (scope: settings-store facade, settings-store projections, settings-normalization, provider-turn-options + settings-store/session-request-handler `module.md`s; expected commit: `feat(core-runtime): remove opencode settings schema`). Result: Completed in commit `feat(core-runtime): remove opencode settings schema`.
73. [DONE] Git Commit: `feat(core-runtime): remove opencode settings schema` (hash: self)
74. [DONE] `harness-ai.phase3.stream3.task6` Remove OpenCode session/telemetry literals ahead of the id removal: the remaining glm-opencode branches in `usage-context-telemetry` and `provider-turn-runner` (`provider-turn-options` moved into task5 to keep the settings-schema removal commit compiling) (scope: usage-context-telemetry facade, provider-turn-runner facade + `module.md`s; expected commit: `feat(core-runtime): remove opencode session and telemetry entries`). Result: Completed in commit `feat(core-runtime): remove opencode session and telemetry entries`.
75. [DONE] Git Commit: `feat(core-runtime): remove opencode session and telemetry entries` (hash: self)
76. [DONE] `harness-ai.phase3.stream3.task7` Remove the `glm-opencode` provider id: drop it from the `ProviderId` union + the registry `PROVIDERS` entry (and the "OpenCode" display-name note), delete the `PROVIDER_KEY_BY_ID` bridge line and the auth-store alias/env entries; registry test updated (scope: provider-registry facade (+ test), settings-store facade, provider-auth-store facade + `module.md`s; expected commit: `feat(core-runtime): remove glm-opencode provider id`). Result: Completed in commit `feat(core-runtime): remove glm-opencode provider id`.
77. [DONE] Git Commit: `feat(core-runtime): remove glm-opencode provider id` (hash: self)
78. [DONE] `harness-ai.phase3.stream3.task8` Remove the OpenCode localization strings (`settings.tab.glmOpenCode`, `settings.provider.openCode.*`) from the approved dictionaries (scope: localization-runtime source-dictionaries + `module.md`; expected commit: `chore(localization): remove opencode settings strings`). Result: Completed in commit `chore(localization): remove opencode settings strings`.
79. [DONE] Git Commit: `chore(localization): remove opencode settings strings` (hash: self)
80. [DONE] `harness-ai.phase3.stream3.task9` Delete the embedded OpenCode runtime module and its dependency: remove `modules/glm-opencode-provider/**`, drop `@opencode-ai/sdk` (and any opencode-only entries) from `package.json`, update the provider-adapters `cluster.md`, product tree json+md, `docs/DOCUMENTATION_INDEX.md`, and the ARCHITECTURE TRUTH (review P1): `docs/architecture/UniversalClient.md` (embedded-OpenCode statements now historical) and `docs/architecture/CodeAIHubProviderRuntimeAlignment.md` (GLM OpenCode section marked removed/retired). SWEEP SCOPE (review P2): the final `glm-opencode`/`glmOpenCode`/`opencode` sweep covers PRODUCTION/RUNTIME references and CURRENT docs only — archived plans (`.harness/plans/archive/**`) and evidence history (`docs/evidence/**`) are NOT rewritten; OpenCode stays a legitimate REFERENCE project in research/architecture history (plan allows: module deletion + package.json + knip.json if needed, plus docs) (scope: module deletion, package.json (+ knip.json if required), cluster/product-tree/architecture/docs-index; expected commit: `chore(provider-runtime): remove embedded opencode runtime module`). Result: Completed in commit `chore(provider-runtime): remove embedded opencode runtime module`.
81. [DONE] Git Commit: `chore(provider-runtime): remove embedded opencode runtime module` (hash: self)

### Stream: Package And Acceptance

82. [DONE] `harness-ai.phase3.stream4.task1` Package the app for the GLM migration acceptance: ASK THE USER FOR EXPLICIT PACKAGE CONFIRMATION FIRST (review P1: the packaging gate requires a fresh explicit go — nothing is inherited from the phase materialization order), then `npm run package:mac`; record the package evidence (scope: `docs/evidence/universal-client-glm-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with universal client glm`). Result: Completed in commit `chore(package): rebuild packaged app with universal client glm`.
83. [DONE] Git Commit: `chore(package): rebuild packaged app with universal client glm` (hash: self)
84. [DONE] `harness-ai.phase3.stream4.task2` User runs a live GLM session on the packaged universal client and validates the acceptance checklist: NEW visible GLM session runs on `glm-client` (Z.ai endpoint, key onboarding via the GLM tab card, model selection, streaming text, tool_calls, thinking/reasoning behavior incl. reasoning_effort, error behavior on bad key); OpenCode tab gone from Settings; no OpenCode entry in the picker (existing-session checks DROPPED per the 2026-07-04 user decision — the user kills all sessions on every update); confirms the migration (scope: user workflow; expected commit: none). Result: User live run accepted the new app behavior, with one residual Settings defect: the GLM tab still showed the legacy `glmNative` connection/default-model block below the new `glmClient` controls.
85. [DONE] `harness-ai.phase3.stream4.task3` Remove the residual legacy GLM Native Settings block from the visible GLM tab: keep only the `glmClient` API-key card and universal-client model selector, drop the old `ConnectionProviderSettings` block that edits `providers.glmNative`, and update the Settings UI module documentation so the visible GLM tab no longer presents `glm-5.2` as the retired native/default-model section (scope: provider-settings-ui `settings-tab-content.tsx`, related settings UI docs; expected commit: `fix(settings-ui): remove legacy glm native settings block`). Result: Completed in commit `fix(settings-ui): remove legacy glm native settings block`.
86. [DONE] Git Commit: `fix(settings-ui): remove legacy glm native settings block` (hash: self)
87. [DONE] `harness-ai.phase3.stream4.task4` Package the app after the GLM Settings cleanup for the user's rerun: `npm run package:mac`; record package evidence update in the existing GLM package evidence or a follow-up dated evidence file as appropriate (scope: `docs/evidence/**`, `docs/DOCUMENTATION_INDEX.md` if a new evidence file is created, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app after glm settings cleanup`). Result: Completed in commit `chore(package): rebuild packaged app after glm settings cleanup`.
88. [DONE] Git Commit: `chore(package): rebuild packaged app after glm settings cleanup` (hash: self)
89. [DONE] `harness-ai.phase3.stream4.task5` User reruns the packaged GLM app and confirms the residual Settings defect is gone: GLM tab shows only the universal-client GLM API key/model controls, no old native `GLM Connection`/single `glm-5.2` block, and the GLM session behavior remains accepted (scope: user workflow; expected commit: none). Result: User accepted the follow-up packaged app on 2026-07-04: "Все работает можно фазу закрывать".
90. [DONE] `harness-ai.phase3.stream4.task6` Record the GLM migration EVIDENCE from the accepted live run: `docs/evidence/universal-client-glm-migration-YYYY-MM-DD.md` (endpoint/wire facts, acceptance verdict without legacy-session checks per the 2026-07-04 user decision, OpenCode-removal confirmation, Settings cleanup confirmation) (scope: `docs/evidence/universal-client-glm-migration-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record glm migration results`). Result: Completed in commit `docs(evidence): record glm migration results`.
91. [DONE] Git Commit: `docs(evidence): record glm migration results` (hash: self)

## Phase 4 - Local Models And OpenRouter On The Universal Client (owner: Codex + User, materialized: 2026-07-05)

> Scope contract (user order 2026-07-05: materialize Phase 4): move the two
> remaining client-four providers onto the universal client following the
> accepted Kimi/GLM rollout shape (settings -> descriptor/registry bind ->
> auth+help -> endpoint -> routing -> Settings UI -> visibility switch ->
> package -> live acceptance -> evidence). Discovery correction against the
> Scope Summary wording: `openrouter` and `local-models` are NOT absent — they
> run today as visible providers on the ported CodeAI-Hub reference adapters
> (modules `openrouter-provider`/`local-models-provider` wrapping
> `src/reference/**`), so Phase 4 is a MIGRATION like GLM, not a green-field
> add. Shape decisions recorded for user review:
> (1) SHARED SETTINGS SECTIONS, no duplicate keys: `openrouter-client` maps to
> the existing `providers.openRouter` section (the single OpenRouter API key
> serves BOTH coding sessions and the localization translation engine — one
> source of truth; `translationProfiles` stay untouched for the translation
> runtime), and `local-models-client` maps to the existing
> `providers.localModels` section extended additively with `baseUrl` (default
> `http://127.0.0.1:1234`) + optional `apiKey` + `contextLength` override
> (0 = auto-detect). This deliberately diverges from the kimiClient/glmClient
> new-section pattern: there the old sections belonged to DIFFERENT channels
> (ACP kimi / native GLM); here the old sections already describe the same
> vendor endpoints the client will call.
> (2) LIVE MODEL CATALOGS, not static Core enums: Local Models lists models
> via the existing `get-local-models` RPC retargeted from the hardcoded
> LM-Studio URL to the configured base URL (Core Authority fix); OpenRouter
> keeps the existing Settings model-slug search as the session default-model
> control. `CLIENT_PROVIDER_MODELS` gains NO entries for these two providers.
> USER REVIEW FIX (2026-07-05): the OpenRouter Settings tab is preserved
> EXACTLY as it is today — no client key card, no control replacement, no
> new copy; the standing every-client-provider-has-a-key-field order is
> already satisfied by the existing API Key field writing
> `providers.openRouter.apiKey`. Consequence (no dead visible controls): the
> `openrouter-client` endpoint MUST honor every field the card edits —
> `apiKey`, `baseUrl` (default `https://openrouter.ai/api/v1`),
> `defaultModel`, and `endpointTag` (a non-default tag routes via the
> request-body `provider: {allow_fallbacks: false, order: [tag]}`, the
> reference wire form) — all resolved from Core settings per turn.
> (3) CORE ADDITION for OpenRouter (architecture doc sections 3.1/3.4):
> structured `reasoning_details[]` accumulation in dialect-streaming plus a
> per-dialect history policy so assistant messages return `reasoning_details`
> unchanged in follow-up requests; the MVP sends NO `reasoning` request
> parameter (model defaults apply).
> (4) Local Models context length (architecture doc section 3.7): OpenAI-shape
> `/v1/models` reports no context window, so the endpoint probes the
> provider-specific endpoints (Ollama `POST /api/show`, LM Studio
> `GET /api/v0/models`, llama.cpp `GET /props`) with the settings
> `contextLength` override as the last word.
> (5) At the switch the legacy `openrouter`/`local-models` providers go
> INTERNAL as retired legacy code (NO session-continuity obligation per the
> 2026-07-04 user decision); their modules KEEP the reference
> `src/reference/**` corpus in the tree — module disposition joins the
> Phase 5 afterlife open item next to ACP kimi and glm-native. Module/file
> names below are PROPOSALS; exact file splits are finalized at each task's
> start under the 500-line and ≤3-functional-files rules (mechanical
> cap/removal splits may join a task's scope with a recorded clarification,
> as accepted in Phases 2-3).

### Stream: Phase Breakdown (this task)

92. [DONE] `harness-ai.phase4.stream1.task1` Materialize Phase 4 into the microtasks below per the user's direct order 2026-07-05 (plan-only, closes with this same commit): record the shape decisions above for user review and extend the Phase 5 afterlife open item with the retired openrouter/local-models legacy modules (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): break down local models and openrouter phase`). Result: Completed in commit `docs(plan): break down local models and openrouter phase`.
93. [DONE] Git Commit: `docs(plan): break down local models and openrouter phase` (hash: self)
94. [DONE] `harness-ai.phase4.stream1.task2` Apply the user's Phase 4 review fix (2026-07-05; plan-only, closes with this same commit): the OpenRouter Settings tab is preserved EXACTLY as it is today — the former Settings-UI task `harness-ai.phase4.stream3.task7` is REMOVED from the plan (no client key card, no control replacement; the standing key-field order is already satisfied by the existing API Key field writing `providers.openRouter.apiKey`), the OpenRouter auth task drops its dictionary strings (alias only), the endpoint task gains the no-dead-controls contract (per-turn `apiKey`/`baseUrl`/`defaultModel`/`endpointTag` resolution with the reference `provider: {allow_fallbacks: false, order: [tag]}` wire form), and the acceptance checklist now verifies the UNCHANGED tab drives the client endpoint (scope: `.harness/plans/todo-plan.md`; expected commit: `docs(plan): preserve openrouter settings ui as-is`). Result: Completed in commit `docs(plan): preserve openrouter settings ui as-is`.
95. [DONE] Git Commit: `docs(plan): preserve openrouter settings ui as-is` (hash: self)

### Stream: Local Models Client Endpoint

96. [DONE] `harness-ai.phase4.stream2.task1` Extend the `providers.localModels` settings section additively for the universal client: `baseUrl` (default `http://127.0.0.1:1234`, normalization trims trailing slashes and keeps http(s) URLs), optional `apiKey` (default empty — local servers usually run no-auth), `contextLength` (integer >= 0, 0 = auto-detect) — defaults, system persistence, projections and normalization; `defaultModel` stays as-is (scope: settings-store facade, settings-store projections, settings-normalization + settings-store `module.md`; expected commit: `feat(core-runtime): extend local models settings for universal client`). Result: Completed in commit `feat(core-runtime): extend local models settings for universal client`.
97. [DONE] Git Commit: `feat(core-runtime): extend local models settings for universal client` (hash: self)
98. [DONE] `harness-ai.phase4.stream2.task2` Bind the Local Models client provider descriptor + registry, INTERNAL: `ProviderId` union += `local-models-client`, `PROVIDER_KEY_BY_ID` += `local-models-client -> localModels` (shared section per the scope contract), `HTTP_COMPATIBLE_PROVIDER_IDS` += `local-models-client`, registry `PROVIDERS` += internal entry (name "Local Models", moduleId `local-models-client-provider`); `CLIENT_PROVIDER_MODELS` intentionally gains NO entry (live catalog); registry test (scope: provider-registry facade (+ its test), provider-descriptor facade, settings-store facade (one map line) + affected `module.md`s; expected commit: `feat(core-runtime): bind local models client provider descriptor (internal)`). Result: Completed in commit `feat(core-runtime): bind local models client provider descriptor (internal)`.
99. [DONE] Git Commit: `feat(core-runtime): bind local models client provider descriptor (internal)` (hash: self)
100. [DONE] `harness-ai.phase4.stream2.task3` Local Models client auth alias + help: auth-store aliases `local-models-client` -> the `localModels` file aliases with the existing `HARNESS_AI_LOCAL_API_KEY`/`LMSTUDIO_API_KEY` and `HARNESS_AI_LOCAL_MODELS_BASE_URL`/`LMSTUDIO_BASE_URL` env fallbacks (same local server as the legacy id), and the `settings.provider.localModelsClient.*` provider-help strings (base URL of the local OpenAI-compatible server — Ollama / LM Studio / llama.cpp; key optional) in the approved dictionaries (scope: provider-auth-store facade + `module.md`, localization-runtime source-dictionaries + `module.md`; expected commit: `feat(core-runtime): local models client auth alias and help`). Result: Completed in commit `feat(core-runtime): local models client auth alias and help`.
101. [DONE] Git Commit: `feat(core-runtime): local models client auth alias and help` (hash: self)
102. [DONE] `harness-ai.phase4.stream2.task4` Add the `local-models-client-provider` module on the glm-client pattern: `buildLocalModelsDialect(baseUrl)` (per-turn base URL from Core settings, no vendor headers; tool_choice support and the thinking form finalized at task start against the running servers — the core already normalizes all four thinking forms incl. the `think_tags` splitter), optional Bearer key, `LocalModelsClientProviderFacade` ProviderAdapter (in-memory sessions, final-history carry-over, `NormalizedProviderEvent` emission + `stream_error`, Stop-keeps-history; a missing/invalid base URL fails the turn with an English adapter literal); unit test; product tree (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/local-models-client-provider/module.md`, `.../src/local-models-client-provider-facade.ts`, `.../src/local-models-client-provider.test.mjs`, product-tree json+md; expected commit: `feat(local-models-client-provider): local models endpoint on universal client`). Result: Completed in commit `feat(local-models-client-provider): local models endpoint on universal client`.
103. [DONE] Git Commit: `feat(local-models-client-provider): local models endpoint on universal client` (hash: self)
104. [DONE] `harness-ai.phase4.stream2.task5` Local Models context length detection: probe the provider-specific endpoints for the loaded model (Ollama `POST /api/show`, LM Studio `GET /api/v0/models`, llama.cpp `GET /props`) with the settings `contextLength` override as the last word, and feed the detected window into the session usage telemetry limit (existing `tokenUsage.limit` channel; exact wiring point finalized at task start); unit test (scope: `.../local-models-client-provider/src/local-models-context-length.ts` (new), the telemetry wiring point (<=1 file), tests + `module.md`; expected commit: `feat(local-models-client-provider): context length detection`). Result: Completed in commit `feat(local-models-client-provider): context length detection`.
105. [DONE] Git Commit: `feat(local-models-client-provider): context length detection` (hash: self)
106. [DONE] `harness-ai.phase4.stream2.task6` Route Core sessions to the Local Models client: `buildProviderAdapterInstance` case `local-models-client` (model resolved from Core settings per turn like GLM) and `PROVIDER_IDS` += `local-models-client` (RPC id validation + startup registration) (scope: core-provider-adapter-registration, core-provider-lifecycle + core-runtime-process `module.md`; expected commit: `feat(core-runtime): route sessions to local models universal client`). Result: Completed in commit `feat(core-runtime): route sessions to local models universal client`.
107. [DONE] Git Commit: `feat(core-runtime): route sessions to local models universal client` (hash: self)
108. [DONE] `harness-ai.phase4.stream2.task7` Local Models live catalog + liveness from the CONFIGURED base URL (Core Authority fix — the hardcoded `http://127.0.0.1:1234` LM-Studio URL leaves production paths): `loadLocalModels` (core-provider-tools) reads `providers.localModels.baseUrl` from the settings snapshot, and the liveness checker validates `local-models-client` via the model list from the configured URL (its private `loadLocalModels` duplicate is retargeted/removed too) (scope: core-provider-tools, provider-liveness-checker facade + affected `module.md`s; expected commit: `feat(core-runtime): local models catalog from configured base url`). Result: Completed in commit `feat(core-runtime): local models catalog from configured base url`.
109. [DONE] Git Commit: `feat(core-runtime): local models catalog from configured base url` (hash: self)
110. [DONE] `harness-ai.phase4.stream2.task8` Local Models client Settings UI: extend the reusable client card family with a base-URL + optional-key connection variant (user's standing order: every universal-client provider gets its onboarding card), mount it in the Local Models tab bound to `providers.localModels.{baseUrl,apiKey,contextLength}`, keep the default-model selection fed by the live `get-local-models` list (existing RPC flow), using the task3 help strings (scope: client-api-key-card (connection variant), local-models-settings-card, settings-tab-content + provider-settings-ui `module.md`; if dictionary labels are added, source-dictionaries + localization-runtime `module.md` join as a recorded split; expected commit: `feat(settings-ui): local models client connection card`). Result: Completed in commit `feat(settings-ui): local models client connection card`.
111. [DONE] Git Commit: `feat(settings-ui): local models client connection card` (hash: self)

### Stream: OpenRouter Client Endpoint

112. [DONE] `harness-ai.phase4.stream3.task1` Accumulate OpenRouter structured reasoning details in the client core stream: dialect-streaming collects `delta.reasoning_details[]` entries across chunks (alongside the existing `reasoning` display text) and returns them with the final assistant message; `client-contract` gains the optional `reasoningDetails` field on the assistant `ClientMessage`; unit test (scope: client-contract facade, dialect-streaming facade, tests + affected `module.md`s; expected commit: `feat(universal-client): accumulate openrouter reasoning details`). Result: Completed in commit `feat(universal-client): accumulate openrouter reasoning details`.
113. [DONE] Git Commit: `feat(universal-client): accumulate openrouter reasoning details` (hash: self)
114. [IN_PROGRESS] `harness-ai.phase4.stream3.task2` Return reasoning details through the turn history: the agent loop stores `reasoningDetails` on in-turn assistant messages and `buildRequestBody` serializes them back as `reasoning_details` unchanged for dialects whose thinkingForm is `reasoning_details` (strip stays the behavior for reasoning_content providers — per-dialect history policy, architecture doc section 3.1); no conflict with the extraBody reserved-key boundary; unit test (scope: client-core facade, client-core-http, tests + `module.md`; expected commit: `feat(universal-client): return reasoning details through turn history`).
115. [TODO] Git Commit: `feat(universal-client): return reasoning details through turn history` (hash: TBD)
116. [TODO] `harness-ai.phase4.stream3.task3` Bind the OpenRouter client provider descriptor + registry, INTERNAL: `ProviderId` union += `openrouter-client`, `PROVIDER_KEY_BY_ID` += `openrouter-client -> openRouter` (shared section — the single OpenRouter key serves sessions AND the translation engine), `HTTP_COMPATIBLE_PROVIDER_IDS` += `openrouter-client`, registry `PROVIDERS` += internal entry (name "OpenRouter", moduleId `openrouter-client-provider`); no `CLIENT_PROVIDER_MODELS` entry (live catalog); registry test (scope: provider-registry facade (+ its test), provider-descriptor facade, settings-store facade (one map line) + affected `module.md`s; expected commit: `feat(core-runtime): bind openrouter client provider descriptor (internal)`).
117. [TODO] Git Commit: `feat(core-runtime): bind openrouter client provider descriptor (internal)` (hash: TBD)
118. [TODO] `harness-ai.phase4.stream3.task4` OpenRouter client auth alias: auth-store aliases `openrouter-client` -> the `openRouter` file aliases with the existing `OPENROUTER_API_KEY` env fallback (same key as the translation engine); NO new Settings copy and NO dictionary strings — the OpenRouter tab is preserved as-is per the 2026-07-05 user review fix (scope: provider-auth-store facade + `module.md`; expected commit: `feat(core-runtime): openrouter client auth alias`).
119. [TODO] Git Commit: `feat(core-runtime): openrouter client auth alias` (hash: TBD)
120. [TODO] `harness-ai.phase4.stream3.task5` Add the `openrouter-client-provider` module on the glm-client pattern, honoring EVERY field of the preserved OpenRouter Settings card (2026-07-05 user review fix — no visible control may go dead): `OPENROUTER_DIALECT` (headers `HTTP-Referer`/`X-Title` identifying Harness AI, thinkingForm `reasoning_details`, `usageFromAnyChunk: true`, full tool_choice) with per-turn Core-settings resolution of `apiKey`, `baseUrl` (default `https://openrouter.ai/api/v1` — the Base URL field stays honest), `defaultModel`, and `endpointTag` (a non-default tag joins the request body as `provider: {allow_fallbacks: false, order: [tag]}` through extraBody — the reference wire form); MVP sends NO `reasoning` request parameter (model defaults; reasoning_details are accepted from the stream and returned via history — tasks 1-2); `OpenRouterClientProviderFacade` ProviderAdapter (in-memory sessions, final-history carry-over, `NormalizedProviderEvent` + `stream_error`, Stop-keeps-history; a missing key fails the turn with an English adapter literal); unit test; product tree (scope: `product-parts/provider-runtime/clusters/provider-adapters/modules/openrouter-client-provider/module.md`, `.../src/openrouter-client-provider-facade.ts`, `.../src/openrouter-client-provider.test.mjs`, product-tree json+md; expected commit: `feat(openrouter-client-provider): openrouter endpoint on universal client`).
121. [TODO] Git Commit: `feat(openrouter-client-provider): openrouter endpoint on universal client` (hash: TBD)
122. [TODO] `harness-ai.phase4.stream3.task6` Route Core sessions to the OpenRouter client + liveness: `buildProviderAdapterInstance` case `openrouter-client`, `PROVIDER_IDS` += `openrouter-client`, and the liveness checker validates `openrouter-client` by key presence (same rule as the legacy id) (scope: core-provider-adapter-registration, core-provider-lifecycle, provider-liveness-checker + affected `module.md`s; expected commit: `feat(core-runtime): route sessions to openrouter universal client`).
123. [TODO] Git Commit: `feat(core-runtime): route sessions to openrouter universal client` (hash: TBD)

### Stream: Visibility Switch

124. [TODO] `harness-ai.phase4.stream4.task1` Visibility switch (migration applied): `openrouter-client` and `local-models-client` -> visible (the single visible "OpenRouter" and "Local Models"), legacy `openrouter` and `local-models` -> internal as retired legacy code (NO session-continuity obligation per the 2026-07-04 user decision; module disposition incl. the reference corpus is the Phase 5 afterlife item), renderer `getProviderModel` gains the two new settings cases, and `docs/architecture/UniversalClient.md` records the applied channels (all four client providers now live on the universal client); registry test updated (scope: provider-registry facade (+ test), provider-picker, `docs/architecture/UniversalClient.md` + affected `module.md`s; expected commit: `feat(core-runtime): switch visible openrouter and local models to universal client`).
125. [TODO] Git Commit: `feat(core-runtime): switch visible openrouter and local models to universal client` (hash: TBD)

### Stream: Package And Acceptance

126. [TODO] `harness-ai.phase4.stream5.task1` Package the app for the Phase 4 acceptance: ASK THE USER FOR EXPLICIT PACKAGE CONFIRMATION FIRST (the packaging gate requires a fresh explicit go — nothing is inherited from the materialization order), then `npm run package:mac`; record the package evidence (scope: `docs/evidence/universal-client-openrouter-local-package-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `chore(package): rebuild packaged app with universal client openrouter and local models`).
127. [TODO] Git Commit: `chore(package): rebuild packaged app with universal client openrouter and local models` (hash: TBD)
128. [TODO] `harness-ai.phase4.stream5.task2` User runs live sessions on the packaged build and validates the acceptance checklist: Local Models — base-URL onboarding in Settings, live model list from the configured server, context-length detect/override reflected in usage telemetry, streaming text + tool_calls + thinking on a local server; OpenRouter — the UNCHANGED Settings tab drives the client endpoint (2026-07-05 review fix: key, Base URL, model slug search, endpoint picker + latency panel all keep working, incl. a non-default endpoint tag routing the session), streaming text + tool_calls, reasoning_details behavior on a reasoning model, usage reporting; the localization translation engine keeps working on the same OpenRouter key; the visible picker shows only the client endpoints (scope: user workflow; expected commit: none).
129. [TODO] `harness-ai.phase4.stream5.task3` Record the Phase 4 EVIDENCE from the accepted live run: `docs/evidence/universal-client-openrouter-local-migration-YYYY-MM-DD.md` (endpoint/wire facts for both providers, context-length detection results, reasoning_details verdict, acceptance verdict, translation-engine coexistence) (scope: `docs/evidence/universal-client-openrouter-local-migration-YYYY-MM-DD.md`, `docs/DOCUMENTATION_INDEX.md`, `.harness/plans/todo-plan.md`; expected commit: `docs(evidence): record openrouter and local models migration results`).
130. [TODO] Git Commit: `docs(evidence): record openrouter and local models migration results` (hash: TBD)

## Phase 5 - Synthetic Native Profiles (milestones; owner: Codex + User)

> Milestones: (a) native profile store for the client four (our reference
> wrapper + client tool set, B2 model) read via the same parser as managed;
> (b) apply the profile in each endpoint module (systemPrompt from the frozen
> wrapper + live-context generator); (c) Claude/Codex synthetic native from the
> accepted capture dumps + the "Update Native Profile" command/UI; (d) shared
> live-context generator; (e) package + user acceptance. Carries the archived
> open items (profile storage layout, Update-Native mechanism, Claude `# Memory`
> ballast) and the afterlife removals: the ACP `kimi-provider`, the retired
> `glm-native-provider`, and — after the Phase 4 switch — the retired
> `openrouter-provider`/`local-models-provider` legacy modules (the
> disposition of their `src/reference/**` corpus is decided there; the
> universal client consumed it as the code foundation).
