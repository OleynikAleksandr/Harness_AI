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
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the Claude CLI session transcript (`home/.claude/projects/**/<providerSessionId>.jsonl`) for a removed session, leaving shared `.claude.json`, caches and mcp-logs intact.
- Packaged macOS app setup resolves `npm` through GUI-safe PATH augmentation before installing/checking the Claude Agent SDK, then resolves the Claude executable from the SDK platform optional dependency layout.

## Reference Alignment

- Source of truth: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Claude_Module/src/**`.
- The module keeps the CodeAI-Hub SDK manager, session manager, auth/home bridge, runtime profile, message processor, stream router, live buffers, thinking emitter, and focused runtime helpers under `src/reference/**`.
- The Harness facade is only an adapter from the Harness provider contract into the migrated reference provider module.
- Translation compatibility is currently local to this provider module and preserves the reference contract without moving translation truth into UI.
- Harness-specific workspace prompt injection is a focused additive helper around the migrated SDK prompt so Claude receives workspace path and `AGENTS.md` without relying on renderer state or native filesystem discovery.

- Session profile application layer (`claude-profile-application.ts`):
  managed payloads replace the workflow `systemPrompt`, set `tools` to the
  category-mapped whitelist and keep SDK isolation (`settingSources: []`)
  so profile instructions stay the only workflow truth; native switches
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
  `profileId`, `contentHash`, `toolWhitelist`, native `settingSources`)
  return to Core via `ProviderSessionStartResult` for the immutable
  snapshot.
- Category mapping (categories only filter Claude's OWN native tools):
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
  from parent records. File reading is the sanctioned native channel for
  Claude subagents (no structured RPC exists), mirroring the accepted
  context-usage tail reader precedent.
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

## Owned Paths

- `module.md`
- `src/**`
