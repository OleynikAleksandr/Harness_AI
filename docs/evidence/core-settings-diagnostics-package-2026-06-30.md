# Core Settings Diagnostics Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after adding Core-owned
settings diagnostics for the localization selector investigation.

## Diagnostics Included

- Core Settings Store writes JSONL diagnostics to:
  `~/.harness-ai/logs/core/settings-store.jsonl`
- The first Core settings log event creates these runtime log roots:
  - `~/.harness-ai/logs/core/`
  - `~/.harness-ai/logs/interface/`
  - `~/.harness-ai/logs/providers/`
- Logged events:
  - `settings.get`
  - `settings.reset`
  - `settings.save.requested`
  - `settings.save.completed`
- Logged settings data is sanitized to localization categories, language/engine
  ids, glossary flag, workspace path, and settings file paths. Provider secrets
  are not written.

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
- `app.asar` verification timestamp:
  `Jun 30 15:59:33 2026`
- Runtime grep confirmed `settings-store.jsonl` and
  `logCoreSettingsSnapshot` are present in `dist/runtime`.
- macOS code signing was skipped because signing identity is explicitly null.

## Verification

- Commit hooks passed for `feat: add core settings diagnostics log`.
- Hook checks included architecture, lint, Knip, typecheck, tests, commit
  message validation, and docs sync.
- Latest hook test result: `Tests: OK (57)`.
- Package rebuild: passed.
- Application artifact presence check: passed.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- Fully quit the old Harness AI process.
- Open Settings > General.
- Change localization selectors, especially `Messages for the User` and
  `Artifacts for the User`.
- If Save still does not activate or settings diverge, inspect:
  `~/.harness-ai/logs/core/settings-store.jsonl`

Expected diagnostic signal:

- If no `settings.save.requested` entry appears after a failed selector change,
  the change did not reach Core.
- If `settings.save.requested` appears with the changed category but
  `settings.save.completed` differs, Core normalization/persistence is the next
  fault boundary.
