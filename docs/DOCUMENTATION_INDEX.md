# Harness AI Documentation Index

This is the navigation entrypoint for tracked Harness AI Markdown
documentation. It is a catalog, not a requirement to read everything.

Use this index with:

- `.harness/plans/todo-plan.md` — active recovery owner and current scope.
- `.harness/product-tree/product-tree.md` — readable Product Part / Cluster /
  Module map.

## Session Start

At the beginning of a session, read `.harness/plans/todo-plan.md`, run
`npm run plan:status`, then use this index only to choose the documents
relevant to the active task.

## Canonical Instructions

- `AGENTS.md` — primary agent instructions, architecture rules, plan lifecycle,
  gates, documentation sync requirements and release/package rules.
- `CLAUDE.md` — Claude workspace instruction entrypoint.
- `README.md` — project overview and user/developer orientation.

## Recovery And Product Tree

- `.harness/plans/todo-plan.md` — active execution scope and recovery owner.
- `.harness/plans/todo-plan.template.md` — template for a new active scope.
- `.harness/plans/archive/*.md` — archived closed-scope plans; historical only.
- `.harness/product-tree/product-tree.md` — readable product tree projection.
- `product-parts/**/{product-part.md,cluster.md,module.md}` — live ownership,
  public facade and boundary documentation for every implemented Product Part,
  Cluster and Module; includes the active Core/Application Shell Profile Studio
  modules as they are applied, including the snapshot-driven Studio sidebar
  and read-only inspector, its single-window shell/mode composition, and the
  shared Session Surface module reused by the ordinary shell and Profile
  Studio. The former Settings `profile-settings-ui` module is retired and no
  longer part of the live product tree.

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

- `design-qa.md` — текущий итог Design QA для UX сессий субагентов; содержит
  ссылку на подробное evidence и обязательный final result.
- `docs/evidence/*.md` — verification notes for completed slices, packaging,
  provider migration, UI fixes, runtime behavior, smoke checks and retests.
- `docs/evidence/ProfileStudioMvpImplementation.md` — discussion-ready
  implementation planning for the first Profile Studio production slice:
  separate Core Runtime and Application Shell `profile-studio` clusters,
  module/facade ownership, fixed Claude/Opus creator agent, provider/model
  Draft/Valid lifecycle, structured Core authoring, reusable standard session
  surface, honest inspector states, legacy migration and acceptance gates.
- `docs/evidence/ProfileStudioCreatorAgentBootstrap.md` — accepted continuation
  planning for the Capture-first Profile Creator workflow: user-space composite
  Codex Creator Agent profile, raw JSONL as the only authoritative donor,
  semantic provider-aware analysis by the agent, Core-generated first message,
  fixed/declarative Codex tooling, module ownership, failure contracts and the
  rebuilt-package acceptance path.
- `docs/evidence/profile-studio-mvp-build-2026-07-20.md` — production-build
  evidence for the implemented Profile Studio MVP: final source revision,
  enforced gates, 145-test result, fresh renderer/runtime artifacts, exact
  provider/model routing proof and intentional pre-package limitations.
- `docs/evidence/profile-studio-mvp-package-2026-07-20.md` — user-authorized
  macOS package evidence: exact app/app.asar identity and checksum, packaged
  Profile Studio/Codex/Kimi proof, successful launch and the manual acceptance
  checklist for the current MVP boundary.
- `docs/evidence/profile-studio-activation-repair-package-2026-07-21.md` —
  packaged-acceptance repair for the hidden creator session and empty inspector
  after Draft creation: root causes, exact-target creator binding, new
  app/app.asar identity, known Claude OAuth failure and focused retest steps.
- `docs/evidence/profile-studio-lifecycle-repair-package-2026-07-21.md` —
  packaged repair for creator-session re-entry and managed profile deletion:
  Core containment/session cleanup, in-app confirmation, exact app/app.asar
  identity, launch proof and focused persistence/delete retest steps.
- `docs/evidence/profile-studio-storage-reset-package-2026-07-21.md` — clean
  Profile Studio storage reset and package evidence: canonical target/Creator
  Agent roots, provider-only default setting, removed seeds, recoverable
  runtime cleanup, exact app/app.asar identity and focused retest steps.
- `docs/evidence/turn-timer-planning-2026-07-18.md` — planning document for
  the turn-timer scope: current `ElapsedTotal` behavior, turn-state event
  journal as the persistent timing source, the `turn-timing` Core module and
  `turn-timer` UI module design, and the derivation rules (repeated
  `running`, unclosed turn on shutdown, Total semantics).
- `docs/evidence/kimi-subagent-session-parity-2026-07-19.md` — planning
  document for the Kimi subagent session parity scope: native vs persisted
  session comparison (wire logs `agents/agent-<n>/wire.jsonl` carry thinking,
  text and per-turn usage; our `session-subagent-*.jsonl` carry one result
  message and stub telemetry), the four broken pipeline links (silent ACP
  stream, inert `kimi-agent-*` subscription, status-only synthesized
  lifecycle, stub telemetry), the no-UI-change render contract, and the
  `kimi-subagent-wire` ingestion design with idempotent replay.
