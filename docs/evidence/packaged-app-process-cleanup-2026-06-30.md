# Packaged App Process Cleanup Evidence - 2026-06-30

## Scope

This evidence records the package script guard that stops stale packaged
Harness AI processes before rebuilding `release/mac-arm64/Harness AI.app`.

## Included Fix

- `npm run package:mac` now runs `npm run package:stop-old` before `npm run build`.
- `package:stop-old` runs `scripts/stop-packaged-app-processes.mjs`.
- The cleanup script targets only process commands containing this repository's
  `release/mac-arm64/Harness AI.app/Contents` path.
- Matching processes receive `SIGTERM` first; any process still alive after the
  grace window receives `SIGKILL`.

## Commands

```bash
node scripts/stop-packaged-app-processes.test.mjs
npm run plan:validate
npm test
npm run build
npm run package:mac
npm run quality
```

All commands completed successfully on 2026-06-30.

`npm run package:mac` first ran the cleanup script and stopped the previously
running packaged process:

```bash
Stopping packaged Harness AI app processes: 11258
```

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 17:30:10 2026`
- Process check after packaging found no remaining commands containing:
  `release/mac-arm64/Harness AI.app/Contents`

## Verification

- Targeted script test: passed.
- Plan validation: passed.
- Full test suite: `Tests: OK (59)`.
- `npm run build`: passed.
- `npm run package:mac`: passed and rebuilt:
- `npm run quality`: passed after the package script lint fixes.

```text
release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```
