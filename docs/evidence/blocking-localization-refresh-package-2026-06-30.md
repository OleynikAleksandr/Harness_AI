# Blocking Localization Refresh Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after adding reference-
style blocking feedback while Settings refreshes localization resources after
Save.

## Included Fix

- Settings Save still waits for Core `save-settings` to complete.
- After Core save succeeds, Settings shows a blocking localization refresh card
  with a spinner while `onLocalizationRuntimeRefresh()` runs.
- The blocker covers the Settings dialog so tabs, controls, and footer actions
  are not usable until localization refresh finishes.
- Save no longer fails silently by staying disabled without explanation.

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
  `Jun 30 16:39:02 2026`
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `fix: show blocking localization refresh state`.
- Hook checks included architecture, lint, Knip, typecheck, tests, commit
  message validation, and docs sync.
- Latest hook test result: `Tests: OK (58)`.
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
- Change a localization category and press Save.
- Expected result: a blocking localization card with a spinner appears while
  translated interface resources refresh; Settings becomes usable again when the
  refresh finishes.
