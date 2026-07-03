# Provider Native Request Capture Package Evidence - 2026-07-03 (Model in filenames)

## Scope

Sixth packaged rebuild on 2026-07-03, for the Codex tool-layer documentation
and the model-in-filename change (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.5), ahead of the
Claude/Kimi re-capture on the forward build.

Commits in this build:

- `4d7599ec` `docs(architecture): record codex tool layers and mcp/browser
  findings` — SessionProfilesV2 now records that the Codex native inline tool
  set is 17 tools, that app-server feature flags do not add tools, and that
  `browser_use`/`computer_use`/MCP-server tool schemas live in a deferred/MCP
  layer (`tool_search` + `AlwaysDeferMcpTools`, MCP servers playwright/
  node_repl) outside the `/responses` inline contract.
- `5ce6af99` `feat(capture-artifacts): include model id in artifact filenames`
  — the writer stem is now `<timestamp>-<provider>-<model>-native-request.
  {jsonl,md}` (the model id is sanitized to filename-safe chars, omitted when
  no model was selected), so dumps for different models are distinguishable
  (e.g. `...-codex-gpt-5.5-native-request.md`).

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 13:42` (30470955 bytes).

## Verification State

- Both commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests; the capture-artifacts suite asserts the model segment appears
  in the filename, is omitted when no model is selected, and unsafe characters
  are sanitized).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`), now focused on Claude and Kimi on the
  forward build: capture via Settings -> General -> Native Request Capture.
  Expected for Claude: the HTTP forward path captures a `POST`
  `api.anthropic.com/v1/messages` with the native Claude Code tool set
  (Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, TodoWrite,
  ...), and the artifact filename now carries the model id. Completing Claude
  and Kimi gives the three native pairs for Phase R.
