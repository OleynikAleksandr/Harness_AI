# Provider Usage Limits Verification - 2026-06-27

## Scope

- Added Core-owned provider usage-limit refresh dispatch after provider binding and after completed turns.
- Added provider-owned usage-limit readers for current Harness providers with real limit sources:
  - Claude: OAuth probe against Anthropic Messages API rate-limit headers.
  - Codex: `account/rateLimits/read` through Codex app-server.
  - Kimi: `https://api.kimi.com/coding/v1/usages` using `~/.kimi-code/config.toml`.
  - GLM Native: Z.AI monitor endpoint derived from configured GLM base URL.
- OpenCode, OpenRouter, and Local Models remain honest unavailable for account 5h/weekly windows in the current Harness code because no provider-owned account limit source exists there.

## Checks

- `npm run check:architecture`
- `npm run lint`
- `npm run check:knip`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run package:mac`
- `npm run check:security`
- `npm run check:links`
- `npm run check:dup`
- `test -d "release/mac-arm64/Harness AI.app"`
- `app.asar` contains:
  - `dist/runtime/.../session-history-store.js`
  - historical cleanup note: the old shared
    `provider-usage-limit-readers.js` bundle path was later removed because
    provider-specific readers now live in their provider modules.

## Notes

- UI still only renders `session:telemetry`.
- Core owns the refresh trigger and applies provider events into telemetry.
- Provider adapters own account-limit reads.
- No UI-side limit calculation was added.
