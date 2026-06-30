# Core Restart Failure Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after fixing the Settings
Restart Core flow so failed Core restart paths return a settled renderer result
instead of leaving the restart spinner running forever.

## Included Fix

- Core restart IPC now returns `{ ok: false, error }` when Core restart or
  post-restart hydration fails.
- The Core event stream is reconnected after a successful restart and after a
  failed restart attempt.
- Settings Save and Restart Core actions catch rejected Core bridge promises and
  always clear their busy state.

## Commands

```bash
npm run build
npm run package:mac
```

Both commands completed successfully on 2026-06-30. `package:mac` also ran its
own build step before invoking `electron-builder --mac dir --publish never`.

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 16:24:16 2026`
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `fix: stop core restart spinner on failure`.
- Hook checks included architecture, lint, Knip, typecheck, tests, commit
  message validation, and docs sync.
- Latest hook test result: `Tests: OK (57)`.
- Package rebuild: passed.
- Application artifact presence check: passed.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- Fully quit the old Harness AI process.
- Open the rebuilt app.
- Open Settings > General.
- Change one localization category, save, then change another category.
- Press Restart Core.
- Expected result: if Core restart fails, the Restart Core row shows an error
  and the spinner stops; if restart succeeds, the renderer reloads.
