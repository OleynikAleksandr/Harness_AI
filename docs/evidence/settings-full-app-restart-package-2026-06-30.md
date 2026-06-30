# Settings Full App Restart Package Evidence - 2026-06-30

## Scope

This evidence records replacing the General Settings restart action with a full
Electron app relaunch and rebuilding the packaged macOS app.

## Included Fix

- The Electron host exposes `window.harnessShell.restartApp()` through preload.
- General Settings now labels the action as `Restart App`.
- Restart App saves dirty Settings first.
- After Settings are saved, the renderer asks the Electron host to relaunch the
  whole app instead of only restarting the Core child process.
- The relaunch path closes the current host and starts a new process, so a
  rebuilt packaged app reads the current `app.asar` from disk.

## Commands

```bash
npm run plan:validate
npm run typecheck
npm test
npm run build
npm run package:mac
npm run quality
```

All commands completed successfully on 2026-06-30.

`npm run package:mac` first ran the packaged-process cleanup:

```bash
No running packaged Harness AI app processes found.
```

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 20:37:18 2026`
- Packaged renderer asset:
  `dist/renderer/assets/index-BLaNLrvT.js`
- Packaged archive contains:
  `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs`

## Verification

- Plan validation: passed.
- Typecheck: passed.
- Full test suite: `Tests: OK (59)`.
- `npm run build`: passed.
- `npm run package:mac`: passed and rebuilt `app.asar`.
- `npm run quality`: passed.
