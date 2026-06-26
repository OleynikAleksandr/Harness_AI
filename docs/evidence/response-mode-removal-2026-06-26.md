# Dead General Control Removal Evidence - 2026-06-26

## Scope

- Removed the unused General answer-shaping control from Settings.
- Removed the unused response-policy settings type, defaults, persistence output, and textarea helper.
- Removed current documentation references to the deleted control.

## Verification

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- Repository and packaged app search for the deleted UI label, settings keys, strict-schema labels, and removed textarea helper - no matches

## Delivered Artifact

- `release/mac-arm64/Harness AI.app`