- `docs/evidence/turn-timer-package-2026-07-18.md` — turn-timer packaging
  evidence: the three implementation commits (Core `turn-timing` derivation,
  `turn-timer` UI module, session-window wiring), the packaged `app.asar`
  checksum, the binary proof that `deriveTurnTiming` and the timer CSS hooks
  are inside the package, and the per-provider retest checklist.
- `docs/evidence/claude-status-panel-turns-package-2026-07-18.md` — Claude
  status panel Turns parity packaging evidence: the one-line
  `statusPanelCapabilities.showTurns` fix for `claude` (the adapter already
  emitted `turn_completed` and Core already accumulated `turnCount`), the
  extended telemetry facade test, the packaged `app.asar` checksum and the
  extracted-file proof that the new condition is inside the package.
- `docs/evidence/codex-panel-rollback-removal-package-2026-07-18.md` — Codex
  panel Rollback removal packaging evidence: the rollback-action/cache-anchor
  set split in `statusPanelCapabilities` (Codex keeps `Cache: 0`, Cache and
  Turns but no Rollback block; Grok untouched; Core rollback plumbing stays
  wired behind the capability), the extended telemetry facade test, the
  packaged `app.asar` checksum and the extracted-file proof.
- `docs/evidence/grok-panel-rollback-removal-package-2026-07-18.md` — Grok
  panel Rollback removal packaging evidence: `ROLLBACK_ACTION_PROVIDER_IDS`
  emptied so no provider panel surfaces Rollback anymore (Codex/Grok keep the
  `Cache: 0` anchor and Cache/Turns; Core intents stay wired), the updated
  telemetry facade test, the packaged `app.asar` checksum and the
  extracted-file proof.
- `docs/evidence/kimi-model-selection-package-2026-07-16.md` — live Kimi
  three-model catalog/turn evidence, Core routing and Settings/new-session
  selection contract, automated gates, packaged `app.asar` checksum and
  packaged Kimi Settings smoke ahead of user acceptance.
- `docs/evidence/kimi-native-request-capture-2026-07-16.md` — sanitized live
  evidence for Kimi CLI `0.26.0` native capture across all three Coding Plan
  models: exact upstream model ids, distinct system hashes, the shared
  25-tool native schema set, raw/Markdown interpretation, redaction and
  temporary-home cleanup; includes pre-package and packaged Settings UI smokes,
  the macOS arm64 package identity and the packaged `app.asar` checksum.
- `docs/evidence/kimi-settings-cards-package-2026-07-17.md` — Kimi settings
  parity stream packaging evidence: Kimi Versions (single CLI row on the
  native `kimi upgrade` channel) and Kimi Session Continuity cards, the live
  backend version-status check on the installed CLI `0.26.0`, commit gates,
  the packaged `app.asar` checksum and binary-grep proof that the new code
  is inside the package.
- `docs/evidence/kimi-profile-routing-package-2026-07-17.md` — Kimi
  profile-selective routing packaging evidence: the `kimi-native-session`
  ACP backend for native-profile sessions (transport/runtime/normalizer/
  permission bridge), real managed-profile application on the universal
  client, the live pre-package smoke on the installed CLI `0.26.0`
  ("HARNESS NATIVE OK" native turn), commit gates and the packaged
  `app.asar` checksum with binary-grep proof.
- `docs/evidence/kimi-telemetry-package-2026-07-17.md` — Kimi session
  telemetry packaging evidence for the same-day defect feedback: synthesized
  native subagent lifecycle from `Agent`/`AgentSwarm` tool calls, per-turn
  token/cache usage from the CLI session store, status-panel capabilities
  and top usage limits for `kimi-client`, the documented CLI `0.26.0`
  thinking limitation with the best-effort request, the live subagent smoke
  and the packaged `app.asar` checksum.
- `docs/evidence/kimi-swarm-visibility-package-2026-07-17.md` — Kimi swarm
  visibility packaging evidence for the rejected-acceptance diagnosis (the
  session never died: an 18-agent AgentSwarm ran in total ACP silence and
  the user stopped the silent turn): parsed streamed swarm input as the
  card task, live per-agent children polled from the CLI session store,
  per-agent result delivery into child sessions, stop-time terminalization
  of running subagent calls, the live 3-agent dist smoke and the packaged
  `app.asar` checksum with binary-grep proof.
- `docs/evidence/kimi-native-access-package-2026-07-17.md` — Kimi native
  access-and-home packaging evidence for the post-swarm user order: native
  sessions open in the CLI's full-access mode (`{mode, "yolo"}` verified,
  zero permission cards on a Bash turn), run with `HOME` in the
  Claude/Codex-parity workspace provider home with symlinked auth, keep the
  usage/swarm readers on the workspace store, persist the session-id map
  and delete the mapped native session directory with the Harness session;
  includes the live dist smoke and the packaged `app.asar` checksum with
  binary-grep proof.
