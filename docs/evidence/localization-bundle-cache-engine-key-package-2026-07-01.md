# Localization Bundle Cache Engine-Key Package Evidence - 2026-07-01

## User Retest

After the first OpenRouter translation engine package, the user changed both
the UI Translation Engine and Reasoning Translation Engine to an OpenRouter
Gemini model, with the target language unchanged. Settings Save did not show
the localization refresh spinner and content stayed translated by the
previous engine.

## Root Cause

The per-category disk bundle cache
(`Localization/catalogs/<category>/<language>.json`) validated only
`language` and the source dictionary `sourceFingerprint`. It never recorded
or checked which `engineId` produced the cached translation, so
`materializeBundle` returned the stale bundle without ever calling
`translationFacade.translate()` again when only the engine changed.

## Change

- `LocalizationMaterializer.readCachedBundle`/`writeCachedBundle` now also
  record and require the resolved `engineId` to match, so switching the UI
  Translation Engine while keeping the same target language invalidates the
  cached bundle and forces re-translation.
- Old cache files written before this fix have no `engineId` field, so they
  compare as a mismatch on first read and self-heal without manual cache
  clearing.
- Added a regression test that fails without the fix (verified locally by
  temporarily removing the `engineId` check) and passes with it.

## Verification

- Commit `af0e744` passed the implementation gates: `plan:validate`,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, and `npm test`.
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
    at `2026-07-01T14:12:17Z`.
