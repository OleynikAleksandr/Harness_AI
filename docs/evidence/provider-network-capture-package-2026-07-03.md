# Provider Native Request Capture Package Evidence - 2026-07-03

## Scope

Packaged application rebuild for the Codex capture transport/filter/redaction
fixes (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6). The first packaged
Codex capture (2026-07-03) recorded a bodiless WebSocket upgrade of a
background `memory_consolidation` prewarm turn instead of the probe request:
Codex CLI 0.142.x ships the experimental `responses_websockets` transport, so
the request payload never appears as a plain HTTP body, and the Codex target
rule had no body checks. This build carries the agreed fixes:

- `da49dc3a` `fix(codex-provider): force http transport for native capture` —
  new `codex:native-capture` app-server process profile
  (`--disable responses_websockets --disable responses_websockets_v2`,
  feature names validated against the installed CLI 0.142.5); the capture
  service now runs the isolated temporary app-server with it, so the probe
  turn posts the full request body (system instructions + tool schemas).
- `47cabe9f` `feat(capture-proxy): match target requests by body content` —
  `NativeCaptureTargetRule.bodyIncludes`: a non-matching request is emitted
  as `request_ignored` and the capture keeps waiting (verified by a real
  TLS prewarm-then-probe test).
- `2deb3753` `feat(capture-orchestrator): filter codex probe request and log
  proxy events` — the Codex default rule requires the diagnostic probe prompt
  in the body plus `minimumToolCount: 1`, and proxy events are recorded into
  the artifact as `capture_proxy_event` diagnostic context.
- `6db123fd` `fix(capture-artifacts): redact account id headers` —
  `account-id` header names (e.g. Codex's `chatgpt-account-id`) are masked
  with `[REDACTED]`.

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 11:19` (30458264 bytes).

## Verification State

- All four fix commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests; the capture proxy suite now includes the
  prewarm-ignored-then-probe-captured TLS case, the orchestrator suite covers
  the hardened Codex rule and the `capture_proxy_event` forwarding, and the
  artifacts suite covers `chatgpt-account-id` redaction).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): repeat the Codex capture via
  Settings -> General -> Native Request Capture and confirm the `.md` dump
  now contains the extracted system prompt and tool declarations from the
  captured `POST` body (the prewarm turn, if any, must appear only as an
  ignored `capture_proxy_event`), completing the three native pairs
  (Claude, Codex, Kimi) for Phase R.
