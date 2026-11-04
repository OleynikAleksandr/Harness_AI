# Claude Provider Module

## Responsibility

Harness-packaged migration of the CodeAI-Hub Claude provider module.

## Public Facade

`ClaudeProviderFacade`

## Inputs

- Provider turn request.
- Active workspace path and selected Claude model from Core-owned settings.
- Claude provider-home/auth state.
- CodeAI-Hub-compatible applied turn options for model, thinking, effort, tools, system prompt/runtime profile, and structured output.
- Workspace `AGENTS.md`, read by provider runtime and injected inline into the Claude SDK system prompt.

## Outputs

- Provider events from the migrated Claude Agent SDK session/runtime path.
- A provider-neutral `structured_output` event carrying the raw JSON object
  returned by any Agent SDK `outputFormat` schema. Existing workflow-specific
  projection remains additive; Provider Runtime does not interpret Profile
  Studio fields or mutate profile state.
- Visible thinking/reasoning dialog messages emitted by the migrated Claude stream router and thinking dialog emitter.
- Provider usage/context telemetry.
- Claude usage-limit telemetry read by this provider module through the
  Claude/Anthropic OAuth probe and rate-limit headers.
- Claude Agent SDK runs with the active workspace as `cwd`, and the active workspace path plus `AGENTS.md` instructions are injected into the SDK system prompt by provider runtime.
- Provider home storage is Harness-owned: workspace sessions use `<workspace>/.harness/runtime/providers/claude/home`, and non-workspace fallbacks use `~/.harness-ai/providers/claude/home`.
- The facade accepts an explicit `providerHomePath` for Core-owned global-home
  liveness preflight without treating that global home as a workspace root.
- `ensureWorkspaceHome(workspacePath)` creates the workspace Claude provider
  home and carries over Keychains/`.claude.json` auth files without starting
  the Claude CLI or Agent SDK.
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the Claude CLI session transcript (`home/.claude/projects/**/<providerSessionId>.jsonl`) for a removed session, leaving shared `.claude.json`, caches and mcp-logs intact. A parent deletion also removes the session's `<providerSessionId>/` directory (subagent meta/transcript files live there); a child id (`agent-<agentId>`) removes only that subagent's meta/transcript pair — Core cascades child deletion on parent delete.
- Packaged macOS app setup resolves `npm` through GUI-safe PATH augmentation before installing/checking the Claude Agent SDK, then resolves the Claude executable from the SDK platform optional dependency layout.

## Reference Alignment

