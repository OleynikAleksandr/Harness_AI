# OpenRouter Client Provider Module

## Responsibility

Thin OpenRouter endpoint on the Core universal client: OpenRouter dialect
specifics and the `ProviderAdapter` Core session routing constructs. The Core
universal client owns the agent loop, tool execution, SSE streaming and event
normalization.

## Public Facade

`OpenRouterClientProviderFacade` (plus the dialect/request builders
`resolveOpenRouterBaseUrl`, `buildOpenRouterDialect`,
`buildOpenRouterTurnRequest` and `OPENROUTER_DEFAULT_BASE_URL`).

## Inputs

- User message send intents routed by Core session routing.
- Core settings snapshot (`providers.openRouter`: `apiKey`, `baseUrl`,
  `defaultModel`, `endpointTag` — the SHARED OpenRouter section whose
  `translationProfiles` keep serving the localization translation engine).
- Provider auth store key/base-URL resolution for `openrouter-client`
  (shared `openRouter` aliases plus `OPENROUTER_API_KEY` /
  `OPENROUTER_BASE_URL` env fallbacks).

## Outputs

- `NormalizedProviderEvent` stream per session (`turn_started`,
  `dialog_message` live/thinking, `turn_completed`, `turn_failed`,
  `stream_error`).
- NO-DEAD-CONTROLS CONTRACT (2026-07-05 user review fix: the OpenRouter
  Settings tab is preserved EXACTLY as-is, so the endpoint honors every field
  the card edits, resolved from Core settings per turn):
  - `apiKey` — a missing key fails the turn with the English adapter literal
    ("OpenRouter API key is missing...") without firing a request;
  - `baseUrl` — the Base URL field stays honest
    (`resolveOpenRouterBaseUrl`: stored URL wins, blank falls back to
    `https://openrouter.ai/api/v1`);
  - `defaultModel` — the model-slug search result is the session model;
  - `endpointTag` — the endpoint picker routes the session: a non-default tag
    joins the request body as `provider: {allow_fallbacks: false, order:
    [tag]}` through extraBody (the reference wire form); "default" keeps
    OpenRouter automatic routing.
- OpenRouter dialect: `thinkingForm: "reasoning_details"` (structured blocks
  accumulate in the core and return through history unchanged — client-core
  history policy), `usageFromAnyChunk: true`, full tool_choice, and
  app-attribution headers (`HTTP-Referer` https://harness-ai.app, `X-Title`
  Harness AI). The MVP sends NO `reasoning` request parameter (model
  defaults apply).
- In-memory session state with final-history carry-over from
  `runClientTurn`; Stop aborts the in-flight turn and keeps history so the
  next send resumes the conversation.

## Owned Paths

- `module.md`
- `src/**`
