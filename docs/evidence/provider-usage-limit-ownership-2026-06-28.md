# Provider Usage Limit Ownership Verification - 2026-06-28

## Scope

Provider usage-limit reader cleanup after the Kimi limit retest.

## Result

The shared provider adapter contract now owns only the `refreshUsageLimits`
boundary. It no longer contains provider-specific usage-limit reader algorithms.

Provider-specific mechanisms remain provider-owned:

- Claude: `product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-usage-limits-reader.ts`
- Codex: `product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/app-server/codex-app-server-usage-limits.ts`
- Kimi: `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/reference/provider/kimi-usage-limits-reader.ts`
- GLM Native: `product-parts/provider-runtime/clusters/provider-adapters/modules/glm-native-provider/src/reference/provider/glm-usage-limits-reader.ts`

OpenCode, OpenRouter, and Local Models still do not have account 5h/weekly
limit readers because no provider-owned source is implemented for those
providers.

## Guard

`provider-usage-limit-ownership.test.mjs` asserts that the old shared
`provider-usage-limit-readers.ts` file is absent and that each provider-owned
reader path exists for Claude, Codex, Kimi, and GLM Native.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run check:architecture`
- `npm run check:knip`
- `npm run build`
