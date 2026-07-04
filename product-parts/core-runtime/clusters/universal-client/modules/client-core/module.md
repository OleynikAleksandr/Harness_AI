# Client Core Module

## Responsibility

Own the universal client's agent loop — the engine that runs one user turn to
completion. Each step builds an OpenAI-shape `chat.completions` request from the
running history + tools + dialect, streams the response through
`dialect-streaming` (emitting content and thinking as events), appends the
assistant message, and — while the model returns tool calls — executes them
full-auto through the tool registry (in parallel) and feeds the results back,
until the model stops asking for tools. Guards: a per-turn step ceiling (64) and
a doom-loop detector (the same tool call repeated). Retries 429/5xx/network with
backoff + Retry-After; auth and context-overflow are terminal. Any failure ends
the turn as one `turn_failed` event. Permissions are full-auto (pass-through) in
MVP. Behavior ported from the reference glm-native agent runtime + OpenCode
recipes.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.1, 3.3, 3.4).

## Public Facade

`client-core-facade.ts`

## Inputs

- `RunClientTurnParams`: a `ClientTurnRequest` (model, message history, tools,
  dialect, optional api key and abort signal), the `ToolRegistry`, the
  workspace path, an `onEvent` sink, and an optional step ceiling.

## Outputs

- `runClientTurn(params)`: drives the loop and emits `ClientTurnEvent`s
  (`turn_started` -> `assistant_delta` / `thinking_delta` -> `turn_completed`
  or `turn_failed`). Executes tool calls through the registry and threads the
  results back into history.
- `client-core-http.ts`: `callModel(params)` performs one streamed model call
  (request build, fetch with retries + Retry-After, dialect-driven stream parse)
  and returns the assembled content + tool calls; `ClientTurnError` carries the
  normalized `ClientErrorReason`.

## Owned Paths

- `module.md`
- `src/**`
