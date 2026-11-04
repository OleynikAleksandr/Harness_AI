# Harness AI Documentation Index

This is the navigation entrypoint for tracked Harness AI Markdown
documentation. It is a catalog, not a requirement to read everything.

Use this index with:

- `.harness/plans/todo-plan.md` — Workflow Kit plan of the current scope.
- `.harness/product-tree/product-tree.md` — readable Product Part / Cluster /
  Module map.

## Session Start

At the beginning of a session, use the Workflow Kit recovery packet
(SessionStart hook or `scripts/workflow recover --format text`), then use this
index only to choose the documents relevant to the active task.

## Canonical Instructions

- `AGENTS.md` — primary agent instructions (English): architecture rules,
  Core authority, quality checks, documentation rules, release/package rules
  and the managed Workflow Kit process section.
- `CLAUDE.md` — Claude workspace instruction entrypoint.
- `README.md` — project overview and user/developer orientation.
- `docs/architecture/OVERVIEW.md` — architecture overview kept by the DOCS task
  of every Workflow Kit round.

## Recovery And Product Tree

- `.harness/plans/todo-plan.md` — Workflow Kit plan: scope, rounds, tasks.
- `.harness/plans/todo-plan.template.md` — legacy `harness-ai-plan-v1`
  template; historical only (Kit-managed path). New scopes are created with
  `scripts/workflow scope:create --input <file.json>`.
- `.harness/plans/archive/*.md` — archived closed-scope plans; historical only.
- `.harness/product-tree/product-tree.md` — readable product tree projection.
- `product-parts/**/{product-part.md,cluster.md,module.md}` — live ownership,
  public facade and boundary documentation for every implemented Product Part,
  Cluster and Module; includes the active Core/Application Shell Profile Studio
  modules as they are applied, including the snapshot-driven Studio sidebar
  and read-only inspector, its single-window shell/mode composition, and the
  shared Session Surface module reused by the ordinary shell and Profile
  Studio, the Core Creator Agent profile loader that owns four-component
  validation/composition, and the Capture-first bootstrap validator. The
  former Settings `profile-settings-ui` module is retired and no longer part
  of the live product tree.

## Proposals

Documents under `docs/proposals/**` are non-authoritative target designs that
still require user discussion and explicit decisions. They must not be treated
as current runtime truth or used to start implementation directly. Once a
proposal is accepted, reconcile it with live code/provider evidence, move the
resulting contract into `docs/architecture/**`, and only then create the active
implementation plan.

- `docs/proposals/ProfileStudio.md` — first-stage Profile Studio proposal:
  a single-window Studio mode with provider/model-scoped persistent Profile
  Creator sessions, a standard Harness AI session surface and a compact tabbed
  inspector with `Overview`, `Custom System Prompt` and `Custom System Tools`;
  its interactive UI approach is an accepted baseline preserved locally under
  `.harness/runtime/prototypes/profile-studio-ui/`, while the proposal as a
  whole remains non-authoritative;
  a two-part prompt made from a reduced Native foundation and concise Custom
  additions; explicit Native Capture donor provenance, exact provider tool
  subsets, the promoted Capture-first correction, manual behavioral validation
  and `Draft`/`Valid` approval. The broader proposal still records a future
  Custom Capture repair route through a separate diagnostic interface. It also
  records Claude reduction, Codex prompt-only limits and full 25-tool Kimi
  parity on the universal client. Normalizer, manual editing, formal behavioral
  benchmarks, revisions and automatic routing remain explicitly outside this
  proposal.

## Architecture

- `docs/architecture/ProfileStudio.md` — accepted Profile Studio MVP and
  Capture-first continuation architecture: separate Core Runtime and
  Application Shell clusters with facade modules, Studio v2 provider/model
  lifecycle, settings-selected composite Codex Creator Agent, automatic fresh
  target Capture and Core-generated first message, structured authoring,
  shared production Session Surface, accepted single-window UI, provider
  capability gates and explicit APPLIED-state tracking.
- `docs/architecture/ClaudeSubagentSessions.md` — Claude subagent
  sessions plan: file-based subagent observer in claude-provider
  (meta.json + agent JSONL tail), provider-neutral subagent events
  reusing the existing Core/UI contract, pseudo-resume for child ids,
  cascade artifact cleanup.
- `docs/architecture/CodeAIHubProviderRuntimeAlignment.md` — CodeAI-Hub
  provider-runtime migration map and provider alignment contract.
- `docs/architecture/FirstElectronSessionSlice.md` — first Electron session
  slice architecture.
- `docs/architecture/NextSessionMode.md` — Core-owned next-session mode
  contract and UI display boundary.
- `docs/architecture/ProjectManagerSettingsParity.md` — Project Manager
  settings parity contract.
- `docs/architecture/ReferenceCoreRuntimeBoundary.md` — out-of-process Core,
  Application Shell boundary, regression preservation and guard contract.
