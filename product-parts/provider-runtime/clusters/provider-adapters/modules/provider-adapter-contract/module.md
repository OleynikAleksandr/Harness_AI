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
- Core-owned `turnOptions` passed through to provider-owned migrated reference
  adapters.
- Provider-visible reasoning/thinking events emitted by provider-owned runtime
  modules rather than shared wrapper parsers.
- Usage-limit reader helpers for provider-specific telemetry probes.

## Owned Paths

- `module.md`
- `src/**`
