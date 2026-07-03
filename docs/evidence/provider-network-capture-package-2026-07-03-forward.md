# Provider Native Request Capture Package Evidence - 2026-07-03 (Forward rearchitecture)

## Scope

Fourth packaged rebuild on 2026-07-03, for the forward-transit capture
rearchitecture (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.5). The three prior
2026-07-03 builds all failed to capture Codex because they assumed
capture-and-abort could read an HTTP body. Diagnostic runs against the real
Codex app-server 0.142.5 proved the root cause and the fix:

- Codex 0.142.5 forces a WebSocket transport for `/backend-api/codex/responses`
  and it cannot be disabled (`--disable responses_websockets` no longer
  switches it; `-c model_providers.openai.supports_websockets=false` is
  rejected as a reserved built-in). The request payload lives only in WS
  frames sent after a real upgrade handshake, so capture-and-abort could never
  see it.
- Forward transit works: the proxy forwards the WS upgrade to the real
  chatgpt.com with `Sec-WebSocket-Extensions` stripped (no permessage-deflate),
  decodes the first client text frame, and extracts the Codex
  `response.create` payload (system prompt + tools). claude-tap has no native
  WS capture (its TODO); the forward model is its architecture, the
  deflate-strip trick is ours.

User decisions (2026-07-03): pivot Codex to forward + WS-decode; the probe
request reaching the server is acceptable; unify all three providers on the
forward proxy. This changed SessionProfilesV2 decision 5.

Commits in this build (Phase 6.5):

- `5f612474` `feat(capture-proxy): forward matched requests to upstream` —
  forward transit for HTTP: terminate TLS, forward to the real upstream, relay
  the response, capture the first matching request; non-target hosts are blind
  TCP tunnels. Injectable `createUpstream` for tests.
- `0440b655` `feat(capture-proxy): forward websocket upgrade and decode request
  frame` — WS upgrade forwarding + masked-frame decode in the new
  `capture-proxy-ws.ts`; strips `Sec-WebSocket-Extensions`.
- `97760547` `refactor(provider-network-capture): forward-model orchestration
  and drop ws-disable profile` — removed the dead `codex:native-capture`
  profile (Codex runs the default app-server); Codex rule is host+path only.
- `45dde05f` `feat(capture-artifacts): extract codex response.create sections`
  — confirmed the extractor reads `{type, instructions, tools, input}`.
- `60025c4d` `refactor(provider-network-capture): correct stale
  capture-and-abort labels` — the dump now shows `Capture mode: MITM forward
  transit` and `Sent upstream: true`.

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 12:58` (30469636 bytes).

## Verification State

- All Phase 6.5 commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture` — all proxy files under 500 lines, `lint`,
  `check:knip`, `typecheck`, `npm test` — 74 static tests; the capture proxy
  suite exercises forward transit with a fake upstream, a non-probe request
  forwarded-but-ignored, and a WebSocket upgrade whose decoded `response.create`
  frame is captured with `Sec-WebSocket-Extensions` stripped).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): repeat the Codex capture via
  Settings -> General -> Native Request Capture. Expected: the WS
  `response.create` frame is decoded, so the `.md` dump shows `Capture mode:
  MITM forward transit`, `Sent upstream: true`, and a non-null
  `## Extracted Tool Declarations`. This completes the Codex pair and, with
  Claude and Kimi, the three native pairs for Phase R. Behavior change to
  confirm: the probe request now reaches the vendor (the WS upgrade completes
  and a `response.create` is sent) — this is the accepted trade-off for
  capturing the WS transport.
