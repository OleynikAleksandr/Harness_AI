# Sonnet Alias Description Package Evidence - 2026-06-30

## User Report

The Claude Settings Sonnet helper text displayed a concrete model id:
`claude-sonnet-4-5-20250929`. The user requested version-neutral copy because
the Sonnet alias should track Anthropic's latest underlying model.

## Change

- Removed the concrete Sonnet model id from the Settings model option fallback.
- Removed the same concrete model id from the approved UI Helper Text source
  dictionary entry.
- The localization runtime source dictionary fingerprint already invalidates
  cached browser bundles when source copy changes, so the Russian helper text is
  rematerialized without the stale parenthetical model id.

## Verification

- `npm run plan:validate` passed.
- `npm run quality` passed.
- `npm run package:mac` passed.
  - The package script stopped stale packaged process `11669`.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
    at `2026-06-30 22:14:56`.
