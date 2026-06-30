# Provider Translation Engines Module

## Responsibility

Own the provider-neutral translation facade, engine registry, formatting
normalization, and provider-backed UI/reasoning translation engines.

The built-in `google-gtx` engine owns the unauthenticated Google GTX transport
adapter and response parser. It uses GET for short requests, POST form transport
for longer payloads, and returns fallback results instead of throwing on
transport or parse failures.

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
