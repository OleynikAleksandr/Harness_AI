# Kimi Native Session Module

## Responsibility

Own the native ACP session channel for Kimi: the profile-selective session
path that runs sessions of the built-in `native` profile through the
installed Kimi CLI (`kimi acp`, default agent, the user's real `~/.kimi-code`
home; no cloned home and no base-URL rewrite — those remain capture-only
mechanics of `kimi-native-capture`). Managed profiles never enter this
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
(`KimiSessionEventNormalizer`) and the permission bridge
(`KimiInteractionBridge`).

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
  `initialize` -> `session/new` and best-effort model selection through
  `session/set_config_option` (the only config the Kimi ACP surface accepts;
  a refusal emits a diagnostic stream event and keeps the native session).
  `prompt()` emits `turn_started`, sends `session/prompt` with a
  30-minute turn timeout, flushes buffered text and emits `turn_completed`
  (with the CLI `stopReason` as the message) or `turn_failed`.
  `cancelTurn()` sends the `session/cancel` notification and keeps the CLI
  session alive for resume-on-send; `close()` stops the child. An unexpected
  child death rejects the in-flight prompt (=> `turn_failed`) and emits
  `stream_error`.
- `KimiSessionEventNormalizer` maps verified `session/update` discriminators
  onto Core `NormalizedProviderEvent`s without renderer heuristics:
  `agent_message_chunk`/`agent_thought_chunk` buffer into readable
  `dialog_message` blocks using the sentence-boundary thresholds proven by
  the retired ACP provider (flush at 900 chars, or 360 at a sentence
  boundary; tools and turn end flush everything), `tool_call` /
  `tool_call_update` become `kimi_tool_call`/`kimi_tool_result` stream
  events, `usage_update` (`used`/`size`) becomes the shared `token_usage`
  stream event, and unknown updates surface as diagnostic stream events.

## Inputs

- Workspace path (child cwd) and optional environment overrides.
- The installed Kimi CLI (`~/.kimi-code/bin/kimi`, PATH fallback) and the
  user's real Kimi provider home/auth.
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

## Owned Paths

- `module.md`
- `src/**`
