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
- Selective materialization for settings changes that affect UI bundles.
- Runtime payload with active engine id, available engine catalogs, and
  category-keyed bundle entries.
- Missing key diagnostics.

## Owned Paths

- `module.md`
- `src/**`
