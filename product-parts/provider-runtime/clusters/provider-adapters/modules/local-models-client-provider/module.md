# Local Models Client Provider Module

## Responsibility

Thin Local Models endpoint on the Core universal client: local-server dialect
specifics and the `ProviderAdapter` Core session routing constructs. The Core
universal client owns the agent loop, tool execution, SSE streaming and event
normalization.

## Public Facade

`LocalModelsClientProviderFacade` (plus the dialect/request builders
`resolveLocalModelsV1BaseUrl`, `buildLocalModelsDialect`,
`buildLocalModelsTurnRequest`).

## Inputs

- User message send intents routed by Core session routing.
- Core settings snapshot (`providers.localModels`: `baseUrl`, optional
  `apiKey`, `contextLength`, `defaultModel`).
- Provider auth store connection resolution for `local-models-client`
  (settings-file aliases plus `HARNESS_AI_LOCAL_MODELS_BASE_URL`/
  `LMSTUDIO_BASE_URL` and `HARNESS_AI_LOCAL_API_KEY`/`LMSTUDIO_API_KEY` env
  fallbacks).

## Outputs

- `NormalizedProviderEvent` stream per session (`turn_started`,
  `dialog_message` live/thinking, `turn_completed`, `turn_failed`,
  `stream_error`).
- Local Models dialect profile: per-turn base URL resolved from Core settings
  (`resolveLocalModelsV1BaseUrl` accepts the server root or a full `/v1`
  prefix — both resolve to one `/v1` request base), no vendor headers,
  `thinkingForm: "reasoning_content"` (the LM Studio / vLLM /
  llama.cpp-deepseek form; raw `<think>`-tag templates remain a per-model
  concern for the core `think_tags` splitter if a live model needs it), and
  `toolChoiceSupport: "unsupported"` so the core never sends `tool_choice`
  (Ollama rejects the parameter; auto is every server's default).
- Bearer auth comes ONLY from the silent auth-store env fallbacks
  (`HARNESS_AI_LOCAL_API_KEY`/`LMSTUDIO_API_KEY`): there is no settings/UI
  key field (2026-07-05 user review fix — LM Studio's local server has no
  authentication), a missing key is the norm and the request simply carries
  no Authorization header.
- A missing/empty base URL from every source fails the turn with the English
  adapter literal ("Local Models server base URL is missing...") without
  firing a request; localized onboarding copy lives in the Settings provider
  help strings.
- In-memory session state with final-history carry-over from
  `runClientTurn`; Stop aborts the in-flight turn and keeps history so the
  next send resumes the conversation.
- Live model catalog (`listLocalModels`): `GET {v1 base}/models` ids from the
  CONFIGURED server (auth-store base URL with env fallbacks, else the merged
  settings default) — one loader serving the Core `get-local-models` RPC and
  the liveness preflight; the old hardcoded LM-Studio URL is gone from
  production paths (Core Authority fix).
- LM Studio management channel (`local-models-management.ts`, researched
  2026-07-05; requires LM Studio 0.4.0+): `listLocalModelEntries` returns the
  structured catalog — LM Studio v1 `GET /api/v1/models` (per-model
  `max_context_length`, `loaded_instances[].config.context_length`,
  `capabilities.trained_for_tool_use`; embeddings skipped) with fallbacks to
  v0 `/api/v0/models` and plain `/v1/models` ids (Ollama/llama.cpp —
  detection-only). `loadLocalModel` (`POST /api/v1/models/load` with
  `{model, context_length, echo_load_config}`), `unloadLocalModel`
  (`POST /api/v1/models/unload` with `{instance_id}`) and
  `ensureLocalModelContext(model, desired)` implement the Harness
  counterpart of the LM Studio load slider: no-op when the running instance
  already matches, reload (unload + load) when it differs, null when the
  server has no management surface. Inference stays on the OpenAI-shape
  `/v1/chat/completions`; this is a separate Core-owned management channel.
- Context-length detection (`local-models-context-length.ts`): OpenAI-shape
  `/v1/models` reports no context window, so one probe per session asks the
  provider-specific endpoints against the server ROOT (LM Studio
  `GET /api/v0/models` — `loaded_context_length` beats `max_context_length`;
  Ollama `POST /api/show` — the family-prefixed `*.context_length` key;
  llama.cpp `GET /props` — `default_generation_settings.n_ctx`) with the
  per-model settings wish (`contextLengthByModel[model]`) as the last word.
  A detected window is published as a `system` `NormalizedProviderEvent`
  carrying `data.tokenUsage.limit`, which the existing session telemetry
  channel (`applyProviderEvent`) applies as the context-window limit; when
  nothing answers, the telemetry default stays.

## Owned Paths

- `module.md`
- `src/**`
