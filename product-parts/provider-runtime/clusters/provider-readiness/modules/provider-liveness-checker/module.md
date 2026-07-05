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
- Provider-home preflight builds only active provider-home adapters; the embedded
  OpenCode runtime is unbound from liveness checks during the GLM migration.
- API-provider checks: `openrouter` and the universal-client
  `openrouter-client` require a stored key; `local-models` and the
  universal-client `local-models-client` require a non-empty live model
  list fetched from the CONFIGURED base URL — the default catalog loader is
  `listLocalModels` from the `local-models-client-provider` module (settings +
  env fallbacks), replacing the old hardcoded LM-Studio URL.

## Owned Paths

- `module.md`
- `src/**`
