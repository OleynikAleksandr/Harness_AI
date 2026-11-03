# Harness AI Evidence Index — Part 2

Catalog of verification evidence under `docs/evidence/**`, split from
`docs/DOCUMENTATION_INDEX.md` to keep every document within the Workflow Kit
document budget. Part 1: `EVIDENCE_INDEX.md`.

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
