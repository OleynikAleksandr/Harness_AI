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

`src/kimi-native-session-facade.ts`. With the transport slice it re-exports
the supervised process channel (`KimiAcpSessionProcess`,
`resolveKimiSessionCommand`), the JSON-RPC router (`KimiAcpSessionRouter`)
and the wire contracts; the session runtime, event normalizer and
interaction bridge extend this surface in the same stream.

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