- Source of truth: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/**`.
- The module keeps the CodeAI-Hub SDK manager, session manager, auth/home bridge, runtime profile, message processor, stream router, live buffers, thinking emitter, and focused runtime helpers under `src/reference/**`.
- The Harness facade is only an adapter from the Harness provider contract into the migrated reference provider module.
- Translation compatibility is currently local to this provider module and preserves the reference contract without moving translation truth into UI.
- Harness-specific workspace prompt injection is a focused additive helper around the migrated SDK prompt so Claude receives workspace path and `AGENTS.md` without relying on renderer state or native filesystem discovery.

- Session profile application layer (`claude-profile-application.ts`):
  managed payloads replace the full `systemPrompt` and explicitly keep SDK
  isolation (`settingSources: []`) so profile instructions stay the only
  workflow truth. Studio payloads carrying structured tools set the SDK
  `tools` option to their exact validated Native names (direct `name` or
  OpenAI-shape `function.name`); malformed/duplicate names fail the provider
  bind rather than silently widening or partially applying the profile. Legacy
  v1 payloads without explicit tools retain the category-mapped whitelist.
  Native switches
  prompt/tools to the `claude_code` presets AND restores the vendor setting
  sources `["user", "project", "local"]` per the Native restoration
  contract (docs/architecture/SessionProfiles.md): the SDK loads workspace
  `CLAUDE.md` only when `settingSources` includes `project`, so isolation
  mode is not neutral process policy for Native (acceptance finding
  2026-07-02 — Native sessions saw neither CLAUDE.md nor the legacy inline
  AGENTS.md injection, which the preset replaces). The `user` scope reads
  the isolated provider home, not the OS user home. Permission mode, home
  isolation and auth stay Harness process policy in both modes; legacy
  sessions (no profile kind) keep the pre-profile hardcoded
  prompt/whitelist and isolation untouched. Applied details (`mode`,
  `profileId`, `contentHash`, `systemPrompt: full-replacement`, `toolMode`,
  exact `toolWhitelist`, managed/native `settingSources`) return to Core via
  `ProviderSessionStartResult` for the immutable snapshot.
- Workflow Kit context (`claude-workspace-context.ts`): `createSession` and
  `resumeSession` keep `ProviderSessionStartOptions.workspaceContext` on the
  active session. After the profile layer, `appendClaudeWorkspaceContext`
  adds it to the system prompt: native sessions get it as the `append` of
  the `claude_code` preset, managed and legacy string prompts end with it.
  Every Claude process gets `HARNESS_WORKFLOW_RECOVERY=host`, so the
  project SessionStart hook (loaded by native sessions from
  `.claude/settings.json`) returns no duplicate context.
- Legacy category mapping (categories only filter Claude's OWN native tools):
  `file-read` -> Read, Glob, Grep; `file-write` -> Write, Edit; `shell` ->
  Bash; `web` -> WebSearch, WebFetch; `git`/`tests` -> no dedicated Claude
  tools (follow the shell category via Bash).
- `claude-sdk-manager-types.ts` holds the manager option/settings shapes,
  split out to keep `claude-sdk-manager.ts` under the 500-line cap.
- Subagent file layer (`src/reference/subagents/claude-subagent-files.ts`,
  docs/architecture/ClaudeSubagentSessions.md): reads the Claude CLI native
  subagent storage next to the parent transcript
  (`<sessionId>/subagents/agent-<agentId>.meta.json` + `.jsonl`) — directory
  scan with meta parsing, incremental JSONL tail that only advances past
  fully terminated lines, and `toolUseResult` terminal-status extraction
  from parent records. The parent transcript is located by scanning the
  projects-root slug directories (`findParentTranscriptPath`) because the
  CLI derives the slug from its cwd — the facade-configured slug must not
  be trusted (acceptance finding 2026-07-13). File reading is the
  sanctioned native channel for Claude subagents (no structured RPC
  exists), mirroring the accepted context-usage tail reader precedent.
- Subagent event normalizer (`claude-subagent-event-normalizer.ts`): pure
  mapping from the file layer into the provider-neutral subagent contract —
  meta.json becomes `subagent_control` (spawn, `callId` = toolUseId) plus
  `subagent_session` (`agentRole` = agentType, task/title = description),
  `toolUseResult` becomes a terminal `subagent_status`
  (completed/interrupted, `is_error` or unknown statuses map to failed),
  and transcript records project text/thinking blocks into the same
  provider message payloads the primary stream emits (stable
  `<uuid>::subagent::<block>` ids for Core dedupe). Child provider session
  ids are `agent-<agentId>` so resume/cleanup can tell them apart from
  primary UUID sessions.
- Subagent observer (`claude-subagent-observer.ts`): per parent session
  coordinator over the file layer — turn-scoped polling (default 1.5 s)
  plus a final scan on turn end so late writes are never dropped, and a
  hydration scan on (re)subscribe that replays existing subagent files.
  Background (async) agents: the parent's `toolUseResult` with
  `status: "async_launched"` is not terminal (`extractSubagentAsyncLaunch`
  marks the agent as background); its end is the later
  `<task-notification>` (`queue-operation` enqueue or the delivered `user`
  message, `extractSubagentTaskNotification`: `<task-id>` = agentId,
  `<status>` completed/failed, killed/stopped/cancelled → interrupted).
  Notifications for ids the observer does not track (background shell
  commands) are ignored. After the parent turn ends the poll continues
  while a background agent launched in a live scan has no terminal status;
  launches first read by a hydration (dead CLI process after a restart)
  never keep the poll alive. `close()` stops polling for good after one
  last scan.
  All scans run through one serialized chain; spawn/terminal events replay
  at most once per agent per process (Core's persisted history and
  monotonic terminal guard absorb cross-restart replays). Hydration marks
  terminal-less agents `interrupted`; live scans keep them `running`. The
  spawn is re-announced once when the model becomes known from the first
  transcript record so the Core call card shows it. Terminal statuses are
  emitted into the CHILD channel (`agent-<agentId>`): Core's
  `handleStatusEvent` accepts `subagent_status` only on the subagent
  session's own channel and silently drops it on the parent channel
  (acceptance finding 2026-07-13, verified with an instrumented packaged
  build). Read terminal results stay pended until their emit succeeds — the
  parent cursor has already advanced past them, so a throwing listener must
  not lose them; per-agent replay errors and scan errors are reported
  through the adapter reporter instead of being swallowed.
- Subagent adapter wiring (`claude-provider-adapter.ts`): one observer per
  bound parent session, created on create/resume (both hydrate existing
  files) with the projects root dir (the observer locates the cwd-derived
  slug directory itself, lazily — the transcript only exists once the
  first turn streams); `turn_started`/`turn_completed`/`turn_failed`
  messages open and close the polling window; subagent events go to the parent channel and
  transcript messages to `agent-<agentId>` child channels through the
  existing `dispatchMessage` buffering, so Core's `adoptProviderSession`
  subscription picks them up. `resumeSession` returns child ids as-is
  (pseudo-resume — a subagent is not an SDK session), `closeSession` closes the parent observer (`close()`), and for a
  child only clears channel state, and session-id promotion retargets the
  observer via `updateParentSession`.
- Native request capture (`claude-native-request-capture-service.ts`,
  reached through the adapter's `captureNativeRequest`): a record-only
  diagnostic path that records the **original interactive CLI wrapping**. The
  claude binary assembles its system prompt and inline tool set by entry mode
  (SDK stream-json transport -> SDK identity + 9 inline tools, even with the
  claude_code presets; `-p` print mode -> SDK identity + 26 tools; interactive
  TTY -> "You are Claude Code, Anthropic's official CLI for Claude." + the
  full inline tool set + the agents system message) and no SDK query option
  switches that mode, so the service does NOT go through `sdkModule.query`:
  it drives the provider binary interactively in a real pty via
  `claude-interactive-cli-runner.ts` — system `python3` `pty.fork` driver
  (preflight error when python3 is missing), onboarding/trust pre-acceptance
  upsert into the provider-home `.claude.json` (written ONLY when a
  prerequisite is missing: that file is a symlink to the user's live Claude
  config via the auth home-bridge), boot wait -> type probe -> submit ->
  drain -> self-terminate on a timer (the capture orchestrator never kills
  the provider process; the forward proxy capture wins the race). The PTY
  command applies the Core-validated model with `--model` and the explicit
  capture reasoning with `--effort low|medium|high|xhigh|max`; the applied
  envelope records both values. Claude `ultracode` is not sent as an effort
  because it is a separate session-orchestration setting. The run inherits
  the provider auth env (`HOME` -> provider home,
  `CLAUDE_USE_CLI_AUTH`) plus the diagnostic proxy env (`HTTPS_PROXY`/
  `ALL_PROXY` + `NODE_EXTRA_CA_CERTS`/`SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE`).
  The managed-vs-vanilla comparison and applied turn config were removed;
  only recording remains (`docs/architecture/SessionProfilesV2.md`,
  decision 5).
- SDK usage tracker (`claude-sdk-usage-tracker.ts`): reads the last-API-call
  usage from the `assistant`/`result` Agent SDK stream messages already
  flowing through `message-processor.ts`'s `dispatchMessage`, without a
  second CLI subprocess. Dedupes repeated `assistant` messages that share
  one `message.id` (parallel tool_use content blocks report the same
  API-call usage), ignores subagent messages interleaved into the main
  stream (`parent_tool_use_id` set — their usage describes the SUBAGENT
  context and previously made the parent panel jump while subagents ran;
  2026-07-14 fix) and keeps the snapshot — `inputTokens`,
  `cacheReadInputTokens`, `cacheCreationInputTokens`, `outputTokens`, plus
  `contextWindow` merged in from the turn's `result.modelUsage` once
  reported — directly on `ActiveSession.sdkUsage` so other messaging
  collaborators can read it off the session object they already receive
  (`docs/evidence/claude-cache-telemetry-research-2026-07-14.md`).
- Token usage snapshot (`claude-token-usage-snapshot.ts`, pure — no
  CLI/session imports so it is unit-testable on its own): the SDK usage
  tracker's snapshot is the ONLY token-usage source — the legacy `/context`
  CLI probe subsystem retired on 2026-07-14 by user order after its figure
  and the SDK figure matched. `buildTokenUsageSnapshot` maps
  `ActiveSession.sdkUsage` to `{used, limit, cached}`: `used` = last-call
  `inputTokens + cacheReadInputTokens + cacheCreationInputTokens` (current
  context size), `cached` = last-call `cacheReadInputTokens` (Codex parity
  for the Cache chip), `limit` = tracker `contextWindow` (0 until the turn's
  `result.modelUsage` reports it — the telemetry facade then keeps its
  previous limit).
- Live per-cycle token usage (`claude-live-usage-emitter.ts`, Codex parity):
  right after the SDK usage tracker records an assistant message,
  `message-processor.ts` asks the emitter to forward the
  `buildTokenUsageSnapshot` result as a `token_usage` stream event, deduped
  per provider session until the figures change — the status panel ticks
  after every agent-loop API call instead of waiting for turn end.
- Subagent token usage (Codex parity, 2026-07-14): the subagent observer
  extracts `message.usage` from agent-JSONL assistant records
  (`extractClaudeSubagentTokenUsage`: `used` = input + cache_read +
  cache_creation, `cached` = cache_read) and emits the newest figures to the
  child session channel as the same `token_usage` stream event the primary
  channel uses, deduped per agent until the figures change; `limit` stays 0
  (the JSONL never reports a context window) so the telemetry facade keeps
  its default.
- Turn-completion token usage: `claude-usage-sync.ts`'s
  `readCompletionPayload` builds the same tracker snapshot for the
  `turn_completed` payload (no CLI subprocess; `postTurnTokenUsageUnavailable`
  only when no SDK usage streamed) and refreshes the shared usage limits.
- Per-use usage environment (`ClaudeUsageEnvironmentConfig.resolveEnv`,
  2026-07-14 fix): the rate-limit reads in `claude-usage-sync.ts` resolve the
  adapter auth environment at every use instead of a one-shot snapshot, which
  raced the global-home liveness preflight (`withProviderHomeEnv`) and froze
  onto `~/.harness-ai/providers/claude/home` while sessions live in the
  workspace-local provider home.

## Live Model Catalog

- `claude-model-catalog.ts` (verified 2026-11-03 on Claude Agent SDK
  0.3.317 in the packaged app): `refreshClaudeModelCatalog` imports the global npm Claude Agent SDK the
  sessions use (`<npm prefix -g>/lib/node_modules/@anthropic-ai/
  claude-agent-sdk/sdk.mjs`),
  opens one idle `query` (no prompt is ever sent) with the provider auth
  environment (`HOME` -> `<harness home>/providers/claude/home`,
  `CLAUDE_USE_CLI_AUTH`, `CLAUDE_SUBSCRIPTION_MODE`, `ANTHROPIC_API_KEY` and
  `CLAUDECODE` stripped, the SDK's own platform executable, no setting
  sources), reads `supportedModels()` within 30 seconds and closes the
  query. Only family alias rows are served (user decision 2026-11-03): ids
  without a version once the `[1m]` context suffix is dropped (`opus`,
  `fable`, `sonnet`, `haiku`, also `opus[1m]`); the `default` row and pinned
  versions (`claude-opus-4-8`, `claude-sonnet-5`, …) are skipped. Each kept
  row becomes a `ProviderModelDescriptor`: `id` from `value` (the id the SDK
  accepts as `model`), `label` from `displayName`, `description`, and
  `reasoningEfforts` from `supportedEffortLevels` (none when absent). A successful read replaces the
  catalog served through `providerDescriptorFacade.setClaudeModels` and is
  persisted in the SDK row shape to
  `<HARNESS_AI_HOME or ~/.harness-ai>/providers/claude/model-catalog.json`;
  the persisted file is applied synchronously once per process before the
  first live read, a successful read is memoized for 15 minutes, and a
  failed read (SDK not installed, auth missing, timeout) keeps the served
  catalog. `refreshClaudeModelCatalog({ force: true })` re-reads inside the
  TTL; Core uses it right after the Claude SDK was updated so the new SDK's
  descriptions replace the memoized ones. Core calls it first in
  `CoreRuntimeApi.initialize()`; the facade re-exports
  `refreshClaudeModelCatalog`.
- Model ids are Anthropic family aliases; which model an alias means and its
  display name come from the CLI bundled with the installed SDK. Verified
  2026-11-03 in the packaged app: SDK 0.3.317 lists `opus` "Opus 5.5",
  `fable` "Fable 5.1", `sonnet` "Sonnet 5.5", `haiku` "Haiku 5.5" (all with
  efforts) plus eight pinned versions (Opus 5/4.8/4.7/4.6, Sonnet 5/4.6,
  Fable 5, Haiku 4.5), which are not served; SDK 0.3.207 still meant Opus
  4.8 / Fable 5 / Sonnet 5 / Haiku 4.5. A reader started inside a Claude Code
  session inherits that session's environment (`ANTHROPIC_BASE_URL`, account
  variables) and gets a reduced list; the packaged app's clean environment
  gets the full one.

## Claude SDK Install

- Claude runs like Codex (user decision 2026-11-03): one shared install of
  the program, session data in the Harness provider homes. Sessions keep
  `HOME` = `<workspace>/.harness/runtime/providers/claude/home` (projects,
  history, auth bridge), while the program is the user's global npm Claude
  Agent SDK and its bundled platform binary. The former Harness-private copy
  under `~/.harness-ai/providers/claude/sdk` was deleted on request
  (2026-11-03) and nothing points at it any more.
- `claude-sdk-updates.ts` owns that install: `claudeSdkPrefix()` resolves
  `npm prefix -g` once per process (it honours the user's `.npmrc` and
  `npm_config_prefix`; the GUI PATH gets the Homebrew/system npm locations
  added); when npm cannot answer it throws (not cached, so the next call
  asks npm again) — there is no fallback install, so a Claude session then
  fails to start with that error and the catalog read keeps the served
  catalog;
  `claudeSdkDirectory()` is `<prefix>/lib/node_modules/@anthropic-ai/
  claude-agent-sdk` (no `lib` on Windows); `readClaudeSdkVersion()` reads the
  installed `package.json` version (`null` when absent or when npm cannot
  resolve the prefix); `updateClaudeSdk()`
  runs `npm install -g @anthropic-ai/claude-agent-sdk@latest --force` with
  that prefix pinned and returns the version now on disk (npm errors
  propagate).
- `ClaudeProviderFacade` passes `claudeSdkDirectory()` as the session
  installer path, so `SDKInstaller.ensureInstalled()` finds the global SDK
  (`npm list -g`) or, when it is missing, installs it globally; the live
  catalog reader imports the same SDK. The facade re-exports
  `readClaudeSdkVersion` and `updateClaudeSdk`; Core routes the Settings SDK
  version row, its update button and the Claude auto-update through them.

## Owned Paths

- `module.md`
- `src/**`
