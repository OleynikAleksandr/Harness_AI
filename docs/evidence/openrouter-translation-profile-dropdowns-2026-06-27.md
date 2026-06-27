# OpenRouter Translation Profile Dropdowns Verification - 2026-06-27

Scope: verify General localization engine dropdowns expose the selected OpenRouter UI and reasoning translation profile models.

Commands:

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:architecture` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm test` - OK, `Tests: OK (2)`
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg -o "OpenRouter|profileLabel|openrouter-default" dist/renderer/assets/*.js | sort | uniq -c` - found OpenRouter strings in bundle
- `rg -o "OpenRouter UI|OpenRouter Reasoning|openrouter-ui-translation|openrouter-reasoning-translation" dist/renderer/assets/* | sort | uniq -c` - found both OpenRouter engine ids in bundle

Packaged app:

- `release/mac-arm64/Harness AI.app`

Bundle evidence:

```text
13 OpenRouter
1 openrouter-default
1 openrouter-reasoning-translation
1 openrouter-ui-translation
```