- `docs/evidence/kimi-native-model-config-package-2026-07-17.md` — Kimi
  native model-config packaging evidence for the thinking investigation:
  the verified provider-side thinking limitation (the CLI rejects
  `thinking=on` for `kimi-for-coding`; wire requests carry
  `thinkingEffort: off`), the model-selection defect (catalog models were
  not declared in the home config, so native sessions silently ran the
  default model) and its fix (bootstrap appends the missing `[models.*]`
  sections; wire proof that a native session really runs on `k3`), plus
  the packaged `app.asar` checksum with binary-grep proof.
- `docs/evidence/kimi-native-thinking-package-2026-07-18.md` — Kimi native
  thinking packaging evidence: the user-driven research that overturned the
  "provider-side limitation" verdict (the migrated legacy config lacked the
  `[thinking]` section and model capabilities; the ACP `thinking=on` option
  overrides the configured level), the full effort pipeline
  (config declarations, adapter→driver→runtime plumbing, settings routing,
  Settings/panel UI, the eager-open relaunch fix trio) and the live k3/max
  smoke, plus the packaged `app.asar` checksum with binary-grep proof.
- `docs/evidence/kimi-acceptance-fixes-package-2026-07-18.md` — Kimi
  acceptance-defect fixes packaging evidence: the three rejected-acceptance
  defects (the synthesized AgentSwarm root card inflating 3 agents to 4,
  dialog autoscroll ignoring the subagent launch divider, the status-panel
  Turns chip wrapping to a second row), their fixes (no swarm root except
  the dead-swarm fallback, divider-aware bottom anchor, one-row flex status
  panel without the rollback-probe modifier) and the packaged `app.asar`
  checksum with binary-grep proof.
- `docs/evidence/kimi-subagent-parity-package-2026-07-19.md` — Kimi subagent
  session parity packaging evidence: native child wire ingestion for
  reasoning/transcript/telemetry/turn lifecycle, Core restart-replay dedupe
  and terminal-result reconciliation, the unsigned arm64 `app.asar` checksum,
  extracted-runtime hash parity with `dist`, launched-package proof and the
  manual user-retest checklist.
- `docs/evidence/kimi-context-update-package-2026-07-18.md` — Kimi context
  and update-channel packaging evidence: the live Coding Plan catalog
  research (k3 is a 1M-context model; "K3 Swarm" is the CLI swarm mode,
  not exposed over ACP 0.26.0), the quartered-k3-window and frozen
  update-state defects, the five-commit stream that fixed them (Core
  catalog context lengths, live model-context reader, workspace-home
  context truth, native-session routing, live CDN update channel) and the
  packaged `app.asar` checksum with binary-grep proof.
- `docs/evidence/kimi-upgrade-fallback-package-2026-07-18.md` — Kimi native
  upgrade fallback packaging evidence: the silent-Update defect (`kimi
  upgrade` refuses to self-update a native standalone-binary install and
  exits 0), the vendor-installer fallback fix with honest failure, the live
  proof run (installer really updated 0.26.0 -> 0.27.0, ACP handshake on
  0.27.0 compatible, swarm still not exposed over ACP) and the packaged
  `app.asar` checksum with binary-grep proof.
- `docs/evidence/plan-user-acceptance-command-2026-07-16.md` — plan
  orchestrator contract for explicit `completion: user-acceptance` tasks,
  guarded acceptance commits and separate user-directed archival.
- `docs/evidence/grok-provider-integration-plan-2026-07-16.md` — verified
  Grok Build CLI/ACP and SuperGrok subscription findings plus the proposed
  native `grok-provider` architecture, profile/tooling contracts, phased
  implementation roadmap, risks and packaged acceptance criteria.
- `docs/evidence/grok-provider-live-verification-2026-07-16.md` — sanitized
  installed `grok 0.2.101` verification of cached subscription auth, dynamic
  models/reasoning, Native/Managed prompt and tools, live usage/cache/billing,
  resume/rewind, permission/ask-user/plan interactions, one-shot MCP stdio
  tool execution and native subagent routing, including the two evidenced wire
  decoder fixes.
- `docs/evidence/grok-provider-package-2026-07-16.md` — macOS arm64 package
  identity, app.asar contents and checksum, full quality/build results, exact
  Codex-parity contract for the Grok lower status panel, and the packaged user
  acceptance checklist.
- `docs/evidence/subagent-session-design-qa-2026-07-11.md` — build и browser
  Design QA гибридного subagent UX: inline timeline entries, recursive sidebar
  tree, child read-only view, detach, rename/regenerate и visual comparison с
  согласованным Figma-прототипом.
