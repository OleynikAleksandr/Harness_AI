# Provider Translation Engines Module

## Responsibility

Own the provider-neutral translation facade, engine registry, formatting
normalization, and provider-backed UI/reasoning translation engines.

## Public Facade

`ProviderTranslationEnginesFacade`

## Inputs

- Translation request with explicit source and target languages.
- Optional explicit provider/model translation engine id.
- Registered provider translation engines.

## Outputs

- Translation result with original text, final text, translated text, status,
  engine id, and optional error code.
- Fail-closed fallback with `errorCode: "no_engine"` when an explicit engine id
  is unavailable.
- Translation engine diagnostics.

## Owned Paths

- `module.md`
- `src/**`
