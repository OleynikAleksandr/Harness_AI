# Reasoning Sidecar Cleanup Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for the session delete cleanup fix in commit
`99a5a41a`. The `delete-session` Core RPC now removes the Core-owned reasoning
translation sidecar JSONL from `.harness/sessions/reasoning-translations/`
alongside the session event log and provider-owned session artifact.

## Build

- User explicitly requested the package build in chat (2026-07-02).
- `npm run package:mac` passed.
- The package script stopped the stale packaged Harness AI app process before
  rebuilding.
- `npm run build` inside the package script passed `typecheck`, runtime build,
  and Vite renderer build.
- `electron-builder --mac dir --publish never` completed for `darwin/arm64`
  with code signing skipped by configuration.

## Artifact

- `release/mac-arm64/Harness AI.app` exists.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt at
  `2026-07-02 15:27:43 CEST`.
- `app.asar` size after the rebuild: `30415909` bytes.

## Verification State

- The cleanup fix commit passed commit gates.
- Pre-package tests for the fix included `npm run quality`, covering
  `check:architecture`, Ultracite lint, Knip, typecheck, and 66 tests.
- The packaged build included the rebuilt renderer asset
  `dist/renderer/assets/index-DyDCw_rf.js`.