- `docs/evidence/session-profiles-package-2026-07-02.md` — packaged
  application rebuild evidence for the session profiles scope ahead of user
  acceptance.
- `docs/evidence/claude-native-setting-sources-package-2026-07-02.md` —
  acceptance-finding fix evidence: Claude Native restores vendor setting
  sources so workspace CLAUDE.md loads; packaged app rebuild for retest.
- `docs/evidence/settings-tabs-fit-package-2026-07-02.md` —
  acceptance-finding fix evidence: content-width Settings tabs fit all nine
  tabs with headroom; packaged app rebuild for retest.
- `docs/evidence/reasoning-translation-target-language-guard-package-2026-07-02.md`
  — acceptance-finding fix evidence: already-target-language reasoning text is
  preserved before provider translation; packaged app rebuild for retest.
- `docs/evidence/session-dialog-autoscroll-package-2026-07-02.md` —
  acceptance-finding fix evidence: session dialog autoscroll stays pinned to
  the lowest visible bubble bottom; packaged app rebuild for retest.
- `docs/evidence/reasoning-sidecar-cleanup-package-2026-07-02.md` —
  acceptance-finding fix evidence: session delete removes reasoning
  translation sidecar JSONL files; packaged app rebuild for retest.
- `docs/evidence/session-id-bar-compact-package-2026-07-02.md` — packaged
  application rebuild evidence for the compact session id bar: stacked
  id + profile chip identity column on the left, limit rows pinned to the
  right edge.
- `docs/evidence/openrouter-model-search-collapse-package-2026-07-02.md` —
  packaged application rebuild evidence for the collapsed OpenRouter model
  search: only the selected match card stays visible after a pick, with an
  in-field refresh control that re-runs the search in all three model blocks.
- `docs/evidence/session-profiles-live-refresh-package-2026-07-02.md` —
  packaged application rebuild evidence for the live session profile refresh:
  a Core profile file watcher publishes `session-profiles:updated` events and
  the Profile Creator list plus the new-session profile step reload without
  an app restart.
- `docs/evidence/provider-network-capture-package-2026-07-02.md` — packaged
  application rebuild evidence for the Provider Native Request Capture feature:
  the record-only `provider-network-capture` Core cluster, adapters aligned to
  native-vendor-default capture, capture RPC/bridge, and the Native Request
  Capture Settings card, ahead of capturing three native pairs.
