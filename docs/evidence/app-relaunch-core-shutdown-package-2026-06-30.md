# App Relaunch Core Shutdown Package Evidence - 2026-06-30

## Scope

This evidence records the repair that makes Restart App stop the Core runtime
before Electron relaunches.

## Included Fix

- The Core Process Bridge exposes `stopCore()` to Electron host code.
- `Restart App` waits for `stopCore()` before scheduling `app.relaunch(...)`.
- If Core shutdown fails, the relaunch request returns `{ ok: false }` and does
  not start a new host over an old Core.
- A new Electron host can no longer attach to an orphan Core on the fixed
  `127.0.0.1:38971` port after Restart App.

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

`npm run package:mac` first ran the packaged-process cleanup and stopped the
orphan Core process that had remained from the previous app relaunch:

```bash
Stopping packaged Harness AI app processes: 16018
```

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 21:11:17 2026`
- The packaged archive contains the updated app bootstrap and Core process
  bridge modules.
- Process check after packaging found no remaining packaged Harness AI app/Core
  process.

## Verification

- Plan validation: passed.
- Typecheck: passed.
- Full test suite: `Tests: OK (59)`.
- `npm run build`: passed.
- `npm run package:mac`: passed and rebuilt `app.asar`.
- `npm run quality`: passed.
