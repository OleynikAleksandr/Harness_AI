# Provider Registry Module

## Responsibility

Own provider catalog, availability, and provider invocation profile descriptors.

## Public Facade

`ProviderRegistryFacade`

## Inputs

- Provider descriptors.
- Provider availability checks.
- Native and managed invocation profile descriptors for UI/read-model display.

## Outputs

- Provider catalog snapshot.
- Enabled/disabled provider state.
- Invocation profile descriptor snapshot. `Native · Raw` is the only active runtime baseline in the current scope; managed profile descriptors are visual metadata until Core enables their behavior.

## Owned Paths

- `module.md`
- `src/**`
