# Codex Panel Rollback Removal Package Evidence (2026-07-18)

Packaged application rebuild evidence for the Codex panel stream of the
`claude-status-panel-turns-2026-07-18` scope: the Codex session status panel no
longer shows the Rollback block and now matches the Claude/Kimi panels
(`Model / effort / Tokens / Cache / Turns`).

## Change

- User order 2026-07-18 (after accepting the Claude Turns stream): remove the
  Rollback block from the Codex panel; Grok keeps the full Rollback contract.
- One-module capability fix in
  `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts`:
  the single `ROLLBACK_PROVIDER_IDS = {"codex","grok"}` set was split into
  `ROLLBACK_ACTION_PROVIDER_IDS = {"grok"}` (who surfaces the Rollback action)
  and `CACHE_ANCHOR_PROVIDER_IDS = {"codex","grok"}` (the `Cache: 0` anchor and
  Cache/Turns chip visibility). Codex now publishes
  `rollbackPreserveFirstUserTurns: null`, so the capability-driven renderer
  button is not rendered.
- Preserved behavior: Codex keeps the `Cache: 0` anchor from session start and
  the Cache/Turns chips; Grok keeps Rollback with the two-turn anchor.
- Deliberately untouched: the Core rollback plumbing (`session-rollback.ts`
  still validates Codex, the codex `thread/rollback` adapter path, RPC/bridge)
  stays wired but unreachable from the Codex panel UI; renderer JSX, CSS and
  the localization key are shared with Grok and unchanged.

## Verification

- Commit gates on `3d84742e` (`feat: hide Rollback control from Codex session
  status panel`): architecture OK, Ultracite OK, Knip OK, typecheck OK, tests
  OK (129 groups) including the updated `usage-context-telemetry-facade`
  asserts (codex `rollbackPreserveFirstUserTurns === null`, `showCache`/
  `showTurns === true`, `cacheDisplay "0"` anchor kept; grok anchor pinned at
  `2`), docs-sync OK.
- Package: `npm run package:mac` (user-confirmed) rebuilt
  `release/mac-arm64/Harness AI.app` (unsigned, Electron 42.5.0, darwin arm64).
- Packaged `app.asar` SHA-256:
  `b54a638fe254fed3fbf7cdd0faebdb14c66467c93a59aa966d8c7182fc4408af`.
- Binary proof the new code is inside the package: the extracted compiled
  `dist/runtime/product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.js`
  shows `ROLLBACK_ACTION_PROVIDER_IDS = new Set(["grok"])` and
  `CACHE_ANCHOR_PROVIDER_IDS = new Set(["codex", "grok"])`.

## Retest Checklist

- Open a Codex session in the packaged app: the lower status panel shows
  `Model / effort / Tokens / Cache / Turns` and no Rollback block.
- `Cache: 0` is visible from session start; Tokens/Cache advance live during
  the turn as before.
- Open a Grok session: its panel still shows the Rollback control.
- Open Claude and Kimi sessions: panels unchanged (Turns present, no
  Rollback).
