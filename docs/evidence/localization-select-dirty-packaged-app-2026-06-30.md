# Localization Select Dirty Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after the user reported
that changing a Settings localization language select did not enable Save
Changes.

## Fix Included

- Shared `SettingsSelect` now commits native `input` events as well as `change`
  events.
- Localization language/category selects therefore route value changes through
  the existing Settings `update()` callback and mark the draft dirty
  immediately.

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
  `Jun 30 15:37:22 2026`
- Renderer bundle for this package:
  `dist/renderer/assets/index-BBzwl--S.js`
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `fix: commit settings select input changes`.
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
- Open Settings > General.
- Change a localization language select such as `Messages for the User`.
- Confirm Save Changes becomes enabled.
- Save and confirm selected localized helper copy renders from the existing
  localization cache.