- `docs/evidence/provider-network-capture-package-2026-07-03.md` — packaged
  application rebuild evidence for the Codex capture fixes: the
  `codex:native-capture` app-server profile forcing the HTTP responses
  transport, body-content target matching (probe prompt + tool count) with
  `capture_proxy_event` diagnostics, and `account-id` header redaction,
  ahead of the user re-capturing the Codex native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-codex-filter.md`
  — second 2026-07-03 packaged rebuild after the transport fix: the Codex body
  rule drops `minimumToolCount` (Codex nests tools outside top-level
  `body.tools`), keeping the probe-prompt matcher, plus safe structural
  diagnostics on body-rejected target requests, ahead of the user re-capturing
  the Codex native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-codex-chunked.md`
  — third 2026-07-03 packaged rebuild: the proxy request reader now decodes
  `Transfer-Encoding: chunked` bodies (Codex streams the responses POST chunked
  with no `Content-Length`, which the diagnostics pinned as the capture
  failure), with the HTTP reader split into `capture-proxy-http.ts`, ahead of
  the user re-capturing the Codex native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-forward.md` —
  fourth 2026-07-03 packaged rebuild, the forward-transit rearchitecture
  (Phase 6.5): diagnostics proved Codex 0.142.5 forces an un-disableable
  WebSocket transport, so the proxy now forwards the request to the real vendor
  and decodes the Codex `response.create` WS frame (deflate stripped); the
  `codex:native-capture` profile was removed and the dump reads `Sent upstream:
  true`, ahead of the user re-capturing the Codex native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-probe-turn.md` —
  fifth 2026-07-03 packaged rebuild: the first Codex forward capture recorded a
  background `memory_consolidation` prewarm frame (8 tools, gpt-5.4) because
  Codex reuses one WS connection for prewarm + real turns; the proxy now decodes
  every frame and captures the one whose payload contains the probe prompt (our
  turn, full ~17-tool native set), ahead of the user re-capturing the Codex
  native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-model-filename.md`
  — sixth 2026-07-03 packaged rebuild: records the Codex tool-layer findings in
  the architecture doc (17 inline tools, feature flags add none, browser/MCP
  tools are a deferred layer) and puts the selected model id in the artifact
  filenames (`<timestamp>-<provider>-<model>-native-request.{jsonl,md}`), ahead
  of the Claude/Kimi re-capture on the forward build.
- `docs/evidence/provider-network-capture-package-2026-07-03-claude-preset.md`
  — seventh 2026-07-03 packaged rebuild: the Claude capture recorded only the
  minimal Agent SDK default (9 tools, 146-char system) instead of the full
  Claude Code CLI; the capture service now applies the same claude_code presets
  as the live Native adapter (`applyClaudeSessionProfile`, kind native), ahead
  of the user re-capturing the Claude native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-interactive-cli.md`
  — eighth 2026-07-03 packaged rebuild: the claude binary assembles its prompt
  by entry mode and the SDK transport can never yield the CLI reference, so
  the Claude capture now drives the provider binary interactively in a real
  pty (`claude-interactive-cli-runner.ts`, python3 `pty.fork` driver, 120s
  capture timeout), ahead of the user re-capturing the Claude native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-kimi-reverse.md`
  — ninth 2026-07-03 packaged rebuild: the Kimi capture was a stub (fake
  `captured`, wire-only path with no payload); replaced with a real
  reverse-forward bridge (`NativeCaptureReverseBridge`) plus a Kimi capture
  service that clones `~/.kimi-code`, rewrites the provider base_url to the
  bridge and runs `kimi acp` with the default agent, ahead of the user
  re-capturing the Kimi native pair.
- `docs/evidence/provider-network-capture-package-2026-07-03-extraction-fixes.md`
  — tenth 2026-07-03 packaged rebuild: two extraction fixes after the user
  re-captured all three — the Kimi markdown `Extracted System Prompt` rendered
  null (extractor now reads `messages[role=system]`), and the Codex capture
  grabbed the memory-consolidation prewarm instead of the probe turn (WS
  capture now filters `response.create` frames by `minimumToolCount`, since the
  prewarm has empty tools), ahead of the user re-capturing Kimi and Codex.
- `docs/evidence/native-capture-artifact-cleanup-package-2026-07-09.md` —
  packaged application rebuild evidence for the Native Request Capture artifact
  cleanup: raw JSONL now contains only captured upstream request records,
  diagnostics move to `.diagnostics.jsonl`, and markdown reports system
  prompt, tool declarations, and developer context as readable
  profile-verification groups.
- `docs/evidence/codex-5.6-model-verification-2026-07-11.md` — Codex 0.144.1
  app-server `model/list` evidence for GPT-5.6 Sol/Terra/Luna, the Sol/Terra
  `ultra` effort contract, three completed live model/effort probes, the
  Settings and Native Request Capture catalog update, Core-owned capture
  reasoning propagation, and the explicit packaged-app boundary.
- `docs/evidence/codex-5.6-model-package-2026-07-11.md` — explicitly
  user-approved macOS arm64 package rebuild for the Codex 5.6 catalog and
  Native Request Capture reasoning propagation, including direct `app.asar`
  content checks, SHA-256, and a successful packaged-app launch smoke check.
- `docs/evidence/codex-0.144.1-native-capture-recovery-2026-07-11.md` — root
  cause and recovery evidence for expired diagnostic certificates, automatic
  CA/leaf rotation, safe TLS/path/WebSocket diagnostics, Codex 0.144.1's
  tool-less `response.create` frame contract, and a successful live GPT-5.6
  Sol Ultra capture with canonical non-empty raw JSONL, followed by direct
  `app.asar` verification and a successful packaged-app launch smoke check.
- `docs/evidence/codex-capture-markdown-package-2026-07-11.md` — explicitly
  user-approved macOS arm64 rebuild after the Codex 0.144.1 Markdown parser
  fix, with readable embedded system instructions and additional tool
  declarations, packaged `app.asar` content checks, SHA-256 and launch smoke.
- `docs/evidence/retired-custom-codex-provider-removal-package-2026-07-11.md`
  — end-to-end removal evidence for the retired custom OAuth Responses
  provider, including a clean-dist package rebuild, direct absence checks in
  `app.asar`, preserved Universal Client modules/adapters, SHA-256, and launch
  smoke.
- `docs/evidence/codex-live-reasoning-package-2026-07-11.md` — live Codex
  app-server reasoning-effort passthrough repair and package evidence: direct
  Core turn options now override legacy/provider-home defaults, focused/full
  tests pass, and the compiled `app.asar` mapping plus launch smoke are
  verified for a fresh GPT-5.6 Sol Ultra retest.
- `docs/evidence/native-capture-reasoning-package-2026-07-11.md` — explicit
  Claude/Codex Native Request Capture reasoning selection, model-specific Core
  capability validation, reasoning-qualified artifact filenames, live Codex
  Sol Ultra plus Claude Sonnet Max captures, and packaged-app inspection and
  launch evidence.
- `docs/evidence/subagent-session-package-2026-07-11.md` — explicitly
  user-approved macOS arm64 rebuild and two-launch packaged proof for Codex
  subagent sessions: three historical descendants materialize with correct
  task names, complete transcripts, `ultra` reasoning, terminal statuses, no
  false nested calls, and no message duplication after restart.
- `docs/evidence/claude-subagent-sessions-package-2026-07-13.md` — explicitly
  user-ordered macOS arm64 rebuild bringing Codex-parity subagent visibility
  to the Claude provider (file-based observer in claude-provider, child
  channels, pseudo-resume, cascade file cleanup) and turning the dialog
  subagent card into a text-only info panel for both providers.
- `docs/evidence/subagent-launch-divider-package-2026-07-13.md` — macOS arm64
  rebuild for the subagent-launch-divider scope: the dialog info panel became
  a single horizontal divider with a centered gap holding the localized
  "Subagents launched" label and a launch counter that grows in place as
  consecutive launches join the group.
- `docs/evidence/claude-cache-telemetry-research-2026-07-14.md` — research
  evidence for the claude-cache-telemetry scope: live headless experiment
  proving Claude SDK returns per-turn cache usage (`cache_read` /
  `cache_creation` input tokens), Agent SDK usage-field rules, the current
  `/context`-scrape token path, and the user decision to show dual
  dash-separated Tokens figures plus a Codex-parity Cache chip.
- `docs/evidence/claude-cache-telemetry-package-2026-07-14.md` — acceptance
  findings and fix rebuild for the claude-cache-telemetry scope: restored
  telemetry crashing every facade entry point, SDK figures coupled to the
  dead `/context` probe, and the probe env frozen onto the global provider
  home by the liveness-preflight race; three fix commits, packaged-asar
  inspection, and the retest checklist.
- `docs/evidence/claude-live-token-usage-package-2026-07-14.md` — Phase 5
  rebuild: per-API-call live Claude token/cache emission (Codex parity),
  full retirement of the legacy `/context` probe subsystem, single-figure
  Tokens display restored, orphaned-`dist/runtime` gotcha documented, and
  packaged-asar inspection.
- `docs/evidence/claude-subagent-token-usage-package-2026-07-14.md` —
  Phase 6 rebuild: the parent Claude panel no longer jumps while subagents
  run (subagent messages filtered out of the parent usage tracker) and
  Claude subagent sessions stream their own live Tokens/Cache from the
  agent-JSONL observer (Codex subagent parity).
- `docs/evidence/claude-cache-telemetry-package-2026-07-14.md` — macOS
  arm64 rebuild for the claude-cache-telemetry scope: the SDK usage tracker,
  the dual-figure Tokens display and the Claude Cache chip landed across
  three commits, all commit-hook gates passed (97 test groups), and the
  packaged app is ready for the pending user-acceptance retest.
- `docs/evidence/codex-child-recovery-package-2026-07-12.md` — explicitly
  user-approved macOS arm64 rebuild after filtering ancestor turns out of
  restored child transcripts and preserving interrupted/failed/completed turn
  semantics; includes real three-thread provider proof and packaged smoke.
- `docs/evidence/dialog-markdown-indicator-package-2026-07-12.md` — explicitly
  user-ordered macOS arm64 rebuild with GFM markdown rendering of assistant
  and thinking replies (tables, code, links) and reshaped sidebar subagent
  indicators (neutral hollow in-flight ring; filled green completed and orange
  interrupted dots); includes asar inspection and packaged launch smoke.
- `docs/evidence/markdown-feedback-package-2026-07-12.md` — rebuild after the
  packaged retest feedback: markdown tables wrap by whole words instead of
  anywhere-breaks that shattered narrow header columns, and thinking plates
  returned to the thin plain-text pre-wrap format (markdown stays only in
  regular assistant replies); includes asar inspection and launch smoke.
- `docs/evidence/sentence-break-package-2026-07-12.md` — rebuild with the
  readability follow-up: every sentence of a regular assistant reply paragraph
  starts on its own display line (sentence-end + uppercase heuristic on text
  nodes, `pre-line` paragraphs keeping author soft breaks; code/tables/lists
  untouched); includes asar inspection and launch smoke.
- `docs/evidence/file-link-package-2026-07-12.md` — rebuild with markdown link
  handling: links wrap as whole units (inline-block, no mid-hyphen breaks) and
  absolute file:line hrefs resolve to `vscode://file` anchors that open the
  workspace file at the referenced line through the existing window-open
  route; includes asar inspection and launch smoke.
