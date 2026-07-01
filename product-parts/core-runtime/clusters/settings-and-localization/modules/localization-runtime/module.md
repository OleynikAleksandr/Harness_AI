# Localization Runtime Module

## Responsibility

Own UI localization runtime contracts, source dictionary lookup, bootstrap
payload shape, glossary protection, user glossary loading, bundle
materialization, bootstrap payload reuse, and bundle state.

## Public Facade

`LocalizationRuntimeFacade`

## Inputs

- UI localization settings snapshot.
- Source dictionaries keyed by localization category and language.
- Approved English source dictionaries shipped as TypeScript exports.
- Settings shell, provider tab and first shared provider-card source strings are
  part of the approved English dictionaries.
- General Settings App Controls source strings identify restart as a full app
  relaunch because the Electron host and Core runtime both reload from disk.
- Claude provider settings helper copy and model descriptions are part of the
  approved `ui_helper_text` dictionary. Alias descriptions stay
  version-neutral; the Sonnet source string does not include a concrete model
  id so localized bundles do not preserve stale Anthropic release numbers.
- Codex provider settings helper copy and model descriptions are part of the
  approved `ui_helper_text` dictionary.
- Kimi provider settings helper copy and model descriptions are part of the
  approved `ui_helper_text` dictionary.
- GLM, OpenCode, Local Models, OpenRouter and session continuity Settings
  helper copy are part of the approved dictionaries so selecting Russian for UI
  Helper Text or Messages for the User covers those provider tabs without
  renderer-local string derivation.
- Settings localization refresh blocker copy is part of the approved
  `messages_for_the_user` dictionary so the blocking save feedback itself can
  be localized.
- Glossary preserve/preferred-translation rules.
- User-managed do-not-translate terms.
- Translation facade for materializing non-English UI bundles.
- Localization bundles.

## Outputs

- Source dictionary strings for stable message ids.
- Default source registry backed by bundled English dictionaries.
- Glossary-protected text and restored translated text.
- User glossary overrides from `do-not-translate-terms.txt`.
- Materialized runtime bundles are cached under
  `Localization/catalogs/<category>/<language>.json`, and the browser bootstrap
  payload is cached under `Localization/cache/browser-runtime-bootstrap.json`.
  The Core Runtime Process supplies the Harness home `Localization` root for
  packaged-app browser runtime payloads.
- Cache reuse is keyed by both the localization settings snapshot and the
  source dictionary fingerprint. Per-category materialized bundles also store
  that fingerprint and the resolved `engineId`, so adding or changing approved
  source strings, or switching the UI Translation Engine while keeping the same
  target language, both invalidate stale cached bundles instead of silently
  reusing content translated by a previous engine.
- Selective materialization for settings changes that affect UI bundles.
- Runtime payload with active engine id, available engine catalogs, and
  category-keyed bundle entries.
- Missing key diagnostics.

## Owned Paths

- `module.md`
- `src/**`
