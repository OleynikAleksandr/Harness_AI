# Harness AI Evidence Index — Part 1

Catalog of verification evidence under `docs/evidence/**`, split from
`docs/DOCUMENTATION_INDEX.md` to keep every document within the Workflow Kit
document budget. Part 2: `EVIDENCE_INDEX_2.md`.

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
- `docs/evidence/profile-studio-creator-bootstrap-package-2026-07-21.md` —
  packaged Capture-first Profile Creator Agent evidence: composite user-space
  Codex profile, Core-owned fresh Native Capture and first-message dispatch,
  declarative Codex target tooling, rejected `oneOf` first-turn evidence,
  Codex-compatible `toolsJson` schema repair, Core-owned Settings communication
  language, accessible three-pane resize, provider-normalized Codex
  commentary/final `structured_output` response projection, exact app/app.asar
  identities and the focused manual acceptance checklist.
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
- `docs/evidence/live-provider-model-catalogs-package-2026-11-02.md` — live
  provider model catalogs packaging evidence: Core-owned live Kimi
  (`/coding/v1/models`), Codex (app-server `model/list`) and Claude
  (SDK `supportedModels()`) catalogs with persistence and fallbacks, Settings
  served through `list-provider-model-catalogs`, the live catalog read from the
  built runtime and the packaged `app.asar` checksum with marker proof.
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
