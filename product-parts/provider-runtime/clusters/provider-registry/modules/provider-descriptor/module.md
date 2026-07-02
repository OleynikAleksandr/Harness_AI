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
- Capability lookup result.
- Capturable model catalog for the Native Request Capture UI:
  `getCapturableModels(providerId)` returns `{ id, label }` entries per
  capture provider (Claude, Codex, Kimi — GLM Native needs no capture and is
  absent), and `getCaptureProviderIds()` lists the providers that offer
  capture. Model ids mirror the provider model catalog so capture can be
  chosen per model (different models can carry different system prompts).

## Owned Paths

- `module.md`
- `src/**`
