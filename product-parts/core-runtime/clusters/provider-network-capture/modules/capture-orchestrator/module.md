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
  `/backend-api/codex/responses`, Kimi `api.moonshot.ai`
  `/v1/chat/completions` — the Kimi host is refined by the Kimi capture
  adapter in Phase 3).
- `ProviderCaptureContext`: what the orchestrator hands the adapter callback
  — proxy url, certificate env hints, diagnostic probe prompt, provider id,
  selected model, workspace path.
- `NativeCaptureOrchestrator.capture(command)`: runs the capture and returns
  `{ ok, providerId, model, markdownPath, jsonlPath, error, reason }`. On a
  captured request it writes the (redacted) request and completes the
  artifacts; on timeout/failure it completes the artifacts with the failure
  reason. The proxy is always stopped afterward.

## Owned Paths

- `module.md`
- `src/**`
