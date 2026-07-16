# Provider Liveness Checker Module

## Responsibility

Own provider liveness preflight helpers.

## Public Facade

`ProviderLivenessCheckerFacade`

`GlobalHomeAdapterFactoryFacade`

## Inputs

- Provider id.
- Provider adapter builder that accepts an explicit global provider home path.
- Provider capabilities.
- Provider auth settings and local-model reachability.

## Outputs

- Global provider home path.
- Env-isolated adapter initialization runner.
- Raw liveness status written into the readiness registry.
- Provider-home preflight builds only the active provider-home adapters
  (`claude`, `codex`, `grok`); Grok's facade delegates discovery and cached
  subscription-auth verification to the official CLI without reading or
  copying token contents. The embedded OpenCode runtime, the retired `glm-native`
  adapter and the ACP `kimi` adapter are all unbound from liveness checks
  (GLM migration, then the 2026-07-05 legacy cleanup and the kimi-provider
  retirement).
- API-provider checks: the universal-client `openrouter-client` requires a
  stored key; the
  universal-client `local-models-client` requires a
  non-empty live model list fetched from the CONFIGURED base URL — the
  default catalog loader is `listLocalModels` from the
  `local-models-client-provider` module (settings + env fallbacks),
  replacing the old hardcoded LM-Studio URL. The retired legacy
  `openrouter`/`local-models` ids left these checks with the legacy cleanup.

## Owned Paths

- `module.md`
- `src/**`
