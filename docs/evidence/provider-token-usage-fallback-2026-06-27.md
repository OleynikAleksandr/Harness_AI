# Provider Token Usage Fallback Verification - 2026-06-27

## Scope

- CLI-backed providers now emit provider-runtime `token_usage` fallback telemetry after a completed turn.
- Codex emits fallback token usage from provider events when the app-server does not send exact token usage for the turn.
- Exact provider `token_usage`, when present, remains the preferred telemetry source.
- Token usage without an explicit limit now preserves the Core provider-specific context limit.

## Checks

- `npm run typecheck` - OK
- `npm test` - OK, 8 tests
- `npm run build` - OK
- `npm run package:mac` - OK
- `npm run check:security` - OK, 0 vulnerabilities
- `npm run check:links` - OK

## Artifact

- `release/mac-arm64/Harness AI.app` exists.

## Note

- The fallback is an estimate for providers that do not expose exact turn token usage.
