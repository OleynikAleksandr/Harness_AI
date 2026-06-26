# Completed Settings Controls Verification

Date: 2026-06-26

## Scope

Verified the completion pass after rejecting temporary Settings behavior.

## Results

- `Restart Core` is no longer a disabled placeholder.
- Settings UI calls `window.harnessCore.restartCore()`.
- Electron preload exposes `restartCore`.
- Core bridge handles `harness-ai:core:restart` by clearing and re-registering provider adapters from current settings/auth.
- Settings restart flow saves dirty settings before refreshing Core adapters.
- `Allow Restart Core` is now the real guard for the restart action.

## Commands

- `rg "disabled type=|disabled\\}|disabled\\s*$|Restart Core" product-parts/application-shell/clusters/settings-surface -n`
  - Result: only functional Restart Core references remain.
- `npm run check:architecture`
  - Result: OK.
- `npm run lint`
  - Result: OK.
- `npm run typecheck`
  - Result: OK.
- `npm run test`
  - Result: OK, 1 test.
- `npm run package:mac`
  - Result: OK.
  - App output: `release/mac-arm64/Harness AI.app`.
