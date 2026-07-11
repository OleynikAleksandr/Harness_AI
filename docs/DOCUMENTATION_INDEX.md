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

## Architecture

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
- `docs/architecture/SessionProfilesV2.md` — session profiles contract
  revision (Russian): single `profile.md` document with YAML frontmatter,
  provider tool inventory (Claude SDK `init` capture + probe, GLM adapter
  export), deny-list "vendor set minus off" application semantics replacing
  the v1 category whitelist, Profile Creator tool selection UI, a standalone
  `provider-network-capture` Core cluster ported from the CodeAI-Hub
  "Provider Native Request Capture" architecture (native capture path with
  Codex forward-transit WebSocket support, per-(provider, model) capture,
  Settings card, raw upstream-request JSONL, diagnostics JSONL, and readable
  profile-relevant prompt/tool/developer dumps — capture now serves
  Claude/Codex/CodexUC after the Kimi channel was retired 2026-07-05, though
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
- `docs/architecture/CodexManagedPromptToolingEconomics.md` — CodexUC
  managed prompt/tooling economics finding (Russian): benchmark conclusion
  that task-specific control over system prompt and system tooling can
  materially reduce token/cache footprint without observed completion-quality
  loss, while provider adapters still own phase/tool-loop protocol semantics.
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
- `docs/architecture/ClaudeProviderResearch.md` — Claude provider research
  note (Russian, Phase 1 of the claude-provider-research-2026-07-08 scope):
  what Harness controls for Claude across system prompt, tool inventory,
  settings sources, memory/context ballast, phase/event semantics,
  cache/context/resume and benchmark design, each explicitly compared against
  the closed Codex/CodexUC findings; the EXISTS/ABSENT summary and the open
  research questions for the next cycles.

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

These files are code-adjacent contracts. When behavior, ownership, facade
surface, process boundary, provider semantics, UI display contract or runtime
state changes, update every affected product-part/cluster/module document in
the same commit.

Provider readiness docs are part of this product documentation tree under
`product-parts/provider-runtime/clusters/provider-readiness/**`, including the
readiness registry, liveness checker, and workspace provisioner modules.

## Evidence

- `docs/evidence/*.md` — verification notes for completed slices, packaging,
  provider migration, UI fixes, runtime behavior, smoke checks and retests.
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
- `docs/evidence/codex-uc-reasoning-effort-package-2026-07-07.md` —
  packaged application rebuild evidence for the CodexUC request-body fix:
  Core-selected Codex reasoning effort overrides native-bundle template
  `reasoning.effort` while CodexUC keeps route-owned `summary: "concise"`.
- `docs/evidence/codex-uc-response-feedback-package-2026-07-07.md` —
  packaged application rebuild evidence for the CodexUC response-feedback
  diagnostic: redacted provider feedback logs requested reasoning and backend
  `response.created` / `response.completed` reasoning metadata when present.
- `docs/evidence/codex-uc-detailed-summary-package-2026-07-07.md` —
  packaged application rebuild evidence for switching CodexUC live Responses
  requests from low-value `summary: "concise"` to backend-accepted
  `summary: "detailed"` for user retest.
- `docs/evidence/codex-app-server-cache-anchor-package-2026-07-08.md` —
  packaged application rebuild evidence for aligning live Codex app-server
  history mode with Native Request Capture so cache-anchor parity can be
  retested against CodexUC synthetic-native sessions; includes the accepted
  2026-07-08 finding that live app-server must keep
  `persistExtendedHistory: false` for second-visible-turn cache parity.
- `docs/evidence/codex-uc-custom-tool-call-package-2026-07-08.md` —
  packaged application rebuild evidence for the CodexUC native custom tool-call
  loop: streamed `response.custom_tool_call_input.*`, native `custom_tool_call`
  normalization, freeform `apply_patch` executor arguments, and the package path
  for user retest.
- `docs/evidence/codex-uc-phase-protocol-retest-2026-07-08.md` —
  packaged-app retest evidence for the CodexUC adapter-owned phase protocol:
  intermediate assistant output persisted as `commentary`, final output emitted
  only through the `final_answer` sentinel, and token/cache parity with Codex
  app-server benchmark behavior.
- `docs/evidence/claude-electron-profile-economics-experiment-2026-07-08.md`
  — preparation brief for the Claude full/native vs minimal Electron benchmark:
  two seeded test workspaces, exact first prompt, comparison criteria and the
  minimal Claude profile requirements derived from the CodexUC lean Electron
  profile.
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