- `docs/architecture/SessionProfiles.md` — runtime-selectable session
  profiles plan: universal profile document set (passport with optional
  `provider` field + prompt + tooling categories) plus individual
  provider-scoped profiles, immutable applied profile snapshot,
  `session-profiles` cluster, adapter application strategies, UI surface
  and phase roadmap.
- `docs/architecture/SubagentSessions.md` — Core-owned Codex app-server
  subagent session tree: structured collaboration events, inline timeline
  entry points, recursive sidebar children, read-only child transcripts,
  detached windows, auto-title and in-app rename contracts.
- `docs/architecture/SessionProfilesV2.md` — session profiles contract
  revision (Russian): single `profile.md` document with YAML frontmatter,
  provider tool inventory (Claude SDK `init` capture + probe, GLM adapter
  export), deny-list "vendor set minus off" application semantics replacing
  the v1 category whitelist, Profile Creator tool selection UI, a standalone
  `provider-network-capture` Core cluster ported from the CodeAI-Hub
  "Provider Native Request Capture" architecture (native capture path with
  Codex forward-transit WebSocket support, per-(provider, model, reasoning)
  capture with reasoning-qualified artifact filenames,
  Settings card, raw upstream-request JSONL, diagnostics JSONL, and readable
  profile-relevant prompt/tool/developer dumps — capture now serves
  Claude/Codex after the Kimi channel was retired 2026-07-05, though
  the accepted 2026-07-03 Kimi dump remains Phase R material), the reordered
  roadmap that builds
  capture first (Phase R is gated on capturing at least three native pairs),
  open questions on prompt research methodology and Codex/Kimi tooling
  application channels.
- `docs/architecture/NativePromptComposition.md` — native prompt anatomy
  (Russian): how a provider request is assembled (system prompt + tools +
  messages), the two system-prompt layers (static cacheable wrapper vs live
  per-session context), prompt caching, the per-provider breakdown from the
  accepted dumps (Claude/Codex/Kimi), the B2 native model (frozen wrapper in
  the Profiles folder + shared live-context generator), the Claude Memory
  ballast decision, and the per-provider application ceilings (Phase 7 —
  Native Profile Unification).
- `docs/architecture/ProfileCompilationAndBenchmarking.md` — managed profile
  compilation and benchmark contract (Russian): Core-owned request
  normalization, role/task classification, compiled system prompt + compiled
  tools, prompt manifest, immutable applied profile snapshot, role-specific
  Harness workflow profiles, tool bundles, provider ceilings, and the
  benchmark model for calibrating Claude/Codex before applying the same
  matrix to universal-client providers.
- `docs/architecture/CodexCacheAnchorThread.md` — Codex app-server
  cache-anchor and `thread/rollback` research (Russian): the 2026-07-06
  rollback metrics, why `last_token_usage` and `thread/read includeTurns=true`
  are the reliable inspection points, and the Codex-only manual validation
  checklist for the Harness session rollback probe before any automation.
- `docs/architecture/UniversalClient.md` — in-house universal client for
  OpenAI-shape providers (Russian, Phase 1 research of the
  universal-client-2026-07-04 scope): the capability set (agent loop, tool
  registry with a source abstraction and the built-in tool layer, request
  parameters and dialect capability profiles, SSE streaming with four
  thinking forms, full-auto permissions MVP, key-based auth incl. the Kimi
  For Coding key channel and auth-gate wire-form check, model catalog,
  context/limits with deferred compaction, event normalization without tool
  progress in MVP), modular extensibility (MCP/skills/subagents as future
  modules) and ownership placement, the OSS survey table (pi, OpenCode,
  Cline, Codex CLI, Goose, Continue and others with licenses), the
  foundation recommendation (CodeAI-Hub reference runtime as the code base,
  OpenCode as the behavior/extensibility reference, its Vercel-AI-SDK runtime
  dependency rejected) and the recorded user decisions.

- `docs/architecture/ReleaseFixes-2026-11-04.md` — fixes of the 2026-11-04
  release: Claude async subagents and removing a project from the app.
- `docs/architecture/ReleaseFixes-2026-11-04-2.md` — round 2 fixes of the
  execution modes release as implemented (Russian, scope
  `release-fixes-2026-11-04-2`): Kit `identity:set --global` with one
  validator, the Core route and the identity form instead of terminal
  commands, Open Project without a name field, the mode card in
  the sidebar, new strings in the usual localization categories with an
  incremental bundle refresh, the mode choice enabling the autopilot,
  the login-shell PATH for agent processes, small Kit fixes (`KIT_VERSION`
  2.1.1 with `.DS_Store`, `kit:conflict-markers`, dup ignore) and the GitHub
  publication task that ends every plan.
- `docs/architecture/workflow-kit/WorkflowKit.md` — root specification of
  the Workflow Kit (Russian, scope `workflow-kit-2026-11-03`): origin from
  Harness rules and Workflow Kit 1.x, the `core-runtime/clusters/project-workflow`
  cluster with its module facades, project files, commands and phases.
