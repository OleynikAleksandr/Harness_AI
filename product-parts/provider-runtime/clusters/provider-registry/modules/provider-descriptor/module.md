# Provider Descriptor Module

## Responsibility

Own model/reasoning capabilities and UI metadata for providers.

## Public Facade

`ProviderDescriptorFacade`

## Inputs

- Provider capability declarations.
- Model metadata.

## Outputs

- Renderer-safe provider descriptor.
- Capability lookup result. HTTP-compatible providers (`openrouter`,
  `local-models`, and the universal-client `kimi-client` endpoint) report
  `requiresProviderHome: false`: they run on key-only auth from Core settings
  and never provision a provider home.
- Capturable model catalog for the Native Request Capture UI:
  `getCapturableModels(providerId)` returns `{ id, label }` entries per
  capture provider (Claude, Codex, Kimi — GLM Native needs no capture and is
  absent), and `getCaptureProviderIds()` lists the providers that offer
  capture. Model ids mirror the provider model catalog so capture can be
  chosen per model (different models can carry different system prompts).
- Universal-client endpoint model catalog: `getClientModels(providerId)`
  returns `ProviderModelDescriptor` (`{ id, label }`) entries; `kimi-client`
  carries the single public Kimi Code model `kimi-for-coding` (the vendor
  rotates the backend behind that id). The catalog stays internal-facing
  until the Phase 2 visibility switch exposes the client endpoint.

## Owned Paths

- `module.md`
- `src/**`
