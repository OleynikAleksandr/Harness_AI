# Provider Adapter Contract Module

## Responsibility

Define the shared provider adapter boundary used by Core. Adapters expose session-based operations; UI and Electron host never call provider CLIs, SDKs, or APIs directly.

## Public Facade

`ProviderAdapterContractFacade`

## Inputs

- Provider adapter descriptor.
- Provider session lifecycle requests.
- Provider turn dispatch request from Core.

## Outputs

- Provider session id.
- Provider event subscription.
- Provider lifecycle errors.

## Owned Paths

- `module.md`
- `src/**`
