# Capture Orchestrator Module

## Responsibility

Own the command-level orchestration of native request capture: validate the
`(providerId, model)` request, mint a capture id, wire the certificate store,
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
- `NativeCaptureCommand`: provider id, optional model, optional profile id,
  optional workspace path, optional `targetRules` override (else
  `DEFAULT_CAPTURE_TARGET_RULES` per provider), optional `timeoutMs`, and the
  required `runProviderCapture` callback.

## Outputs

- `DEFAULT_CAPTURE_TARGET_RULES`: per-provider target model endpoints
  (Claude `api.anthropic.com` `/v1/messages`, Codex app-server and CodexUC
  `chatgpt.com` `/backend-api/codex/responses`; the ACP Kimi rule left with
  the kimi-provider retirement, 2026-07-05).
  Codex uses a WebSocket transport for `/responses`, so the proxy routes the
  upgrade on that path to its WS capture and decodes the `response.create`
  frame (the payload is in the frame, not an HTTP body). The Codex rule carries
  `bodyIncludes` (the probe prompt) AND `minimumToolCount: 1`: the background
  memory-consolidation prewarm consolidates our probe session so it also
  contains the probe text, and only its empty `tools` array distinguishes it
  from the probe turn (full native tool set) — the tool-count filter selects
  our turn's frame.
- `ProviderCaptureContext`: what the orchestrator hands the adapter callback.
  Its shape matches the provider adapter contract's
  `ProviderNativeCaptureOptions` so the RPC callback is
  `(ctx) => adapter.captureNativeRequest(ctx)` — capture id, proxy url,
  certificate env hints, certificate path, diagnostic probe prompt, provider
  id, selected model, optional profile id, workspace path, and the
  `recordAppliedInputEnvelope`/`recordDiagnosticContext` callbacks wired to
  the writer.
- `NativeCaptureOrchestrator.capture(command)`: mints one capture id, creates
  the writer, and runs the proxy path (`captureViaProxy`): prepare the
  diagnostic certificate, start the forward-transit proxy, race the provider
  run against the capture, write the (redacted) captured request on success.
  Proxy events (`proxy_connect`/`request_ignored`) are collected during the
  run and flushed once into the writer as `capture_proxy_event`
  diagnostic-context records, so an ignored prewarm request is visible in the
  dump. `runCapture` takes explicit
  `certificateEnv`/`certificatePath`/`proxyUrl` values. The kimi-only
  reverse-bridge path (`captureViaReverse` + `NativeCaptureReverseBridge`)
  left with the ACP kimi retirement (2026-07-05 user order). Returns
  `{ ok, providerId, model, markdownPath, jsonlPath, error, reason }`.

## Owned Paths

- `module.md`
- `src/**`
