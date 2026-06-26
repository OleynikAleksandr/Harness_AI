# Provider Session Binding Module

## Responsibility

Track the binding between a Core session and a concrete provider session id. Binding state belongs to Core, not to the renderer or Electron host.

## Public Facade

`ProviderSessionBindingFacade`

## Inputs

- Core session id.
- Provider id.
- Provider session id.
- Binding lifecycle updates.

## Outputs

- Ready/pending/failed binding state.
- Rebind requests after stale provider sessions.

## Owned Paths

- `module.md`
- `src/**`
