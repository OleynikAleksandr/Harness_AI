# Kimi Client Provider Module

## Responsibility

The thin Kimi endpoint for the Core universal client and, since the
2026-07-17 profile-routing order, the profile-selective session router for
the one `kimi-client` adapter: sessions created with the built-in `native`
profile (`ProviderSessionStartOptions.profileKind === "native"`) delegate
create/resume/send/subscribe/stop/delete/respond to the
`kimi-native-session` ACP driver (installed Kimi CLI, default agent, real
provider home; provider session ids are marked by `isKimiNativeSessionId`),
while managed/legacy sessions keep running the universal client. Holds
Kimi's dialect specifics — the Kimi Code subscription coding endpoint
(`api.kimi.com/coding/v1`), the Core session-selected Coding Plan model, and
the `reasoning_content` thinking form — builds the `ClientTurnRequest`, and exposes
the `ProviderAdapter` that Core session routing constructs. This module stays
Kimi-specific: it does NOT own the agent loop, tool execution or streaming
(those are the Core `universal-client` cluster); the adapter wires the loop,
the built-in tool source and this endpoint together per session. The Kimi Code
subscription channel accepts a plain API key from a third-party client
(verified via OpenCode's `kimi-for-coding` provider), so onboarding is
key-only: the adapter reads the key from the provider-auth-store
(`kimi-client`) at each turn.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.3, 3.6),
and the Phase 2 Kimi rollout/migration note in `.harness/plans/todo-plan.md`.

## Public Facade

`kimi-client-provider-facade.ts`

## Inputs

- `KimiTurnInput`: the subscription API key, the message history, the available
  tool descriptors, an optional model override, and an optional abort signal.
- `ProviderAdapter` calls from Core session routing (create/resume session,
  send message with the immutable Core session model in `ProviderTurnOptions`,
  subscribe, close, delete artifacts).

## Outputs

- `KIMI_DIALECT`: the Kimi `DialectProfile` (base URL, `reasoning_content`
  thinking, `auto_only` tool choice).
- `KIMI_MODEL`: `kimi-for-coding`.
- `buildKimiTurnRequest(input)`: the Core `ClientTurnRequest` for a Kimi turn
  (defaults the model, attaches the dialect and key).
- `KimiClientProviderFacade`: the `ProviderAdapter` on the universal client.
  Each turn uses `ProviderTurnOptions.model` supplied from `session.model`;
  legacy/empty callers fall back to `KIMI_MODEL`. The provider catalog and
  settings normalization constrain visible choices to `kimi-for-coding`,
  `kimi-for-coding-highspeed`, and `k3`. No `temperature` is sent, which keeps
  K3 on its provider-required default value `1`.
  Sessions are in-memory: each keeps its message history and carries the
  final in-turn history returned by `runClientTurn` (assistant + tool
  messages included) into the next turn. Turn events map through
  `mapClientTurnEvent` onto `NormalizedProviderEvent`s; a failed turn also
  emits a `stream_error` (the session event router publishes user-visible
  errors only for `stream_error`). A missing subscription key fails the turn
  with the provider-help message instead of calling the endpoint. Stop
  (`closeSession`) aborts the in-flight turn but keeps the history for
  resume-on-send; `deleteSessionArtifacts` drops the in-memory state. Session
  history does not persist across a Core restart (client MVP).
- Managed profile application (`kimi-managed-profile-application.ts`):
  managed sessions really apply the materialized profile on the universal
  client — the profile prompt opens the session history exactly once as its
  leading system message, and the provider-neutral tooling categories select
  the builtin tool whitelist through `KIMI_CLIENT_TOOL_CATEGORY_MAP`
  (`file-read` -> read/grep/glob, `file-write` -> write/edit/apply_patch,
  `git`/`shell`/`tests` -> exec_command, `web` -> web_fetch/web_search).
  Unknown categories are contract no-ops; raw `profile.tools` schemas are not
  registered because the universal client executes only its builtin
  inventory. Sessions without a managed payload keep the full inventory.
- Native routing: `createSession` with `profileKind: "native"` returns the
  driver's `kimi-native-<uuid>` session id; every later adapter call for
  such an id (send with the per-turn Core model, subscribe, Stop as
  turn-cancel, delete as child shutdown, `respondToInteraction` for CLI
  permission asks) forwards to the `kimi-native-session` facade. The
  standalone ACP provider id `kimi` stays retired — routing lives inside
  `kimi-client`.

## Owned Paths

- `module.md`
- `src/**`
