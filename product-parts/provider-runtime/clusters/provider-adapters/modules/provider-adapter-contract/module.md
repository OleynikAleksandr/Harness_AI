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
- Usage-limit refresh boundary only; provider-specific usage-limit readers live
  inside their provider modules.
- Optional `deleteSessionArtifacts(providerSessionId, workspacePath)` boundary so a
  removed session can clean up provider-owned per-session files; providers without
  such files leave it unimplemented.

## Owned Paths

- `module.md`
- `src/**`
