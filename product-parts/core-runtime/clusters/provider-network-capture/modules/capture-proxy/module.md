# Capture Proxy Module

## Responsibility

Own the capture-and-abort MITM proxy: a local CONNECT proxy bound to
`127.0.0.1` that terminates TLS with a diagnostic certificate, reads the
provider client's full HTTP request head and body, filters the target model
endpoint from background traffic, records the first matching request, and
aborts with a synthetic error before any byte is forwarded upstream. No
captured request reaches the vendor.

Behavior ported from the CodeAI-Hub `native-request-capture-proxy` module,
without the WebSocket transport (HTTP/SSE capture only for the MVP).

## Public Facade

`capture-proxy-facade.ts`

## Inputs

- `NativeCaptureProxyOptions`: provider id, target rules
  (`{ host, port?, pathIncludes?, bodyIncludes?, minimumToolCount? }`), a
  `resolveTlsCredentials({ hostname })` callback (from the certificate
  store), an optional `onEvent` observer, and an optional `timeoutMs`
  (default 30s).

## Outputs

- `NativeRequestCaptureProxy.start()`: binds a local proxy and returns a
  handle with `port`, `proxyUrl` (for the provider client's `HTTPS_PROXY`),
  `waitForCapture()` (resolves `captured` with the `CapturedNativeRequest`,
  or `failed`/`timeout` with a reason), and `stop()`.
- Only CONNECT targets matching a rule get TLS terminated; non-target
  CONNECTs and requests that fail the rule's `pathIncludes` /
  `bodyIncludes` / `minimumToolCount` are answered with a local 502 (or a
  closed connection) and emitted as `request_ignored` while the capture
  keeps waiting — background prewarm turns on the target endpoint do not
  end the capture. The matched request is answered with a synthetic 502
  ("Native Request Captured") and never proxied to the vendor.
- A request that matched the rule host+path but was rejected on the body
  carries a `detail` on its `request_ignored` event
  (`NativeCaptureIgnoredRequestDetail`: `bodyBytes`, `hasContentLength`,
  `probeMatched`, `toolCount`, `topLevelKeys`). It is structural metadata
  only — never header or body values — so it is safe to persist in the
  diagnostic artifact and explains why a target request was not captured.
- The proxy hands the raw captured request (including headers) to the
  caller; credential redaction happens in the artifact writer, not here.

## Owned Paths

- `module.md`
- `src/**`
