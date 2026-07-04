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
  `local-models`, and the universal-client `kimi-client` / `glm-client`
  endpoints) report `requiresProviderHome: false`: they run on key-only auth
  from Core settings and never provision a provider home.
- Capturable model catalog for the Native Request Capture UI:
  `getCapturableModels(providerId)` returns `{ id, label }` entries per
  capture provider (Claude, Codex, Kimi — GLM Native needs no capture and is
  absent), and `getCaptureProviderIds()` lists the providers that offer
  capture. Model ids mirror the provider model catalog so capture can be
  chosen per model (different models can carry different system prompts).
- Universal-client endpoint model catalog: `getClientModels(providerId)`
  returns `ProviderModelDescriptor` (`{ id, label }`) entries; `kimi-client`
  carries the single public Kimi Code model `kimi-for-coding` (the vendor
  rotates the backend behind that id), while `glm-client` carries the
  Core-owned GLM coding-plan catalog (`glm-5.2`, `glm-5.1`, `glm-5-turbo`,
  `glm-4.7`, `glm-4.6`). Multi-model client providers resolve their selected
  model from settings rather than registry `defaultModelId`.

## Owned Paths

- `module.md`
- `src/**`