- `docs/evidence/web-link-package-2026-07-12.md` — rebuild after the user
  confirmed clickable web links: the window-open allowlist extends to
  `https://`/`http://` beside `vscode://file/` so reply links open in the
  default system browser while every other protocol stays denied; includes
  asar inspection and launch smoke.
- `docs/evidence/relative-link-package-2026-07-12.md` — rebuild with
  workspace-relative link resolution: schemeless hrefs like
  `.harness/plans/todo-plan.md` resolve against the Core-provided active
  workspace root into the same `vscode://file` route (optional
  `:line[:column]`), scheme/anchor hrefs untouched; includes asar inspection
  and launch smoke.
- `docs/evidence/inline-path-package-2026-07-12.md` — rebuild making inline
  code that looks like a workspace file path (slash-separated dotted file
  segment, optional `:line[:column]`) clickable through the same
  `vscode://file` anchor, while ordinary code and non-path tokens stay
  untouched; includes asar inspection and launch smoke.
- `docs/evidence/race-and-cleanup-package-2026-07-12.md` — explicitly
  user-approved combined rebuild fixing the audited terminal-status race
  (serialized provider hydrations, no re-announce of terminally replayed
  children, Core monotonic terminal-status guard with a proven concurrent
  regression test) plus the session artifact cascade cleanup (per-tree event
  JSONL and reasoning translation sidecars deleted); includes asar runtime
  marker inspection and launch smoke.
