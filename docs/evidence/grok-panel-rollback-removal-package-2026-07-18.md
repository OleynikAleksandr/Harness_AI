# Grok Panel Rollback Removal Package Evidence (2026-07-18)

Packaged application rebuild evidence for the Grok panel stream of the
`claude-status-panel-turns-2026-07-18` scope: the Grok session status panel no
longer shows the Rollback block, so **every** provider panel (Claude, Codex,
Grok, Kimi) now shows only `Model / effort / Tokens / Cache / Turns`.

## Change

- User order 2026-07-18 (right after accepting the Codex stream): hide the
  Rollback block from the Grok panel too.
- One-module capability fix in
  `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts`:
  `ROLLBACK_ACTION_PROVIDER_IDS` becomes an empty set (`new Set<string>([])`),
  so no provider publishes `rollbackPreserveFirstUserTurns` and the
  capability-driven renderer button is never rendered.
- Preserved behavior: Codex and Grok keep the `Cache: 0` anchor from session
  start and the Cache/Turns chips (`CACHE_ANCHOR_PROVIDER_IDS` unchanged).
- Deliberately untouched: all Core rollback plumbing (`session-rollback.ts`
  still validates Codex and Grok, the codex `thread/rollback` and grok rewind
  adapter paths, RPC/bridge) stays wired but unreachable from any panel UI;
  renderer JSX, CSS and the localization key are unchanged.

## Verification

- Commit gates on `41c64754` (`feat: hide Rollback control from Grok session
  status panel`): architecture OK, Ultracite OK, Knip OK, typecheck OK, tests
  OK (129 groups) including the updated `usage-context-telemetry-facade`
  asserts (grok `rollbackPreserveFirstUserTurns === null`, codex `null`,
  `Cache: 0` anchors and Cache/Turns visibility kept), docs-sync OK.
- Package: `npm run package:mac` (user-ordered in the same message) rebuilt
  `release/mac-arm64/Harness AI.app` (unsigned, Electron 42.5.0, darwin arm64).
- Packaged `app.asar` SHA-256:
  `e782402a7e5312973dbb7c84b6105c1645609868d9cfc0ef0a9fafcb10759414`.
- Binary proof the new code is inside the package: the extracted compiled
  `dist/runtime/product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.js`
  shows `ROLLBACK_ACTION_PROVIDER_IDS = new Set([])`.

## Retest Checklist

- Open a Grok session in the packaged app: the lower status panel shows
  `Model / effort / Tokens / Cache / Turns` and no Rollback block; `Cache: 0`
  is visible from session start.
- Open Codex, Claude and Kimi sessions: identical chip sets, no Rollback
  anywhere.
- Token/Cache figures advance live during turns as before on all providers.
