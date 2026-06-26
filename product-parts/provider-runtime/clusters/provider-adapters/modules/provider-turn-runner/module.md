# Provider Turn Runner Module

## Responsibility

Dispatch a selected session turn to the concrete provider adapter and return a provider-neutral response.

## Public Facade

`ProviderTurnRunnerFacade`

## Inputs

- Provider id.
- Selected model.
- User prompt.

## Outputs

- Provider response text.
- Provider setup or runtime error text.

## Owned Paths

- `module.md`
- `src/**`
