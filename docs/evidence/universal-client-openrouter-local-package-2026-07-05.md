# Universal Client OpenRouter + Local Models Package Evidence - 2026-07-05

## Purpose

Package build for the Phase 4 acceptance (plan `universal-client-2026-07-04`,
task `harness-ai.phase4.stream5.task1`). The user explicitly ordered the
build on 2026-07-05 together with the execution go
("Исполняй и в конце собери новый пакет") — the packaging gate's fresh
explicit confirmation.

The next task is the user's live validation of both providers on this
packaged build.

## What This Build Carries

Phase 4 visibility switch applied — the whole client four now runs on the
universal client:

- The visible OpenRouter is `openrouter-client` on the Core universal client
  (`openrouter-client-provider`). The OpenRouter Settings tab is preserved
  EXACTLY as before (2026-07-05 user review fix) and every field drives the
  endpoint per turn: `apiKey`, `baseUrl` (blank falls back to
  `https://openrouter.ai/api/v1`), `defaultModel` (model slug search), and
  `endpointTag` (a non-default tag routes the session via the request body
  `provider: {allow_fallbacks: false, order: [tag]}`). The MVP sends no
  `reasoning` request parameter; `reasoning_details` accumulate in the core
  stream and return unchanged on assistant history messages.
- The visible Local Models is `local-models-client` on the Core universal
  client (`local-models-client-provider`). The Local Models tab gains the
  connection card (base URL — server root or `/v1` prefix, optional Bearer
  key, context-length override) above the live model list; the
  `get-local-models` catalog and the liveness preflight now read the
  CONFIGURED base URL (the hardcoded LM-Studio URL left production paths).
  Context length auto-detects per session (LM Studio `/api/v0/models`,
  Ollama `/api/show`, llama.cpp `/props`; the settings override wins) and
  feeds the session usage telemetry limit.
- One OpenRouter key serves coding sessions AND the localization translation
  engine (`providers.openRouter` stays the single shared section;
  `translationProfiles` untouched).
- Legacy `openrouter`/`local-models` reference adapters are internal
  (registered, hidden from the picker; module disposition is the Phase 5
  afterlife item). No session continuity is owed across this update per the
  2026-07-04 user decision.

## Build

- `npm run package:mac` completed, exit 0 (log:
  `package-mac.log` in the session scratchpad; progress output redirected to
  a file per the known pipe exit-144 artifact).
- Artifact: `release/mac-arm64/Harness AI.app` with a rebuilt `app.asar`
  (2026-07-05).
- Quality gates ran automatically on every Phase 4 commit (pre-commit chain:
  plan validation, Ultracite, architecture, lint, knip, typecheck, tests —
  85 test files green at the package commit).

## Refinement Rebuild (same day, user review round 2)

The user reviewed the first packaged build's Local Models tab and ordered
three follow-ups (plan stream `harness-ai.phase4.stream6`); the app was
REBUILT with them (`npm run package:mac`, exit 0, `app.asar` refreshed
2026-07-05, second run):

- The API key field is REMOVED end-to-end (LM Studio's local server has no
  authentication; the llama.cpp/proxy niche stays on the silent
  `HARNESS_AI_LOCAL_API_KEY`/`LMSTUDIO_API_KEY` env fallbacks).
- Per-model context management on the REAL LM Studio v1 REST API (researched
  2026-07-05, LM Studio 0.4.0+): the model list shows each model's max/loaded
  context and tool capability (`GET /api/v1/models`), the selected model
  carries a Context Length control whose Apply reloads the model remotely
  (`POST /api/v1/models/unload` + `/load` with `context_length`), the wish
  persists per model (`providers.localModels.contextLengthByModel`) and is
  re-applied on session turns; the telemetry window follows applied wish →
  loaded instance → probes. The global Context Length Override is gone.
  Ollama/llama.cpp and older LM Studio degrade to detection-only rows.
- Unconditional LM Studio autostart: on Core startup, when the configured
  server is silent, Harness launches `~/.lmstudio/bin/lms server start`
  (PATH `lms`, then `open -g -a "LM Studio"` on macOS), polls readiness and
  re-runs the local-models liveness; machines without LM Studio skip
  silently.

## Reload-Timeout Fix Rebuild (same day, acceptance finding)

The user's live retest hit a reload failure: setting a custom context window
started the model load and LM Studio then logged "Model has not started
loading/has been unloaded" (`google/gemma-4-26b-a4b-qat`). Root cause: the
management channel aborted `POST /api/v1/models/load` with its generic 5s
timeout while the 26B model was still loading — the connection drop cancels
the load inside LM Studio. Fixed and REBUILT (`npm run package:mac`, exit 0,
`app.asar` refreshed 2026-07-05, third run):

- `loadLocalModel` now runs on its own `LOAD_TIMEOUT_MS` (600s — the load
  call holds the connection open until the model is in memory) and
  `unloadLocalModel` on `UNLOAD_TIMEOUT_MS` (60s); the generic 5s timeout
  stays for catalog reads only.
- The `set-local-model-context` RPC reports an honest controlled error when
  the reload did not complete (wish stays persisted and re-applies on the
  next session start) and still returns the refreshed catalog; the Settings
  UI surfaces the message and swaps the list in.

## Verification Status

- This document records the BUILD evidence only. The live acceptance
  checklist (task `harness-ai.phase4.stream5.task2`) is the user's run on
  this packaged app; its results land in the migration evidence document
  (task `harness-ai.phase4.stream5.task3`).
