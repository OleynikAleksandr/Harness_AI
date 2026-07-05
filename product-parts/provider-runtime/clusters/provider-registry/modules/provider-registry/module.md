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

- Provider catalog snapshot. The `glm-opencode` provider id has been removed
  during the GLM migration; it no longer appears in the catalog or picker.
- Provider visibility: every catalog entry carries
  `visibility: "visible" | "internal"`. `listProviders()` returns only
  visible providers (the picker snapshot); internal providers stay
  resolvable through `getProvider`/`getAdapter` for Core session routing.
  The Phase 2 visibility switch is APPLIED: the visible Kimi is the
  `kimi-client` universal-client endpoint, and the ACP `kimi` provider is
  internal — retained for existing sessions, no new ACP Kimi sessions start,
  full retirement is a Phase 5 open item. Never two Kimi entries in the
  picker at once. The Phase 3 GLM visibility switch is also APPLIED: the visible
  GLM is the `glm-client` universal-client endpoint, while `glm-native` is
  internal. The Phase 4 `local-models-client` and `openrouter-client`
  universal-client endpoints are bound INTERNAL ahead of their visibility
  switch; the legacy `local-models`/`openrouter` reference adapters still own
  the visible entries. Never two Local Models or two OpenRouter entries in
  the picker at once.
- Core-owned default model id: descriptors of universal-client endpoints
  carry `defaultModelId` from the provider-descriptor client model catalog
  only for single-model catalogs (`kimi-client` → `kimi-for-coding`); multi-
  model client endpoints such as visible `glm-client` omit `defaultModelId` and
  resolve the selected model through settings.
- Enabled/disabled provider state.
- Provider readiness status/message for the Core-selected readiness workspace,
  using the provider-readiness registry combine function.
- Invocation profile descriptor snapshot. `Native · Raw` is the only active runtime baseline in the current scope; managed profile descriptors are visual metadata until Core enables their behavior.

## Owned Paths

- `module.md`
- `src/**`
