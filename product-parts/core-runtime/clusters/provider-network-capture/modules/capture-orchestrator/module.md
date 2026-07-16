# Capture Orchestrator Module

## Responsibility

Own the command-level orchestration of native request capture: validate the
`(providerId, model, reasoning)` request, mint a capture id, wire the certificate store,
capture proxy and artifact writer together, invoke the provider adapter
capture through the proxy, apply the timeout/target rules, and return the
artifact paths result.

The orchestrator stays provider-neutral: provider-specific environment
injection (pointing a provider client at the local proxy) is passed in as a
`runProviderCapture` callback and implemented in the provider adapters
(Provider Runtime, Phase 3). Behavior ported from the CodeAI-Hub
`native-request-capture-facade`, trimmed to the MVP capture path.

## Public Facade

`capture-orchestrator-facade.ts`

## Inputs

- `NativeCaptureOrchestratorOptions` (constructor): optional
  `captureIdFactory`, `certificateStore`, `proxyFactory`, `clock`, and
  `outputDir` (defaults to `<harness home>/logs/native-request-capture`) —
  all injectable for testing.
- `NativeCaptureCommand`: provider id, optional model, optional selected
  reasoning effort, optional workspace path, optional `targetRules` override (else
  `DEFAULT_CAPTURE_TARGET_RULES` per provider), optional `timeoutMs`, and the
  required `runProviderCapture` callback.

## Outputs

- `DEFAULT_CAPTURE_TARGET_RULES`: per-provider target model endpoints
  (Claude `api.anthropic.com` `/v1/messages`, Codex app-server
  `chatgpt.com` `/backend-api/codex/responses`, and the diagnostic Kimi CLI
  channel `api.kimi.com` `/chat/completions`).
  Codex uses a WebSocket transport for `/responses`, so the proxy routes the
  upgrade on that path to its WS capture and decodes the `response.create`
  frame (the payload is in the frame, not an HTTP body). The Codex rule carries
  `bodyIncludes` (the probe prompt) AND `minimumToolCount: 1`: the background
  memory-consolidation prewarm consolidates our probe session so it also
  contains the probe text, and only its empty `tools` array distinguishes it
  from the probe turn (full native tool set) — the tool-count filter selects
  our turn's frame on legacy schemas. Codex 0.144.1 omits top-level `tools`
  from `response.create`; when that field is absent the proxy relies on the
  probe match instead, while still enforcing the count whenever `tools` is
  present.
- `ProviderCaptureContext`: what the orchestrator hands the adapter callback.
  Its shape matches the provider adapter contract's
  `ProviderNativeCaptureOptions` so the RPC callback is
  `(ctx) => adapter.captureNativeRequest(ctx)` — capture id, proxy url,
  certificate env hints, certificate path, diagnostic probe prompt, provider
  id, selected model, selected reasoning effort, workspace path, and the
  `recordAppliedInputEnvelope`/`recordDiagnosticContext` callbacks wired to
  the writer.
- `NativeCaptureOrchestrator.capture(command)`: mints one capture id, creates
  the writer, and runs the proxy path (`captureViaProxy`): prepare the
  diagnostic certificate, start the forward-transit proxy, race the provider
  run against the capture, write the (redacted) captured request on success.
  Proxy events (`proxy_connect`/`request_ignored`) are collected during the
  run and flushed once into the writer as `capture_proxy_event`
  diagnostic-context records, so an ignored prewarm request is visible in the
  dump. If the provider finishes/fails before capture and those events contain
  `tls_socket_error` whose bounded code/message identifies certificate or CA
  trust failure, the result is classified as `tls_trust_failed` rather than
  the misleading `target_not_seen`; generic `ECONNRESET`/`EPIPE` events are
  not treated as trust failures, and an actual captured proxy result still has
  precedence over incidental TLS failures from sibling connections.
  `runCapture` takes explicit
  `certificateEnv`/`certificatePath`/`proxyUrl` values. Kimi selects the
  `captureViaReverse` path and receives the `NativeCaptureReverseBridge` base
  URL with empty certificate fields; Claude/Codex keep the CONNECT proxy path.
  This diagnostic route is independent of the retired ACP Kimi runtime.
  Returns
  `{ ok, providerId, model, reasoningEffort, markdownPath, jsonlPath, error,
  reason }`.

## Owned Paths

- `module.md`
- `src/**`
