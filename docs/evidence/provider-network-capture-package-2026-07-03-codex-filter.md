# Provider Native Request Capture Package Evidence - 2026-07-03 (Codex body filter)

## Scope

Second packaged rebuild on 2026-07-03 for the Codex capture body-filter fix
(`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6). The prior build
(11:19, `provider-network-capture-package-2026-07-03.md`) fixed the transport:
the second Codex capture confirmed the `codex:native-capture` profile forces
the HTTP responses path, and the probe turn reached
`chatgpt.com/backend-api/codex/responses` with a body. But the capture still
failed with `target_not_seen` — the artifact's `capture_proxy_event` records
showed `3x request_body_not_matched` on that endpoint (Codex retries after the
proxy ends each rejected connection). The combined reason hid which check
failed and rejected bodies are not written, so this build carries:

- `36e145fb` `fix(capture-orchestrator): match codex probe by prompt only` —
  dropped `minimumToolCount: 1` from the Codex default target rule (the Codex
  Responses API nests the tool set outside the top-level `body.tools` the
  proxy counts, so requiring it falsely rejected the probe turn), keeping
  `bodyIncludes` (the diagnostic probe prompt) as the sole body discriminator
  against background prewarm turns.
- `56465cd4` `feat(capture-proxy): diagnose body-rejected target requests` —
  a request that matches the rule host+path but fails the body checks now
  carries a safe `detail` on its `request_ignored` event (`bodyBytes`,
  `hasContentLength`, `probeMatched`, `toolCount`, `topLevelKeys` —
  structural metadata only, never header or body values), so the exact cause
  of any future body rejection is visible in the artifact.

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 11:35` (30459390 bytes).

## Verification State

- Both fix commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests; the capture proxy suite asserts the body-rejected diagnostic
  detail and the orchestrator suite asserts the Codex rule no longer carries
  `minimumToolCount`).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): repeat the Codex capture via
  Settings -> General -> Native Request Capture. Expected: the probe turn is
  now captured, so the `.md` dump's `## Extracted Tool Declarations` is no
  longer `null` and the pair is complete (system prompt + tool schemas). If it
  still fails, the `capture_proxy_event` records now carry the `detail` needed
  to pin the cause (an empty parsed body with `hasContentLength: false` would
  point at a chunked request body). Completing this closes the three native
  pairs (Claude, Codex, Kimi) for Phase R.
