# OpenRouter Profile Sections Verification - 2026-06-27

Scope: verify UI and reasoning OpenRouter translation profiles are visually separated into distinct Settings blocks.

Commands:

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:architecture` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm test` - OK, `Tests: OK (1)`
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg -o "settings-profile-title|OpenRouter Profiles|UI Translation Model|Reasoning Translation Model|Model slug search" dist/renderer/assets/* | sort | uniq -c` - found expected labels and profile title class

Packaged app:

- `release/mac-arm64/Harness AI.app`

Bundle evidence:

```text
1 dist/renderer/assets/index-BZR69Z_4.css:settings-profile-title
3 dist/renderer/assets/index-bR-seMc2.js:Model slug search
2 dist/renderer/assets/index-bR-seMc2.js:OpenRouter Profiles
1 dist/renderer/assets/index-bR-seMc2.js:Reasoning Translation Model
1 dist/renderer/assets/index-bR-seMc2.js:UI Translation Model
2 dist/renderer/assets/index-bR-seMc2.js:settings-profile-title
```
