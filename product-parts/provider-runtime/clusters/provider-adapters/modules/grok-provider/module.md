# Grok Provider Module

## Responsibility

Own the native subscription-backed Grok Build provider adapter. The module
locates the official CLI without relying on the Electron GUI process shell
profile, reuses CLI-owned cached authentication without reading token contents,
and will translate the Core provider contract to Grok ACP stdio.

The foundation exposes binary discovery, a read-only readiness probe and a
tolerant newline-delimited JSON-RPC router. It deliberately does not register a
visible provider until the ACP session/profile/telemetry contract is
implemented and verified.

Binary discovery order is deterministic:

1. explicit Core-provided path;
2. `${GROK_HOME}/bin/grok`;
3. `${os.homedir()}/.grok/bin/grok`;
4. each directory in `PATH`.

Readiness runs `--version`, then `--no-auto-update models`. A successful model
catalog proves that the installed CLI can reuse its cached subscription auth.
The module returns structured `missing`, `login_required`, `unavailable`, or
`ready` state and never exposes command stderr or auth-file contents to UI.

`GrokAcpRouter` owns ACP request identifiers, response correlation, provider
notifications and reverse client requests. Every request has a bounded timeout;
AbortSignal cancellation emits `$/cancelRequest`, and process shutdown can
reject every outstanding request. Reverse requests are answered with structured
JSON-RPC success or error payloads. Malformed/unmatched protocol messages are
reported diagnostically and never become renderer-owned inference.

## Public Facade

`GrokProviderFacade`

## Inputs

- Optional Core-selected binary path.
- Process environment, provider home and platform path conventions.
- Installed official Grok CLI and CLI-owned cached login.

## Outputs

- Resolved executable path.
- CLI version and structured readiness/auth status.
- Typed ACP requests, responses, notifications and reverse-request dispatch.
- Future ACP-backed `ProviderAdapter` lifecycle from the same module boundary.

## Owned Paths

- `module.md`
- `src/**`
