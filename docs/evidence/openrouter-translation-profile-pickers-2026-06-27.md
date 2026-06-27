# OpenRouter Translation Profile Pickers Verification - 2026-06-27

Scope: verify UI and reasoning translation profiles use the OpenRouter model search and endpoint picker in Settings.

Commands:

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:architecture` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm test` - OK, `Tests: OK (1)`
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg -o "UI Translation Model|Reasoning Translation Model|OpenRouter - automatic|output_modalities|models/" dist/renderer/assets/*.js | sort -u` - found all expected strings

Packaged app:

- `release/mac-arm64/Harness AI.app`

Bundle evidence:

```text
OpenRouter - automatic
Reasoning Translation Model
UI Translation Model
models/
output_modalities
```
