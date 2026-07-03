# Provider Native Request Capture Package Evidence - 2026-07-03 (Codex chunked body)

## Scope

Third packaged rebuild on 2026-07-03 for the Codex chunked request-body fix
(`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6). The prior build
(11:35, `provider-network-capture-package-2026-07-03-codex-filter.md`) still
failed with `target_not_seen`, but the proxy diagnostics added in that build
pinned the cause: the `detail` on the three body-rejected
`/backend-api/codex/responses` requests read
`{bodyBytes:0, hasContentLength:false, probeMatched:false, toolCount:0,
topLevelKeys:[]}`. Root cause: Codex (Rust/reqwest) streams the responses POST
with `Transfer-Encoding: chunked` and no `Content-Length`, and the proxy's
request reader sized the body by `Content-Length` only — with the header
absent it read an empty body, rejected the probe as non-matching, and ended
the connection before the chunked body arrived. This build carries:

- `24c80af8` `fix(capture-proxy): read chunked request bodies` — the request
  reader now decodes a `Transfer-Encoding: chunked` body (accumulating chunks
  until the terminal `0\r\n`, returning null while incomplete so the socket
  keeps buffering) in addition to `Content-Length` bodies, and records
  `hasTransferEncoding` in the ignored-request diagnostic detail. Because the
  chunked decoder pushed `capture-proxy-facade.ts` past the 500-line
  architecture gate, the HTTP request reader was extracted into a sibling
  `capture-proxy-http.ts` (facade now 398 lines); both capture test harnesses
  compile the new file.

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 11:49` (30461944 bytes).

## Verification State

- The fix commit passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture` — both proxy files now under 500 lines, `lint`,
  `check:knip`, `typecheck`, `npm test` — 74 static tests; the capture proxy
  suite now captures a chunked probe POST arriving in two writes).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): repeat the Codex capture via
  Settings -> General -> Native Request Capture. Expected: the chunked probe
  body is now read in full, so the `.md` dump's `## Extracted Tool
  Declarations` is no longer `null` and the Codex pair is finally complete
  (system prompt + tool schemas). Completing this closes the three native
  pairs (Claude, Codex, Kimi) for Phase R.
