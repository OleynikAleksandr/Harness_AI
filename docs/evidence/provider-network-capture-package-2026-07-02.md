# Provider Native Request Capture Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for user acceptance of the Provider Native
Request Capture feature (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6). The build carries
the full record-only native capture implementation across Phases 2-5:

- **Phase 2** — new Core cluster `provider-network-capture` (commits
  `8ad1f2de`, `69d1cf77`, `e014035b`, `170d13fd`): capture artifact writer
  with credential-header redaction, diagnostic CA/host certificate store,
  capture-and-abort MITM CONNECT proxy, and the capture orchestrator.
- **Phase 3** — aligned the pre-existing (orphaned) provider capture
  services to record-only native-vendor-default, removing the
  managed-vs-vanilla comparison and Capture Workbench machinery (commits
  `f040d68d` Claude, `c8763381` Codex, `20b16815` Kimi wire-only, `b6f410c5`
  GLM-OpenCode removal, `f978bb85` shared contract + capturable models,
  `27c33ab2` writer envelope/diagnostic records, `237a7931` orchestrator
  alignment + Kimi wire-only path).
- **Phase 4** — Core RPC `capture-native-request` / `list-capturable-models`
  and the Electron bridge/preload (`6ce5b0e7`, `66205aac`).
- **Phase 5** — localization labels and the `Native Request Capture`
  Settings card (`1541108f`, `4d2b8e51`).

Record-only decision (user, 2026-07-02): capture records the NATIVE VENDOR
DEFAULT request — no Harness system-prompt/tool injection — because the
feature exists to produce native reference dumps for building profiles.

## Build

- User confirmed the package build in chat (2026-07-02).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-02 23:13` (30455880 bytes).

## Verification State

- All Phase 2-5 commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests including the capture cluster suites: artifacts, certificates,
  proxy (real TLS handshake), orchestrator, and the capture RPC wiring).
- User acceptance in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`): open Settings -> General -> Native
  Request Capture, pick a provider and model, and capture at least three
  native pairs (Claude, Codex, Kimi), confirming each `.md`/`.jsonl` artifact
  under `~/.harness-ai/logs/native-request-capture/` contains the
  vendor-default system prompt and tool schemas. These pairs are the input to
  Phase R (prompt research).
