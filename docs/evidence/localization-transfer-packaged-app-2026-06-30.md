# Localization Transfer Packaged App Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild for the localization
transfer scope after explicit user approval to build a new application.

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

## Verification Status

- Package rebuild: passed.
- Application artifact presence check: passed.
- User acceptance retest in the packaged app: pending.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- Settings Localization tab and engine split.
- User glossary protection.
- Localized UI/help/menu copy loaded from Core-provided browser runtime
  localization payload.
- Live reasoning translation overlay and progressive reveal behavior.
