# OpenRouter Settings Model Search Verification - 2026-06-27

Scope: verify the Settings OpenRouter tab model slug search and endpoint selector are included in the packaged app.

Commands:

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:architecture` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm test` - OK, `Tests: OK (1)`
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg -o "Model slug search|OpenRouter - automatic|output_modalities|models/" dist/renderer/assets/*.js | sort -u` - found all expected strings

Packaged app:

- `release/mac-arm64/Harness AI.app`

Bundle evidence:

```text
Model slug search
OpenRouter - automatic
models/
output_modalities
```