- `docs/evidence/universal-client-kimi-package-2026-07-04.md` — packaged
  application rebuild for the Phase 2 Kimi auth-gate live validation: the
  visible Kimi runs on the universal client (`kimi-client` endpoint,
  `kimi-for-coding`), the ACP Kimi is internal, and the Kimi Settings tab
  carries the "Kimi For Coding API Key" card for the subscription key.
- `docs/evidence/universal-client-kimi-auth-gate-2026-07-04.md` — the Phase 2
  Kimi auth-gate result: PASSED/ACCEPTED by the user's live run on the
  packaged build — the Kimi Code subscription channel accepts the pasted
  subscription key from our universal client in a real session; wire facts
  (endpoint, model id, auth header, thinking form) recorded from the shipped
  code.
- `docs/evidence/universal-client-glm-package-2026-07-04.md` — packaged
  application rebuild for the Phase 3 GLM migration acceptance: the visible
  GLM provider is `glm-client` on the Core universal client, GLM client
  settings carry API key/model storage, embedded `glm-opencode` production
  runtime support is removed, and the user can restart
  `release/mac-arm64/Harness AI.app` for live validation.
- `docs/evidence/universal-client-glm-migration-2026-07-04.md` — the Phase 3
  GLM migration result: PASSED/ACCEPTED by the user's live packaged-app runs;
  the visible GLM provider is `glm-client`, OpenCode is absent from Settings
  and picker, the residual native GLM Settings block was removed in the
  follow-up build, and legacy-session continuity checks were intentionally
  dropped per the 2026-07-04 user decision.
- `docs/evidence/universal-client-openrouter-local-package-2026-07-05.md` —
  packaged application rebuild for the Phase 4 acceptance: the visible
  OpenRouter and Local Models run on the universal client
  (`openrouter-client` / `local-models-client`), the OpenRouter Settings tab
  is preserved as-is with every field honored per turn, Local Models gains
  the connection card + configured-URL catalog + context-length detection,
  and the legacy reference adapters are internal.
- `docs/evidence/universal-client-openrouter-local-migration-2026-07-05.md` —
  the Phase 4 migration result: ACCEPTED by the user's live packaged-app runs;
  OpenRouter and Local Models work on the universal client (wire facts for
  both endpoints, per-model LM Studio context management incl. the
  reload-timeout acceptance finding and its fix, reasoning_details returned
  unchanged through history, translation-engine coexistence on the shared
  OpenRouter key), completing the client four on our own client.
- `docs/evidence/universal-client-legacy-cleanup-package-2026-07-05.md` —
  packaged application rebuild for the user's acceptance of the two
  2026-07-05 cleanups: the legacy provider modules
  (glm-native/openrouter/local-models/turn-runner) and the ACP kimi-provider
  are removed end-to-end, Kimi is dropped from native capture (Claude/Codex
  only), and the visible six-provider set is unchanged; `release/**` is an
  untracked local build artifact.
- `docs/evidence/session-profiles-retired-bindings-package-2026-07-05.md` —
  packaged application rebuild after the session-profile cleanup that removed
  active bindings to retired provider ids (`kimi`, `glm-native`) from
  `PROFILE_SUPPORTED_PROVIDER_IDS` and the standard seed-profile set.
- `docs/evidence/codex-rollback-package-2026-07-06.md` — packaged
  application rebuild for the standalone Codex rollback scope: Codex provider
  app-server `thread/rollback`, Core-owned Codex rollback intent, Electron/Core
  RPC bridge, and enabled Codex-only Session Rollback control.
- `docs/evidence/codex-rollback-cache-telemetry-package-2026-07-06.md` —
  packaged application rebuild after acceptance fixes: Rollback preserves the
  first two warmup/cache-anchor turns, `Turns` sits next to `Rollback`, and
  provider-reported cached input tokens render as `Cache` beside `Tokens`.
- `docs/evidence/codex-app-server-cache-anchor-package-2026-07-08.md` —
  packaged application rebuild evidence for aligning live Codex app-server
  history mode with Native Request Capture; includes the accepted
  2026-07-08 finding that live app-server must keep
  `persistExtendedHistory: false` for second-visible-turn cache parity.
