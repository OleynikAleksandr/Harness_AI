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

## Owned Paths

- `module.md`
- `src/**`
