# Localization Open Refresh Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after the user reported
that Settings helper copy still displayed English fallbacks while Russian cache
files already existed.

## Fix Included

- `ProviderSettingsUiFacade` now refreshes the browser localization runtime
  payload whenever the Settings dialog opens.
- The existing save/reset refresh behavior remains in place.
- This covers the case where `Save Changes` is disabled and the user has no
  dirty Settings change that would otherwise trigger a payload refresh.

## Command

```bash
npm run package:mac
```

The command completed successfully on 2026-06-30. It ran:

- `npm run build`
- `npm run typecheck`
- `npm run build:runtime`
- Vite renderer production build
- `electron-builder --mac dir --publish never`

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 15:24:17 2026`
- Renderer bundle for this package:
  `dist/renderer/assets/index-Cqi95TeE.js`
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `fix: refresh localization payload when settings
  opens`.
- Hook checks included architecture, lint, Knip, typecheck, tests, commit
  message validation, and docs sync.
- Latest hook test result: `Tests: OK (56)`.
- Package rebuild: passed.
- Application artifact presence check: passed.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- Fully quit the old Harness AI process.
- Start the rebuilt app.
- Open Settings.
- Confirm Russian `UI Helper Text`, `Messages for the User`, and other selected
  categories render marked helper copy from the existing localization payload.
