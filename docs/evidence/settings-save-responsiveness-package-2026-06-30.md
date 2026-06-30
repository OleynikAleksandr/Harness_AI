# Settings Save Responsiveness Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after fixing Settings
Save responsiveness when changing localization categories one after another.

## Included Fix

- Settings Save waits for Core `save-settings` to complete.
- The post-save localization runtime payload refresh runs in the background.
- Save busy state clears after Core save completion, so later Settings changes
  can mark the draft dirty and enable Save immediately.
- A source test locks the Save contract so it does not await localization
  runtime refresh again.

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
  `Jun 30 16:31:37 2026`
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for
  `fix: keep settings save responsive after localization refresh`.
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
- Change one localization category and save.
- Change another localization category.
- Expected result: Save becomes enabled again after the second change without
  needing Restart Core.
