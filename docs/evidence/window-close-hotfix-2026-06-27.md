# Window Close Hotfix Verification - 2026-06-27

## Scope

- Fixed the Electron Core bridge cleanup path so `closed` handlers do not read `BrowserWindow.webContents` after the window is destroyed.

## Checks

- `npm run typecheck` - OK
- `npm test` - OK, 6 tests
- `npm run package:mac` - OK
- `npm run check:security` - OK, 0 vulnerabilities
- `npm run check:links` - OK

## Artifact

- `release/mac-arm64/Harness AI.app` exists.
