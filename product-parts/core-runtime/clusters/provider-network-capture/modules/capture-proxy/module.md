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
  `Sec-WebSocket-Extensions` stripped (no permessage-deflate → plain frames),
  and the first client text frame is decoded and captured as the request
  (`method: "WS"`, its payload is the Codex `response.create` body). This is
  how Codex's mandatory WebSocket transport is captured.
- A request that matched the rule host+path but was rejected on the body
  carries a `detail` on its `request_ignored` event
  (`NativeCaptureIgnoredRequestDetail`: `bodyBytes`, `hasContentLength`,
  `hasTransferEncoding`, `probeMatched`, `toolCount`, `topLevelKeys`). It is
  structural metadata only — never header or body values — so it is safe to
  persist in the diagnostic artifact and explains why a target request was not
  captured.
- The proxy hands the raw captured request (including headers) to the
  caller; credential redaction happens in the artifact writer, not here.

## Owned Paths

- `module.md`
- `src/**`