- `docs/evidence/localization-transfer-2026-06-30.md` — localization transfer
  implementation evidence before packaged application verification.
- `docs/evidence/localization-transfer-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for the localization transfer scope.
- `docs/evidence/localization-ui-repair-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for the interface localization repair.
- `docs/evidence/localization-coverage-cache-repair-packaged-app-2026-06-30.md`
  — packaged application rebuild evidence for Settings localization coverage and
  cache layout repair.
- `docs/evidence/localization-refresh-repair-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for refreshing the open Settings
  localization payload after save/reset.
- `docs/evidence/localization-open-refresh-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for refreshing Settings localization
  payload when the dialog opens.
- `docs/evidence/localization-select-dirty-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for native Settings select dirty-state
  repair.
- `docs/evidence/core-settings-diagnostics-package-2026-06-30.md` — packaged
  application rebuild evidence for Core-owned settings diagnostics logs.
- `docs/evidence/core-restart-failure-package-2026-06-30.md` — packaged
  application rebuild evidence for Core restart failure handling in Settings.
- `docs/evidence/settings-save-responsiveness-package-2026-06-30.md` —
  packaged application rebuild evidence for Settings Save responsiveness after
  localization category changes.
- `docs/evidence/blocking-localization-refresh-package-2026-06-30.md` —
  packaged application rebuild evidence for reference-style blocking
  localization refresh feedback after Settings Save.
- `docs/evidence/packaged-app-process-cleanup-2026-06-30.md` — package script
  evidence for stopping stale packaged Harness AI app/Core processes before
  rebuilding `app.asar`.
- `docs/evidence/settings-full-app-restart-package-2026-06-30.md` — packaged
  application rebuild evidence for replacing Settings restart with full Electron
  app relaunch.
- `docs/evidence/app-relaunch-core-shutdown-package-2026-06-30.md` — packaged
  application rebuild evidence for stopping Core before Electron app relaunch.
- `docs/evidence/localization-runtime-payload-ipc-package-2026-06-30.md` —
  packaged application rebuild evidence for forwarding the browser localization
  runtime payload IPC through the Electron Core process bridge.
- `docs/evidence/remaining-settings-localization-package-2026-06-30.md` —
  packaged application rebuild evidence for remaining Settings localization
  coverage, dynamic OpenRouter description translation, and localization cache
  invalidation by source dictionary fingerprint.
- `docs/evidence/sonnet-alias-description-package-2026-06-30.md` — packaged
  application rebuild evidence for removing the stale concrete Claude Sonnet
  model id from Settings helper copy.
- `docs/evidence/reasoning-translation-prefix-package-2026-07-01.md` —
  packaged application rebuild evidence for translated reasoning prefix
  stability in growing provider streams.
- `docs/evidence/reasoning-translation-reveal-package-2026-07-01.md` —
  packaged application rebuild evidence for preventing translated reasoning
  reveal animation from restarting on growing batches.
- `docs/evidence/openrouter-translation-engines-package-2026-07-01.md` —
  packaged application rebuild evidence for the OpenRouter-backed UI/Reasoning
  Translation Engine options in General Settings.
- `docs/evidence/localization-bundle-cache-engine-key-package-2026-07-01.md` —
  packaged application rebuild evidence for invalidating the localization
  bundle cache when the translation engine changes.
- `docs/evidence/localization-glossary-open-file-package-2026-07-01.md` —
  packaged application rebuild evidence for fixing the Settings "Open glossary
  file" action to create and open the real Core-owned do-not-translate
  glossary file instead of a nonexistent workspace path.
- `docs/evidence/localization-rebuild-translations-package-2026-07-01.md` —
  packaged application rebuild evidence for the Settings "Rebuild
  translations" action that forces retranslation ignoring the localization
  bundle cache, plus the related `CoreRuntimeApi` provider lifecycle split.
- `docs/evidence/localization-glossary-copy-reasoning-terminology-package-2026-07-01.md`
  — packaged application rebuild evidence for correcting stale CodeAI Hub
  glossary example terms and rewording "bubble" to "message" in reasoning
  description copy for cleaner machine translation.
- `docs/evidence/localization-glossary-preferred-translation-package-2026-07-01.md`
  — packaged application rebuild evidence for glossary
  `Term - Desired translation` entries, wired through the existing
  `GlossaryProtector` preferred-translation engine via a new wildcard target
  language.
- `docs/evidence/provider-versions-card-localization-package-2026-07-01.md` —
  packaged application rebuild evidence for localizing two hardcoded Russian
  strings in the provider Versions cards that existed in that evidence slice.

Evidence documents are not the source of truth for future behavior. They are
proof of what was checked in a specific scope. When a new verification slice is
added, add a new evidence file and keep this index entry valid.

## Documentation Catalog Rule

This index covers all tracked Markdown documentation either by explicit path or
by glob. When adding, moving or deleting a tracked `.md` / `.markdown` file,
update this index in the same commit.
