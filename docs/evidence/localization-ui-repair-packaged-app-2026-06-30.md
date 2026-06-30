# Localization UI Repair Packaged App Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after the user retest
found that interface localization did not start and the UI translation engine
selection reset to Google GTX.

## Fixes Included

- The Localization UI Translation Engine select now reads and writes
  `general.localization.uiEngineId`.
- The legacy `general.localization.engineId` alias is still kept in sync for
  settings normalization compatibility.
- Unavailable translation engine options are hidden from the Localization
  selects. The current Harness runtime registers `google-gtx`; OpenRouter,
  Codex, and Claude localization engines are not shown until their runtime
  engines exist.
- Core now materializes browser localization runtime payloads through
  `materializeCoreLocalizationRuntimePayload`.
- Core maps Harness settings category keys such as `uiLabels` and
  `uiInterface` to runtime category ids such as `ui_labels`.
- Core writes localization payload cache under the Harness home
  `Localization` directory.

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
- `app.asar` size at verification time: 28 MB.
- Electron Builder packaged `darwin` `arm64` output into
  `release/mac-arm64`.
- macOS code signing was skipped because signing identity is explicitly null.

## Build Artifact Check

The rebuilt runtime includes:

- `dist/runtime/product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-runtime.js`
- `dist/runtime/product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.js`

Artifact grep confirmed:

- `core-runtime-api.js` calls `materializeCoreLocalizationRuntimePayload` for
  `get-localization-runtime-payload`.
- `core-runtime-api.js` materializes localization after localization-impacting
  settings saves.
- `core-localization-runtime.js` maps `ui_labels` from Harness settings
  category keys.
- `core-localization-runtime.js` resolves the Harness home `Localization`
  directory.
- `core-localization-runtime.js` constructs `ProviderTranslationEnginesFacade`.

## Verification

- Commit hooks passed after each repair commit.
- Latest test run in hooks: `Tests: OK (56)`.
- Package rebuild: passed.
- Application artifact presence check: passed.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- Localization settings save keeps the UI Translation Engine value stable.
- Translation engine selects show only Google GTX until other runtime engines
  are implemented.
- Setting UI labels/helper text/messages to Russian triggers Core
  localization materialization.
- `~/.harness-ai/Localization` is created after localization runtime payload
  materialization.
