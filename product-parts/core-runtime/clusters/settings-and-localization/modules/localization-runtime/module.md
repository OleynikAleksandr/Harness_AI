# Localization Runtime Module

## Responsibility

Own UI localization runtime contracts, source dictionary lookup, bootstrap
payload shape, glossary protection, user glossary loading, and bundle state.

## Public Facade

`LocalizationRuntimeFacade`

## Inputs

- UI localization settings snapshot.
- Source dictionaries keyed by localization category and language.
- Glossary preserve/preferred-translation rules.
- User-managed do-not-translate terms.
- Localization bundles.

## Outputs

- Source dictionary strings for stable message ids.
- Glossary-protected text and restored translated text.
- User glossary overrides from `do-not-translate-terms.txt`.
- Runtime payload with active engine id, available engine catalogs, and
  category-keyed bundle entries.
- Missing key diagnostics.

## Owned Paths

- `module.md`
- `src/**`
