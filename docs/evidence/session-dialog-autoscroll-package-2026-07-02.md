# Session Dialog Autoscroll Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for the session dialog autoscroll acceptance fix
in commit `f45fc9cf`. The dialog now keeps bottom-lock pinned to the lowest
visible message bubble bottom with a shadow reserve, and repins through a
`ResizeObserver` when an earlier thinking bubble grows after a later assistant
bubble already exists.

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
  `2026-07-02 14:44:40 CEST`.
- `app.asar` size after the rebuild: `30415386` bytes.

## Verification State

- The autoscroll fix commit passed commit gates.
- Pre-package tests for the fix included `npm run quality`, covering
  `check:architecture`, Ultracite lint, Knip, typecheck, and 66 tests.
- The packaged build included the rebuilt renderer asset
  `dist/renderer/assets/index-DyDCw_rf.js`.
