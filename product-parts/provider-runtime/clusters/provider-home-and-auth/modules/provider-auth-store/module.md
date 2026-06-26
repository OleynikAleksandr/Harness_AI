# Provider Auth Store Module

## Responsibility

Own API key and auth references while keeping secrets outside tracked workspace files.

## Public Facade

`ProviderAuthStoreFacade`

## Inputs

- Provider auth lookup request.
- User-level auth references.

## Outputs

- Runtime auth reference.
- Missing auth diagnostics.

## Owned Paths

- `module.md`
- `src/**`
