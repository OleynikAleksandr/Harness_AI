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
- `NativeCaptureCommand`: provider id, optional model, optional workspace
  path, optional `targetRules` override (else `DEFAULT_CAPTURE_TARGET_RULES`
  per provider), optional `timeoutMs`, and the required `runProviderCapture`
  callback.

## Outputs

- `DEFAULT_CAPTURE_TARGET_RULES`: per-provider target model endpoints
  (Claude `api.anthropic.com` `/v1/messages`, Codex `chatgpt.com`
  `/backend-api/codex/responses` — used by the Claude/Codex proxy path). The
  Codex rule is host+path only: Codex uses a WebSocket transport for
  `/responses`, so the proxy routes the upgrade on that path to its WS capture
  and decodes the `response.create` frame (the payload is in the frame, not an
  HTTP body). The first `response.create` frame carries the native system
  prompt + tools even for a background prewarm turn.
- `ProviderCaptureContext`: what the orchestrator hands the adapter callback.
  Its shape matches the provider adapter contract's
  `ProviderNativeCaptureOptions` so the RPC callback is
  `(ctx) => adapter.captureNativeRequest(ctx)` — capture id, proxy url,
  certificate env hints, certificate path, diagnostic probe prompt, provider
  id, selected model, workspace path, and the `recordAppliedInputEnvelope`/
  `recordDiagnosticContext` callbacks wired to the writer.
- `NativeCaptureOrchestrator.capture(command)`: mints one capture id, creates
  the writer, then dispatches by provider. Claude/Codex take the proxy path
  (`captureViaProxy`): prepare the diagnostic certificate, start the
  capture-and-abort proxy, race the provider run against the capture, write
  the (redacted) captured request on success. Proxy events (`proxy_connect`/
  `request_ignored`) are collected during the run and flushed once into the
  writer as `capture_proxy_event` diagnostic-context records, so an ignored
  prewarm request is visible in the dump. Kimi takes the wire-only path
  (`captureWireOnly`): no certificate store, no proxy — it runs the adapter
  directly with placeholder proxy values (`proxyUrl: "wire://kimi"`,
  empty cert env) and completes `captured`/`failed` from the adapter result.
  Returns `{ ok, providerId, model, markdownPath, jsonlPath, error, reason }`.

## Owned Paths

- `module.md`
- `src/**`