- `docs/architecture/workflow-kit/WorkflowKitProcess.md` — Workflow Kit
  process algorithm: scope, tasks, transactional commit, rounds, acceptance,
  closing, carryover, repair, hybrid documentation policy and delivery, the
  conflict-marker guard of every commit, and the orchestrated exception to
  one task per checkout.
- `docs/architecture/workflow-kit/WorkflowKitRecovery.md` — bounded recovery
  packet (sections, budget, round digests), session-start hook and the Core
  autopilot decision/stop reasons, and the autopilot armed by the mode
  choice.
- `docs/architecture/workflow-kit/WorkflowKitQuality.md` — quality profile:
  stack detection, ecosystem catalog, built-in checks (including the
  implicit `kit:conflict-markers`), stages and the Harness AI profile.
- `docs/architecture/workflow-kit/WorkflowKitInstallation.md` — folder
  inspection, install, the global git identity (`identity:set`), doctor,
  Harness plan migration, Core/Electron/RPC/UI integration, provider context delivery and Windows/Linux rules.
- `docs/architecture/workflow-kit/WorkflowKitCoreRpc.md` — detailed contract
  of the Core project workflow routes (`core-project-workflow-rpc.ts`):
  inspect, prepare-project, identity-set, status with `planView`, doctor,
  autopilot, the execution mode card (the choice arms the autopilot), the Kit state watcher; moved out of the
  `core-runtime-process` module.md, which keeps the summary.
- `docs/architecture/workflow-kit/WorkflowKitExecutionModes.md` — execution
  modes as implemented (Russian, scope `execution-modes-2026-11-04`):
  `parallelSafe` labels and the `execution` block, the mode choice
  (`scope:propose`/`scope:choose`/`scope:proposal`) and the Core-built card
  in the sidebar,
  sequential by one agent, the orchestrator order, Kit-formed git identity,
  agent roles in recovery and `AGENTS.md`, Kit status, the Core watcher, the
  plan view with executor binding in the Harness sidebar, the orchestrated
  autopilot and small fixes.
- `docs/architecture/workflow-kit/WorkflowKitOrchestration.md` — the
  orchestrated part of the execution modes (Russian, sections 5–7):
  scheduler, `assignment:*` commands, executor attach, plan and path
  contract, worktree setup, integration proof, merge journal, conflicts,
  failed checks, crash recovery, cleanup and first-parent history.

## Product Part Documentation

Every Product Part, Cluster and Module owns its local Markdown contract:

- `product-parts/*/product-part.md` — Product Part purpose, owned clusters,
  responsibilities and out-of-scope boundary.
- `product-parts/*/clusters/*/cluster.md` — Cluster boundary, owned modules
  and facade/ownership rules.
- `product-parts/*/clusters/*/modules/*/module.md` — Module responsibility,
  public facade, inputs, outputs and owned paths.

Application Shell browser localization docs live under
`product-parts/application-shell/clusters/browser-localization/**` and follow
the same cluster/module contract.

Profile Studio's infrequently changed default Creator Agent setting is owned by
`product-parts/application-shell/clusters/settings-surface/modules/profile-studio-settings-ui/module.md`;
interactive profile authoring remains documented under the separate
Application Shell Profile Studio cluster.

These files are code-adjacent contracts. When behavior, ownership, facade
surface, process boundary, provider semantics, UI display contract or runtime
state changes, update every affected product-part/cluster/module document in
the same commit.

The native provider module catalog includes `grok-provider`, whose contract is
tracked by the module glob above and whose implementation baseline is recorded
in `docs/evidence/grok-provider-integration-plan-2026-07-16.md`.

The provider-adapter catalog also includes the diagnostic-only
`kimi-native-capture` module. It drives the installed Kimi CLI solely for
Native Request Capture; Kimi production sessions remain on
`kimi-client-provider` and the Core universal client.

Provider readiness docs are part of this product documentation tree under
`product-parts/provider-runtime/clusters/provider-readiness/**`, including the
readiness registry, liveness checker, and workspace provisioner modules.

## Evidence

- `docs/evidence/WorkflowKitIntegrationMap.md` — planning-time map of the
  Harness build, test, packaging, Core RPC, Electron host, provider session
  and renderer seams used by the Workflow Kit scope (file/line snapshot).
- `design-qa.md` — текущий итог Design QA для UX сессий субагентов; содержит
  ссылку на подробное evidence и обязательный final result.
- `docs/evidence/EVIDENCE_INDEX.md` and `docs/evidence/EVIDENCE_INDEX_2.md` —
  catalog of the individual evidence documents (split for the document budget).

## Documentation Catalog Rule

This index covers all tracked Markdown documentation either by explicit path or
by glob. When adding, moving or deleting a tracked `.md` / `.markdown` file,
update this index in the same commit.
