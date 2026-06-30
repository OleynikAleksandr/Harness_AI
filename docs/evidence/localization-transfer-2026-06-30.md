# Localization Transfer Evidence - 2026-06-30

## Scope

This evidence records the completed localization transfer slice before packaged
application verification:

- Project Manager settings localization runtime and source dictionary transfer.
- User glossary protection for provider translation.
- Translation-first visible reasoning overlays for session messages.

Packaged application verification is tracked separately in the release/package
phase.

## Implementation Coverage

- `localization-runtime` owns approved English source dictionaries, default
  dictionary registry wiring, glossary protection, user glossary storage, and
  browser runtime payload materialization.
- `LocalizationMaterializer` writes `browser-runtime-bootstrap.json` so the
  browser process can bootstrap localization without renderer-owned product
  truth.
- Settings localization separates `uiEngineId` from `reasoningEngineId`, and
  sync excludes reasoning-only settings from UI localization sync decisions.
- Core bridge exposes `getLocalizationRuntimePayload`; the Application Shell
  browser localization module wraps the session window with
  `BrowserLocalizationProvider`.
- Session UI copies localized UI strings through `useBrowserLocalization`
  instead of renderer-local dictionaries.
- `reasoning-translation-overlay` owns reasoning eligibility policy, source
  hashes, pending state, overlay persistence, snapshot projection, and patch
  payload publication.
- Session state carries `localizedContent` and `translationState` through
  `session:message_translation` patch events while preserving the original
  source transcript in `text`.
- The renderer reveals translated reasoning progressively from
  `localizedContent` and hides source reasoning while translation is pending.
- Codex summary blocks use stable block ids and avoid duplicate final summary
  emission.
- Claude visible thinking messages are normalized as Core `thinking` messages
  and are eligible for reasoning translation overlays.

## Verification

- `npm run quality` passed repeatedly during the slice; the latest commit hooks
  passed with all 55 tests OK.
- `npm run build` passed on 2026-06-30. The build ran `npm run typecheck`,
  `npm run build:runtime`, and Vite renderer build.
- Runtime build artifacts include:
  - `dist/runtime/product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.js`
  - `dist/runtime/product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionary-registry.js`
  - `dist/runtime/product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js`
  - `dist/runtime/product-parts/core-runtime/clusters/settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.js`
- Runtime artifact grep confirmed default registry wiring to
  `APPROVED_ENGLISH_SOURCE_DICTIONARIES`, `settings.localization` source
  dictionary entries, and `ReasoningTranslationOverlayFacade` output.

## Targeted Coverage

- `localization-runtime/src/glossary-protector.test.mjs`
- `localization-runtime/src/localization-materializer.test.mjs`
- `localization-runtime/src/source-dictionaries.test.mjs`
- `reasoning-translation-overlay/src/reasoning-translation-overlay-facade.test.mjs`
- `reasoning-translation-overlay/src/reasoning-translation-overlay-store.test.mjs`
- `session-event-stream-facade.test.mjs`
- `session-request-handler-facade.test.mjs`
- `reference-session-panels.test.mjs`
- `provider-event-normalizer-facade.test.mjs`
- `session-reasoning-display-facade.test.mjs`

## Not Covered Here

- `npm run package:mac` packaged application rebuild.
- User acceptance retest in the rebuilt `release/mac-arm64/Harness AI.app`.
