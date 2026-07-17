# Kimi Native Session Module

## Responsibility

Own the native ACP session channel for Kimi: the profile-selective session
path that runs sessions of the built-in `native` profile through the
installed Kimi CLI (`kimi acp`, default agent). Since the 2026-07-17 user
order the child runs with `HOME` pointing at the Claude/Codex-parity
workspace provider home (`<workspace>/.harness/runtime/providers/kimi/home`,
resolved through the provider-home manager): the CLI session store lands
inside the workspace instead of the global `~/.kimi-code/sessions/`, auth
stays shared through `credentials`/`device_id` symlinks into the real home,
`config.toml`/`tui.toml` are copied once, and the CLI binary keeps resolving
from the real home. On every prepare the bootstrap also appends the missing
Core-catalog `[models.*]` sections (`kimi-for-coding-highspeed`, `k3` —
provider inherited from the user's own model section,
`max_context_size = 262144`) to the copied config, because the CLI accepts
`session/set_config_option {model}` only for ids declared in `config.toml`
(verified live: without the section every native session silently ran the
default `kimi-for-coding`); existing sections and user edits stay
untouched. No base-URL rewrite happens here — that remains a
capture-only mechanic of `kimi-native-capture`. Managed profiles never enter this
module: the Kimi ACP surface cannot verifiably change prompt or tooling
(model selection only via `session/set_config_option`), so every non-native
profile stays on the Core universal client (2026-07-17 user order, plan
stream 3). The standalone ACP provider id `kimi` stays retired — this module
is an internal backend of the `kimi-client` adapter, not a registered
provider.

## Public Facade

`src/kimi-native-session-facade.ts`. It owns the adapter-facing session
driver (`KimiNativeSessionDriver`, singleton `kimiNativeSessionDriver`,
session-id marker `isKimiNativeSessionId`) and re-exports the supervised
process channel (`KimiAcpSessionProcess`, `resolveKimiSessionCommand`), the
JSON-RPC router (`KimiAcpSessionRouter`), the wire contracts, the session
runtime (`KimiNativeSessionRuntime`), the stream normalizer
(`KimiSessionEventNormalizer`), the permission bridge
(`KimiInteractionBridge`) and the workspace-home tooling
(`prepareKimiWorkspaceHome`, `deleteKimiNativeSessionArtifacts` — the
adapter's `deleteSessionArtifacts` removes the mapped native session
directory from the workspace store, Claude-parity cleanup driven by the
persisted `harness-session-map.json` pairing of the Harness provider
session id with the CLI store id).

## Session Driver And Interaction Bridge

- `KimiNativeSessionDriver` keeps one entry per provider session id
  (`kimi-native-<uuid>`): an immutable ACP runtime binding, a fail-closed
  permission bridge and the listener fan-out shared by stream events and
  interaction events. `createSession`/`resumeSession` open the CLI binding
  eagerly so spawn/auth failures surface at session start; after a Core
  restart resume opens a fresh native CLI session under the same provider
  session id. `stopSession` cancels the in-flight turn and pending
  permissions but keeps the CLI session alive (resume-on-send);
  `deleteSession` kills the child and drops the entry.
- `KimiInteractionBridge` accepts exactly one reverse shape — the standard
  ACP `session/request_permission` — and maps it onto a sanitized Core
  `permission` interaction (`provider: "kimi"`, options from the CLI
  request). Every other reverse method is refused with `methodNotFound`
  (nothing is silently auto-approved). A user decision maps back to the ACP
  `{ outcome: { outcome: "selected", optionId } }` shape; cancel, stop and
  the 5-minute timeout answer the CLI with a cancelled outcome and emit the
  matching resolved event.

## Session Runtime And Stream Normalization

- `KimiNativeSessionRuntime` is one immutable binding: one runtime = one
  `kimi acp` child = one native CLI session. `open()` performs
  `initialize` -> `session/new`, best-effort model selection through
  `session/set_config_option` (a refusal emits a diagnostic stream event and
  keeps the native session), a full-access mode request
  (`{configId: "mode", value: "yolo"}`, user order 2026-07-17: native
  sessions run without tool-permission cards — verified accepted by CLI
  0.26.0 with zero `session/request_permission` on a Bash-using turn; a
  future CLI refusing it surfaces one honest
  `kimi_full_access_unavailable` diagnostic and the fail-closed interaction
  bridge still answers whatever the CLI asks) and a best-effort thinking
  request (`{configId: "thinking", value: "on"}`): `session/new` advertises the
  thinking select, but CLI 0.26.0 rejects enabling it (`Internal error`) and
  config-aliased models drop the option entirely, so a refusal surfaces one
  honest `kimi_thinking_unavailable` diagnostic — future CLI/model
  combinations that accept the option start emitting `agent_thought_chunk`
  (already normalized into thinking bubbles) with no Harness change.
  `prompt(text, model?)` applies the per-turn Core session model the same
  best-effort way when it differs from the already-applied one (the driver
  forwards `ProviderTurnOptions.model`), emits `turn_started`, sends
  `session/prompt` with a
  30-minute turn timeout, flushes buffered text and emits `turn_completed`
  (with the CLI `stopReason` as the message) or `turn_failed`.
  `cancelTurn()` sends the `session/cancel` notification and keeps the CLI
  session alive for resume-on-send; `close()` stops the child. An unexpected
  child death rejects the in-flight prompt (=> `turn_failed`) and emits
  `stream_error`.
