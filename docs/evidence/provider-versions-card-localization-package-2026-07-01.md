# Provider Versions Card Localization Package Evidence - 2026-07-01

## User Report

Screenshots showed the Claude Versions, Codex Versions, and OpenCode
Versions cards in Settings each displaying a Russian warning banner and a
Russian auto-update toggle description, even in an otherwise-English
session.

## Root Cause

`ProviderVersionsCard` (`provider-version-controls.tsx`) never imported
`useBrowserLocalization`/`t()` at all. The update-risk warning banner and the
`SettingsToggle` `description` prop were hardcoded literal Russian strings in
JSX, so they rendered in Russian unconditionally regardless of the
configured UI language — unlike every other Settings card in this codebase,
which resolves copy through the browser localization provider.

## Change

- Imported `useBrowserLocalization` into `provider-version-controls.tsx` and
  wired both hardcoded strings through `t()`.
- Added two new approved English source strings to `source-dictionaries.ts`:
  `settings.provider.versions.warning` (`messages_for_the_user`) and
  `settings.provider.versions.autoUpdate.description` (`ui_helper_text`).
- Scoped to only these two genuinely broken strings; the card's other
  already-English strings (titles, "Loading version information...",
  version-row labels) were left as-is, matching this repo's existing
  convention of leaving some transient status strings unlocalized elsewhere
  in Settings.

## Verification

- Commit `9f04fcc` passed the implementation gates: `plan:validate`,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, and `npm test`.
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was
    rebuilt at `2026-07-01T19:06:05Z`.
