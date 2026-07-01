# Glossary Preferred-Translation Package Evidence - 2026-07-01

## User Request

Let the glossary file also record a desired translation per term (e.g.
`English Term - Желаемый перевод`) instead of only supporting "never
translate this term at all," seed the standard glossary file with a couple
of examples of both forms, and update the Settings glossary explanation text
with examples of both forms too.

## Investigation

`GlossaryProtector`'s `preferred_translation` rule kind (`glossary-protector.ts`)
already fully implemented masking a term, letting translation run, and
restoring a caller-supplied translation instead of the source text. It was
never reachable from the user-editable glossary file, which only ever
produced `preserve` (do-not-translate) rules.

## Change

- Added a `GLOSSARY_ANY_TARGET_LANGUAGE` (`"*"`) wildcard to
  `GlossaryProtector` so a `preferred_translation` rule can apply to whichever
  non-English language a category is currently translating into, instead of
  requiring a language tag per glossary line.
- Extended `UserGlossaryStore`'s file parsing/serialization to recognize
  `Source Term - Desired translation` lines (split on the first `" - "`
  occurrence) into a new `translations` array alongside the existing flat
  `preserve` list. Seeded the auto-created glossary file with two translation
  examples (`Pull Request - Пул-реквест`, `Endpoint - Эндпоинт`) alongside the
  existing preserve-term examples, and updated the in-file header comment to
  explain both line formats.
- Wired `glossary.translations` into `materializeCoreLocalizationRuntimePayload`
  as `preferred_translation` `GlossaryRule` entries using the wildcard target
  language.
- Updated the Settings glossary card copy
  (`settings.localization.glossaryTerms.description`,
  `settings.localization.glossary.prefilled`) to show one example of each
  line format.

## Verification

- Commits `44dae4a`, `29eb1c4` each passed the implementation gates:
  `plan:validate`, `check:architecture`, `lint`, `check:knip`, `typecheck`,
  and `npm test` (including new assertions in `glossary-protector.test.mjs`
  covering wildcard-language matching and the new file-format parsing).
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was
    rebuilt at `2026-07-01T18:47:49Z`.
