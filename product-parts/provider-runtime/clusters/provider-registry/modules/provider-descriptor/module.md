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
  (Claude, Codex app-server, and the diagnostic Kimi CLI channel),
  `getCapturableModel(providerId, modelId)`
  validates a concrete model selection, and
  `getCaptureProviderIds()` lists the providers that offer capture. Model ids
  mirror the provider model catalog so capture can be
  chosen per model (different models can carry different system prompts). The
  Codex app-server capture catalog follows the served live Codex catalog
  (see below): its order, each model's own effort list (limited to the
  capture effort values) and its default effort (`medium` when the default
  is outside the list). The Claude interactive capture catalog follows the
  served live Claude catalog the same way (CLI `--effort` values from each
  model's `supportedEffortLevels`; Haiku has none). Claude `ultracode` is
  intentionally absent because it is a separate session-orchestration
  setting, not an effort value.
  Kimi follows the served Kimi catalog (see below) and exposes an
  empty reasoning list with `defaultReasoningEffort: null` because capture
  preserves the provider default effort; `getCaptureProviderIds()` lists
  `claude`, `codex`, `kimi`.
- Live Claude model catalog: `getClaudeModels()` returns the served list
  and `setClaudeModels(models)` replaces it (an empty list is ignored); the
  `claude-provider` live catalog reader applies the persisted and then the
  live SDK `supportedModels()` catalog (family aliases only).
  `CLAUDE_MODELS` is the verified offline fallback — the alias rows the
  Harness-installed SDK 0.3.317 returned in the packaged app on 2026-11-03:
  `opus` (Opus 5.5), `fable` (Fable 5.1), `sonnet` (Sonnet 5.5) and `haiku`
  (Haiku 5.5), each with efforts `low/medium/high/xhigh/max`. Capture,
  Profile Studio Claude targets and Settings use these alias ids; each alias
  always means Anthropic's newest model of the family.
- Live Codex model catalog: `getCodexModels()` returns the served list and
  `setCodexModels(models)` replaces it (an empty list is ignored); the
  `codex-provider` live catalog reader applies the persisted and then the
  live app-server `model/list` catalog. `CODEX_MODELS` is the verified
  offline fallback — the visible 2026-11-02 rows of codex-cli 0.166.0:
  `gpt-6.1-sol` (GPT-6.1-Sol, default effort low), `gpt-6-astra`
  (GPT-6-Astra, medium), `gpt-6.1-terra` (GPT-6.1 Terra, low), `gpt-6-sol`
  (GPT-6-Sol, medium), `gpt-6-luna` (GPT-6-Luna, medium, efforts up to
  `max`), `gpt-5.6-sol` (low), `gpt-5.6-terra` (medium) and `gpt-5.6-luna`
  (medium, up to `max`); the others accept `low` through `ultra`. Settings
  normalization and the Settings UI still use their own static Codex lists.
- Client endpoint model catalog: `getClientModels(providerId)`
  returns renderer-safe `ProviderModelDescriptor` (`{ id, label,
  description?, contextLength?, reasoningEfforts?, defaultReasoningEffort? }`)
  entries. The Kimi catalog is Core-owned and live: the module holds the
  served list, `getKimiClientModels()` / `getClientModels("kimi-client")`
  return it, and `setKimiClientModels(models)` replaces it (an empty list is
  ignored so a broken read never removes every model). The
  `kimi-client-provider` live catalog reader applies the persisted and then
  the live `GET /coding/v1/models` catalog. `KIMI_CLIENT_MODELS` is the
  verified offline fallback served until then — the 2026-11-02 Coding Plan
  rows: `kimi-for-coding` (K2.8 Preview, 1048576, efforts low/high/max,
  default max), `kimi-for-coding-highspeed` (K2.7 Code Highspeed, 262144, no
  efforts), `k3` (K3, 1048576), `k3-256k` (K3-256k, 262144), `k3.1-pro`
  (K3.1 Pro, 1048576) and `k3.1-pro-highspeed` (K3.1 Pro Highspeed 2x Usage
  Cost, 1048576), the K3 family with efforts low/high/max, default high.
  Settings normalization and the Settings UI read the served catalog through
  the settings-store `settings-model-catalogs` projection (Core RPC
  `list-provider-model-catalogs`), like the Claude and Codex catalogs.
  Context windows resolve per model through
  `kimiClientModelContextLength(model)` against the served catalog, with
  `KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH` (262144) for config-aliased ids
  outside it.
  `glm-client` carries the
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
