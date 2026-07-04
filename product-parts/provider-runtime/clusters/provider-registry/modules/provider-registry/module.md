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

- Provider catalog snapshot. The `glm-opencode` provider keeps its id but its
  display `name` is "OpenCode" (the runner can host different models), and that
  name is what the new-session card and dialog role label show.
- Provider visibility: every catalog entry carries
  `visibility: "visible" | "internal"`. `listProviders()` returns only
  visible providers (the picker snapshot); internal providers stay
  resolvable through `getProvider`/`getAdapter` for Core session routing.
  The `kimi-client` universal-client endpoint is registered internal while
  the ACP `kimi` provider serves the visible picker; the Phase 2 visibility
  switch flips the visible Kimi to the client endpoint — never two Kimi
  entries in the picker at once.
- Enabled/disabled provider state.
- Provider readiness status/message for the Core-selected readiness workspace,
  using the provider-readiness registry combine function.
- Invocation profile descriptor snapshot. `Native · Raw` is the only active runtime baseline in the current scope; managed profile descriptors are visual metadata until Core enables their behavior.

## Owned Paths

- `module.md`
- `src/**`
