# Provider Translation Engines Module

## Responsibility

Own the provider-neutral translation facade, engine registry, formatting
normalization, and provider-backed UI/reasoning translation engines.

The provider-neutral facade preserves text that is already in the requested
target language before it calls any configured model-backed engine. This keeps
reasoning translation stable when a provider emits some thinking text directly
in the UI language: the result is treated as ready translated content and the
source text is returned unchanged.

The built-in `google-gtx` engine owns the unauthenticated Google GTX transport
adapter and response parser. It uses GET for short requests, POST form transport
for longer payloads, and returns fallback results instead of throwing on
transport or parse failures.

The `OpenRouterTranslationEngine` issues a lean, non-streaming OpenRouter chat
completion call (one system instruction plus the source text) and returns the
assistant reply as the translated text, with the same fail-closed fallback
behavior as `google-gtx` on transport, auth, or empty-response failures. It
never performs tool calls or session/agentic behavior — it is a pure
request/response translation transport.

A profile endpoint tag other than `default` pins the request to that
OpenRouter endpoint (`provider: { allow_fallbacks: false, order: [tag] }`).
Endpoints come and go on OpenRouter (2026-11-03: `google-vertex` disappeared
from `google/gemini-2.5-flash-lite` after the latency check had picked it), so
when the pinned endpoint answers 404 (no endpoint) or 429 (rate-limited
upstream) the engine retries the request once on OpenRouter default routing.
Any other non-OK answer, or a failing retry, falls back with the HTTP status
in the error code (`non_ok_response_<status>`, e.g. `non_ok_response_404`).

The OpenRouter system instruction repeats the same target-language preservation
rule for every selected model: if the input is already in the target language,
the model must return it unchanged and must not translate it into another
language.

`provider-translation-engines-factory.ts` builds the registered engine set
(`createProviderTranslationEngines`) from an OpenRouter connection
(`apiKey`/`baseUrl`) plus the `uiTranslation`/`reasoningTranslation` profile
configs (`model`/`endpointTag`). Each configured profile registers its own
engine id (`openrouter-ui-translation`, `openrouter-reasoning-translation`) so
the UI Translation Engine and Reasoning Translation Engine selections resolve
independently. A profile whose model is still the unset placeholder
(`openrouter-default`) is skipped — no OpenRouter engine is registered for it.
Callers hold the current settings snapshot (this module never reads settings
itself) and pass the relevant connection/profile config in.

## Public Facade

`ProviderTranslationEnginesFacade`

## Inputs

- Translation request with explicit source and target languages.
- Optional explicit provider/model translation engine id.
- Registered provider translation engines.
- For `createProviderTranslationEngines`: OpenRouter connection
  (`apiKey`/`baseUrl`) and `uiTranslation`/`reasoningTranslation` profile
  configs (`model`/`endpointTag`) supplied by the caller's settings snapshot.

## Outputs

- Translation result with original text, final text, translated text, status,
  engine id, and optional error code.
- Already-target-language text returned unchanged without invoking a provider
  engine.
- Fail-closed fallback with `errorCode: "no_engine"` when an explicit engine id
  is unavailable.
- Translation engine diagnostics.

## Owned Paths

- `module.md`
- `src/**`