- `KimiSubagentNormalizer` synthesizes the provider-neutral subagent
  lifecycle (`subagent_control`/`subagent_session`/`subagent_status`) from
  `Agent`/`AgentSwarm` tool calls, because the Kimi ACP stream has no
  dedicated subagent discriminators (verified live on CLI 0.26.0): spawn on
  the tool call with a synthetic `kimi-agent-<toolCallId>` child id parented
  by the Core-visible provider session id. The call's input JSON streams
  only as partial-JSON `content` chunks (`rawInput` settles later for single
  `Agent` calls and never for swarms — verified on the 2026-07-17 headless
  probe), so the normalizer accumulates the chunks until the JSON parses and
  surfaces the parsed `description` as the task (`rawInput` wins when
  present; a swarm task carries the item count as `<description> (N
  agents)`). The agent role comes from the result's `actual_subagent_type`
  line with the parsed `subagent_type` as fallback. A terminal single-Agent
  update closes the child from the completed/failed status plus the
  result's `status:` line. A terminal swarm update parses the
  `<subagent agent_id item outcome>` sections of `agent_swarm_result`,
  materializes every reported agent as its own child
  (`kimi-agent-<toolCallId>:<agent_id>`, task = its `item`, spawned under
  the same call so the divider counter is honest) and closes each with its
  reported outcome (`completed` -> completed, `aborted` -> interrupted,
  anything else -> failed) before closing the swarm's root child. Terminal
  events carry the contract's `result` text — the per-agent section body for
  swarm agents, the `<summary>` line for the swarm's root child and the
  post-`[summary]` body for a single Agent — which Core publishes once as
  the finished child's assistant message, so clicking a finished agent card
  shows its outcome. While a
  swarm still runs the normalizer also accepts live registrations from the
  session-store poller (`liveSwarmCallIds`/`registerLiveSwarmAgents`,
  proxied through `KimiSessionEventNormalizer`): every store-observed agent
  spawns immediately as a running child with its delegated prompt as the
  task, so the launch divider grows while the swarm works instead of
  jumping at the end. This feeds the same Core subagent graph and dialog
  launch divider Claude/Codex use. The synthetic child ids are marked by
  `isKimiNativeSubagentSessionId` (`kimi-agent-*`): Core's child-session
  adoption binds them onto the parent's adapter, which must serve them as an
  inert channel — a Kimi subagent has no provider channel of its own. The
  driver's listener fan-out isolates consumer failures (one throwing
  listener cannot break delivery to the others or tear down the native turn
  mid-batch; proven live on the 2026-07-17 retest).
- `KimiSessionEventNormalizer` maps verified `session/update` discriminators
  onto Core `NormalizedProviderEvent`s without renderer heuristics
  (`KimiNativeSessionEvent` also carries the synthesized subagent events):
  `agent_message_chunk`/`agent_thought_chunk` buffer into readable
  `dialog_message` blocks using the sentence-boundary thresholds proven by
  the retired ACP provider (flush at 900 chars, or 360 at a sentence
  boundary; tools and turn end flush everything), `tool_call` /
  `tool_call_update` become `kimi_tool_call`/`kimi_tool_result` stream
  events, `usage_update` (`used`/`size`) becomes the shared `token_usage`
  stream event, and unknown updates surface as diagnostic stream events.

## Inputs

- Workspace path (child cwd and the root of the workspace provider home)
  and optional environment overrides.
- The installed Kimi CLI (`~/.kimi-code/bin/kimi`, PATH fallback) and the
  user's real Kimi auth (`credentials`/`device_id`), shared into the
  workspace home by symlink.
- JSON-RPC lines from the CLI stdout: responses, notifications and
  CLI-initiated reverse requests.

## Outputs

- A supervised `kimi acp` child process per native session with
  `KIMI_CLI_NO_AUTO_UPDATE=1` pinned for the child's lifetime (the binary
  must not swap mid-session).
- Correlated request/response exchange with numeric outbound request ids,
  bounded timeouts, local abort semantics (the Kimi wire has no per-request
  cancel method — turn cancellation is the runtime's `session/cancel`
  notification), fail-closed reverse-request answering (`methodNotFound`
  without a handler, `internalError` on handler failure) and reject-all on
  channel close.
- Expected/unexpected exit report with a bounded stderr snapshot for
  diagnostics.
- Per-turn token usage for the status panel
  (`kimi-session-usage-reader.ts`): the CLI streams no `usage_update`
  notifications (verified on 0.26.0), so after every native turn the runtime
  reads the latest `usage.record`/`step.end` row of the main agent's
  `wire.jsonl` in the workspace session store
  (`<workspace home>/.kimi-code/sessions/<wd_*>/<acpSessionId>/agents/main/`)
  and emits the shared `token_usage` stream event with
  `used = inputOther + output + inputCacheRead + inputCacheCreation`,
  `cached = inputCacheRead` and the verified `262144` native context limit.
- Live swarm progress (`kimi-swarm-progress-reader.ts`): the ACP stream is
  silent while an AgentSwarm executes (verified on the 2026-07-17 headless
  probe), so during an active turn the runtime polls the workspace session
  store every 2 s for `agents/agent-<n>/` homes and registers each observed agent
  through the normalizer as a live running child (task = the delegated
  prompt from the agent wire's first `turn.prompt` row, stripped of leading
  context tags). Polling attributes agents only while exactly one swarm is
  running (the store carries no tool-call linkage; parallel swarms fall
  back to the terminal swarm result) and deliberately reports no terminal
  state — an agent wire has no reliable terminal row (a follow-up
  `turn.prompt` revives a finished-looking agent), so terminal statuses
  come from the swarm result or the turn end.

## Owned Paths

- `module.md`
- `src/**`
