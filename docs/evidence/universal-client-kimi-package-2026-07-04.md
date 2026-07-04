# Universal Client Kimi Package Evidence - 2026-07-04

## Purpose

Package build for the Phase 2 Kimi auth-gate live validation (plan
`universal-client-2026-07-04`, task `harness-ai.phase2.stream3.task6`,
user-confirmed 2026-07-04 after the API-key card landed). The user runs a
live Kimi session on this build (task7) and validates the auth-gate
acceptance checklist; results are recorded separately as the task8
evidence document.

## What This Build Carries

New Kimi path (universal client), commits since the previous package:

- `feat(core-runtime): bind kimi client provider descriptor (internal)` —
  provider visibility model, `kimi-client` catalog entry, client model
  catalog (`kimi-for-coding`).
- `feat(core-runtime): kimi client key storage and help` — auth-store
  aliases (`kimiClient`/`kimi-client`, `KIMI_API_KEY` env fallback),
  provider-help strings.
- `feat(universal-client): return final turn history from agent loop`.
- `feat(core-runtime): route sessions to kimi universal client` —
  `KimiClientProviderFacade` ProviderAdapter (in-memory sessions, full
  turn history carry-over, `NormalizedProviderEvent` emission,
  `stream_error` on failures), adapter registration + RPC id validation.
- `feat(core-runtime): switch visible kimi to universal client` — the
  visible Kimi is the `kimi-client` endpoint (`kimi-for-coding` model
  label from the Core-owned descriptor); the ACP `kimi` provider is
  internal (existing sessions only).
- `feat(core-runtime): kimi client settings section` — typed
  `providers.kimiClient` section (apiKey + pinned model), persistence,
  auth-file sync, auth overlay.
- `feat(settings-ui): kimi client api key card` — "Kimi For Coding API
  Key" card in the Kimi Settings tab (`KimiClientApiKeyCard`), bound to
  `providers.kimiClient.apiKey`, with the where-to-get-the-key help copy.

## Key Entry For The Live Run

Settings -> Kimi tab -> "Kimi For Coding API Key" card: paste the
subscription key from the Kimi Code Console (kimi.com). Saving Settings
persists it to the system settings file and syncs
`~/.harness-ai/providers/kimi-client/settings.json`; the adapter reads it
per turn through the provider-auth-store (`KIMI_API_KEY` env variable is
the fallback).

## Build

- `npm run package:mac` completed, exit 0 (output logged to a file; the
  known exit-144 pipe artifact avoided).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` rebuilt
  at `2026-07-04 20:17` (30564923 bytes).
- macOS code signing skipped (identity null) — unsigned local build, as
  before.
- Restart the app after this rebuild: a running instance keeps executing
  the old `app.asar`.
