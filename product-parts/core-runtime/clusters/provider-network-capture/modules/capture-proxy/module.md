# Capture Proxy Module

## Responsibility

Own the forward-transit MITM proxy: a local CONNECT proxy bound to
`127.0.0.1`. For a target host it terminates TLS with a diagnostic
certificate, forwards every client byte to the real upstream, relays the
response back, and records the first request matching a target rule
(`Content-Length` and `Transfer-Encoding: chunked` bodies are both parsed).
Non-target hosts are blind TCP tunnels so background traffic (auth, models,
other providers) still reaches its real server and the driven client keeps
working.

The request DOES reach the vendor. This replaced the earlier
capture-and-abort model (2026-07-03) because Codex 0.142.5 forces an
un-disableable WebSocket transport whose request payload only exists in frames
sent after a real upgrade handshake — abort could never see it. The WebSocket
upgrade forwarding and frame decode are added in a sibling module file (Phase
6.5 task15).

## Public Facade

`capture-proxy-facade.ts`. The HTTP request reader (request-line, headers, and
`Content-Length` / chunked body decoding into a `ParsedHttpRequest`) lives in
the sibling `capture-proxy-http.ts`. The WebSocket helpers — upgrade detection,
`Sec-WebSocket-Extensions` strip, masked-frame decode, and the client-frame
capture runner — live in `capture-proxy-ws.ts`. Both are used by the facade.
The reverse-forward bridge (`capture-proxy-reverse.ts`, `NativeCaptureReverseBridge`)
is a second entry point that reuses the facade's `resolveRuleMismatch` and the
HTTP reader for clients that ignore proxy env.

## Inputs

- `NativeCaptureProxyOptions`: provider id, target rules
  (`{ host, port?, pathIncludes?, bodyIncludes?, minimumToolCount? }`), a
  `resolveTlsCredentials({ hostname })` callback (from the certificate
  store), an optional `onEvent` observer, an optional `timeoutMs`
  (default 30s), and an optional `createUpstream({ host, port })` factory
  (defaults to a real TLS socket to the rule host; injected in tests to point
  at a fake upstream).

## Outputs

- `NativeRequestCaptureProxy.start()`: binds a local proxy and returns a
  handle with `port`, `proxyUrl` (for the provider client's `HTTPS_PROXY`),
  `waitForCapture()` (resolves `captured` with the `CapturedNativeRequest`,
  or `failed`/`timeout` with a reason), and `stop()`.
- Only CONNECT targets matching a rule host get TLS-terminated and forwarded
  to the real upstream; non-target CONNECTs are blind TCP tunnels. A forwarded
  request that fails the rule's `pathIncludes` / `bodyIncludes` /
  `minimumToolCount` is still relayed to the vendor but emitted as
  `request_ignored` (not captured) while the capture keeps waiting — a
  background prewarm turn on the target endpoint does not end the capture. The
  first fully-matching request is captured and the capture resolves.
- A WebSocket upgrade (`Upgrade: websocket`) on the target path is routed to
  the WS capture: the upgrade is completed with the real upstream with
  `Sec-WebSocket-Extensions` stripped (no permessage-deflate → plain frames).
  Codex reuses one WS connection for several `response.create` frames
  (background `memory_consolidation` prewarm turns plus the real turn), so every
  complete frame is decoded and the one that passes the filters is captured
  (`method: "WS"`, its payload is the Codex `response.create` body with the
  full native tool set); the others are forwarded. The rule's `bodyIncludes`
  requires the probe prompt in the frame, and `minimumToolCount` (threaded from
  the rule as `minimumTools`) requires that many top-level `tools` — needed
  because the memory-consolidation prewarm consolidates our probe session, so
  the probe text also leaks into its `input`; only its empty `tools` array
  distinguishes it from the probe turn (17 tools). Without any filter the first
  data frame is taken. This is how Codex's mandatory WebSocket transport is
  captured.
- A request that matched the rule host+path but was rejected on the body
  carries a `detail` on its `request_ignored` event
  (`NativeCaptureIgnoredRequestDetail`: `bodyBytes`, `hasContentLength`,
  `hasTransferEncoding`, `probeMatched`, `toolCount`, `topLevelKeys`). It is
  structural metadata only — never header or body values — so it is safe to
  persist in the diagnostic artifact and explains why a target request was not
  captured.
- The proxy hands the raw captured request (including headers) to the
  caller; credential redaction happens in the artifact writer, not here.
- `NativeCaptureReverseBridge.start()`: a plain 127.0.0.1 HTTP listener (NOT a
  CONNECT proxy) the driven client points its API `base_url` at directly. The
  handle carries `baseUrl`/`port`, `waitForCapture()` and `stop()`. Each
  request is buffered, matched against the single target rule
  (`pathIncludes` + `bodyIncludes`, via the shared `resolveRuleMismatch`),
  forwarded 1:1 to the real TLS upstream with only the Host header rewritten
  (hop-by-hop headers dropped, chunked body re-framed with an exact
  `Content-Length`), and the response is relayed back. This transits a client
  that ignores `HTTP(S)_PROXY` (the kimi Mach-O binary) — the request reaches
  the vendor. Same injectable `createUpstream` for tests.

## Owned Paths

- `module.md`
- `src/**`
