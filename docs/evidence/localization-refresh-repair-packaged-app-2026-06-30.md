# Localization Refresh Repair Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after the user confirmed
that Harness localization cache files are created, but the open Settings dialog
still showed English helper copy after choosing Russian.

## Fix Included

- `SessionWindowFacade` now passes its existing browser localization runtime
  refresh callback into `ProviderSettingsUiFacade`.
- `ProviderSettingsUiFacade` now refreshes the browser localization runtime
  payload after successful Settings save and workspace settings reset.
- The open Settings dialog can therefore re-render with newly materialized
  localized bundles without requiring an app restart or dialog reopen.

## Commands

```bash
npm run build
npm run package:mac
```

Both commands completed successfully on 2026-06-30. `package:mac` also ran its
own production build before invoking Electron Builder.

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` verification timestamp:
  `Jun 30 15:16:48 2026`
- Electron Builder packaged `darwin` `arm64` output into
  `release/mac-arm64`.
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `fix: refresh localization payload after settings
  save`.
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

- Open Settings, set UI Helper Text / Messages / Artifacts / Reasoning to
  Russian, save, and confirm the visible marked helper copy updates in the open
  dialog.
- Confirm cache files remain under:
  - `~/.harness-ai/Localization/catalogs/<category>/<language>.json`
  - `~/.harness-ai/Localization/cache/browser-runtime-bootstrap.json`

## Remaining Incremental Work

This repair refreshes already materialized browser localization payloads after
Settings changes. It does not mark every remaining provider-specific settings
row; those should continue as small localization marker slices.
