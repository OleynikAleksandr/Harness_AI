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
  "Provider Native Request Capture" architecture (capture-and-abort CONNECT
  proxy, per-(provider, model) capture, Settings card, readable prompt/tool
  reference dumps for Claude/Codex/Kimi), the reordered roadmap that builds
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
