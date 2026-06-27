# OpenRouter Endpoint Latency UI Verification - 2026-06-27

Scope: verify OpenRouter endpoint latency testing is packaged for the main model picker and both translation profile pickers.

Commands:

- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run check:architecture` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm test` - OK, `Tests: OK (2)`
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg -o "OpenRouter Endpoint Latency|Test latency|Use fastest|settings-latency-panel|chat/completions|allow_fallbacks|latency_last_30m" dist/renderer/assets/* | sort | uniq -c` - found expected UI, request, metric, and style strings

Packaged app:

- `release/mac-arm64/Harness AI.app`

Bundle evidence:

```text
1 dist/renderer/assets/index-BKJptr8r.js:OpenRouter Endpoint Latency
1 dist/renderer/assets/index-BKJptr8r.js:Test latency
1 dist/renderer/assets/index-BKJptr8r.js:Use fastest
1 dist/renderer/assets/index-BKJptr8r.js:allow_fallbacks
1 dist/renderer/assets/index-BKJptr8r.js:chat/completions
1 dist/renderer/assets/index-BKJptr8r.js:latency_last_30m
1 dist/renderer/assets/index-BKJptr8r.js:settings-latency-panel
3 dist/renderer/assets/index-quOnIoIh.css:settings-latency-panel
```
