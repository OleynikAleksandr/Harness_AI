# Provider Native Request Capture Package Evidence - 2026-07-03 (Probe-turn WS frame)

## Scope

Fifth packaged rebuild on 2026-07-03, for the probe-turn WebSocket-frame fix
(`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.5). The forward build
(12:58) captured Codex successfully but recorded only 8 tools on `gpt-5.4` with
`request_kind: "prewarm"`, `thread_source: "memory_consolidation"` — a
background prewarm turn, not the probe turn.

Diagnostics (multi-frame decode of the WS connection, `diag-ws-all.mjs`) proved
Codex REUSES one WS connection for several `response.create` frames: background
`memory_consolidation` prewarm frames (trimmed 8-tool set, sometimes a
different model) plus the real turn. Our probe turn (`probe=true`, `gpt-5.5`)
carries the full deterministic native tool set — 17 tools: exec_command,
write_stdin, list_mcp_resources, list_mcp_resource_templates, read_mcp_resource,
update_plan, request_user_input, list_available_plugins_to_install,
request_plugin_install, apply_patch, view_image, get_goal, create_goal,
update_goal, tool_search, web_search, image_generation. The proxy had captured
the FIRST frame (a prewarm), so the dump under-reported the tool set.

This build carries:

- `1d9b86e7` `fix(capture-proxy): capture the probe turn websocket frame` —
  `decodeWsFrame` now reports the consumed byte length, and
  `runWebSocketCapture` decodes every complete frame on the connection and
  captures the first `response.create` frame whose payload contains the rule's
  `bodyIncludes` probe prompt (our turn), forwarding the prewarm frames.
  `bodyIncludes` (the diagnostic probe prompt) was restored on the Codex target
  rule and threaded into the WS route.

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 13:20` (30470415 bytes).

## Verification State

- The fix commit passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests; the capture proxy suite sends two `response.create` frames on
  one WS connection (prewarm first, probe second) and asserts the probe-turn
  frame is captured, not the prewarm one).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): repeat the Codex capture via
  Settings -> General -> Native Request Capture. Expected: the dump now shows
  the probe turn on the selected model (`gpt-5.5`) with the full ~17-tool
  native set and `## Extracted Tool Declarations` populated accordingly, not a
  prewarm turn. Open follow-up if needed: whether the MCP servers' own tools
  (playwright, node_repl) appear depends on those servers starting in the
  capture home — the 17 tools are the app-server native set. Completing this
  gives the Codex pair; Claude and Kimi still need re-capture on the forward
  build for the three Phase R pairs.
