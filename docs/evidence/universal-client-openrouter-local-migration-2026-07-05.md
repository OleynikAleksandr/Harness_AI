# Universal Client OpenRouter + Local Models Migration Evidence - 2026-07-05

## Verdict

**ACCEPTED.** The user ran live sessions on the packaged build (third
rebuild of 2026-07-05, carrying the reload-timeout fix — see
`universal-client-openrouter-local-package-2026-07-05.md`) and accepted
both migrated providers: "теперь локальные модели нормально работают ...
Модели через OpenRouter тоже работают нормально" (2026-07-05). No
blocking findings remained open at acceptance.

This closes the Phase 4 acceptance (plan `universal-client-2026-07-04`,
task `harness-ai.phase4.stream5.task2`): the whole client four — Kimi,
GLM, Local Models, OpenRouter — now runs LIVE on OUR universal client.

## Acceptance Finding (found and fixed within this acceptance round)

The first retest FAILED on Local Models per-model context: applying a
custom context window started the model load and LM Studio then logged
"Model has not started loading/has been unloaded"
(`google/gemma-4-26b-a4b-qat`). Root cause: the management channel
aborted `POST /api/v1/models/load` with its generic 5s timeout while the
26B model was still loading — dropping the connection cancels the load
inside LM Studio. Fixed in `fix(local-models-client-provider): long
model load timeouts` (load runs on its own 600s budget, unload on 60s;
the `set-local-model-context` RPC reports an honest controlled error
when a reload does not complete, with the wish kept persisted), the app
was rebuilt, and the user's retest on the rebuilt package PASSED — the
custom per-model context window now applies.

## OpenRouter Wire Facts (Core-owned, from the shipped code)

- Endpoint/base URL: `https://openrouter.ai/api/v1` by default; the
  UNCHANGED OpenRouter Settings tab's Base URL field feeds the per-turn
  resolution (2026-07-05 review fix: every visible control stays live —
  `apiKey`, `baseUrl`, `defaultModel` via model slug search, and the
  endpoint picker).
- Identifying headers: `HTTP-Referer` / `X-Title` name Harness AI on
  every request (`OPENROUTER_DIALECT`).
- Endpoint-tag routing: a non-default endpoint tag joins the request
  body as `provider: {allow_fallbacks: false, order: [tag]}` through the
  per-turn extraBody contract (the reference wire form).
- Thinking form: `reasoning_details` — structured entries accumulate by
  index across SSE chunks in the core dialect-streaming module and
  return UNCHANGED as `reasoning_details` on assistant history messages
  (presence = policy, per-dialect history rule). The MVP sends NO
  `reasoning` request parameter (model defaults decide).
- Usage: `usageFromAnyChunk: true`; tool_choice fully supported.
- Auth: `Authorization: Bearer <key>` resolved per turn from the shared
  `providers.openRouter` section (`OPENROUTER_API_KEY` env fallback).

## Local Models Wire Facts (Core-owned, from the shipped code)

- Base URL: per-turn Core-settings resolution
  (`providers.localModels.baseUrl`, default `http://127.0.0.1:1234`;
  server root and `/v1`-prefixed forms both resolve to one `/v1` request
  base). The connection card is Base-URL-only — the API key field is
  removed end-to-end (silent `HARNESS_AI_LOCAL_API_KEY` /
  `LMSTUDIO_API_KEY` env fallbacks remain for the proxy niche).
- Thinking form: `reasoning_content`; `toolChoiceSupport: "unsupported"`
  (the core never sends `tool_choice`; auto is every server's default).
- Per-model context management (LM Studio v1 REST management channel):
  the model list shows max/loaded context and tool capability
  (`GET /api/v1/models`); Apply Context reloads the model remotely
  (`POST /api/v1/models/unload` + `/load` with `context_length`; load on
  the 600s budget per the acceptance finding above); the wish persists
  in `providers.localModels.contextLengthByModel` and re-applies once
  per session ahead of the first turn; the telemetry window follows
  applied wish → loaded v1 instance → detection probes (LM Studio v0,
  Ollama `/api/show`, llama.cpp `/props`).
- LM Studio autostart: on Core startup a silent configured server
  triggers `~/.lmstudio/bin/lms server start` (PATH `lms`, then
  `open -g -a "LM Studio"`), readiness polling and a liveness re-run;
  machines without LM Studio skip silently.

## Translation-Engine Coexistence

The single shared `providers.openRouter` section serves BOTH the
universal-client OpenRouter sessions and the localization translation
engines (`createProviderTranslationEngines`); no second key entry was
introduced, and localization kept working on the same key throughout the
acceptance round.

## Live-Run Confirmation Scope

The acceptance was given as an overall "both providers work" verdict on
the packaged build, with the Local Models per-model context reload
explicitly retested after the timeout fix. Remaining checklist items
(endpoint-tag session routing, reasoning_details display on a reasoning
model, usage payload details, autostart timing) were covered by the
overall verdict; no per-item deviations were reported.

## Consequences

- Phase 4 (Local Models + OpenRouter migration) is complete: the visible
  picker shows only universal-client endpoints for the client four.
- Legacy `openrouter` / `local-models` reference adapters stay internal,
  retired; their module disposition (including the consumed
  `src/reference/**` corpus) is the Phase 5 afterlife item, next to the
  ACP `kimi-provider` and the retired `glm-native-provider`.
- Phase 5 (Synthetic Native Profiles + afterlife removals) remains a
  milestone outline to be materialized with the user.
