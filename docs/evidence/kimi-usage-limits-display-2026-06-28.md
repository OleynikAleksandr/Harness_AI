# Kimi Usage Limits Display Evidence - 2026-06-28

## Scope

Fixed Kimi 5-hour and weekly limit display by refreshing Core-owned provider telemetry when a session dialog is hydrated.

## Reference

Checked `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/packages/Kimi_Module/src/provider/kimi-usage-limits-reader.ts` and the Kimi usage reader/test contract. Harness Kimi reader already follows the same API endpoint and 5h `remaining` handling; the missing piece was Core lifecycle refresh on dialog hydration.

## Runtime Probe

Current Harness runtime Kimi adapter returned one `usage_limits` event from `https://api.kimi.com/coding/v1/usages` with:

- 5h bucket present.
- Weekly bucket present.

## Verification

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm run typecheck` - OK
- `npm test` - OK, 32 tests
- `npm run check:dup` - OK, reports existing exact clone counts with exit code 0
- `npm run check:security` - OK, 0 high production vulnerabilities
- `npm run check:links` - OK
- `npm run build` - OK
- `npm run package:mac` - OK

## Packaged App

- `release/mac-arm64/Harness AI.app` exists after packaging.
