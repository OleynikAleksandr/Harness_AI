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
- Capability lookup result. HTTP-compatible universal-client providers
  (`kimi-client` / `glm-client` / `local-models-client` /
  `openrouter-client` endpoints; the retired legacy `openrouter`/
  `local-models` ids left with the 2026-07-05 legacy cleanup) report
  `requiresProviderHome: false`: they run on local OAuth, key-only auth, or
  base URL + optional key from Core settings and never provision a provider
  home.
- Capturable model/reasoning catalog for the Native Request Capture UI:
  `getCapturableModels(providerId)` returns renderer-safe `{ id, label,
  defaultReasoningEffort, reasoningEfforts[] }` entries per capture provider
  (Claude and Codex app-server), `getCapturableModel(providerId, modelId)`
  validates a concrete model selection, and
  `getCaptureProviderIds()` lists the providers that offer capture. Model ids
  mirror the provider model catalog so capture can be
  chosen per model (different models can carry different system prompts). The
  Codex app-server capture catalog follows the live picker order (GPT-5.6
  Sol/Terra/Luna, 5.5, 5.4, 5.4 Mini, 5.3 Codex Spark) and excludes retired
  GPT-5.2. Sol/Terra expose `ultra`, Luna stops at `max`, and older Codex
  models stop at `xhigh`. The Claude interactive capture catalog exposes the
  native CLI `--effort` values `low/medium/high/xhigh/max` for Sonnet, Opus,
  and Haiku. Claude `ultracode` is intentionally absent because it is a
  separate session-orchestration setting, not an effort value.
- Client endpoint model catalog: `getClientModels(providerId)`
  returns `ProviderModelDescriptor` (`{ id, label }`) entries; `kimi-client`
  carries the single public Kimi Code model `kimi-for-coding` (the vendor
  rotates the backend behind that id), and `glm-client` carries the
  Core-owned GLM coding-plan catalog (`glm-5.2`, `glm-5.1`, `glm-5-turbo`,
  `glm-4.7`, `glm-4.6`). Multi-model client providers resolve their selected
  model from settings rather than registry `defaultModelId`.
  `local-models-client` intentionally has NO static entry: its catalog is
  live (`GET {baseUrl}/v1/models` on the configured local server), so the
  selected model comes from settings and the model list from the RPC flow.
  `openrouter-client` has NO static entry either: its catalog is the live
  OpenRouter model-slug search in Settings, and the session model comes from
  `providers.openRouter.defaultModel`.

## Owned Paths

- `module.md`
- `src/**`
