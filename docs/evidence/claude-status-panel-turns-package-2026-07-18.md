# Claude Status Panel Turns Package Evidence (2026-07-18)

Packaged application rebuild evidence for the `claude-status-panel-turns-2026-07-18`
scope: the Claude session status panel gains the Turns chip, reaching info-block
parity with the Kimi panel (`Model / effort / Tokens / Cache / Turns`; Rollback
stays Codex/Grok-only).

## Change

- One-line capability fix in
  `product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.ts`:
  `providerStatusPanelCapabilities("claude").showTurns` flips to `true`
  (`supportsRollback || providerId === "claude" || providerId === "kimi-client"`).
- No data-pipeline work was needed: the Claude adapter already emits a
  structured `turn_completed` event per finished user request → agent answer
  cycle (`claude-message-finish-handler.ts`), Core already accumulates
  `telemetry.turnCount` through `resolveProviderTurnCount`, persists and
  restores it, and the renderer chip plus the `session.status.turns`
  localization key are provider-generic. The chip was hidden only by the
  capability flag.
- Rollback is untouched: `rollbackPreserveFirstUserTurns` stays `null` for
  Claude, so no Rollback control appears.

## Verification

- Commit gates on `780b7d54` (`feat: show Turns chip in Claude session status
  panel`): architecture OK (3 product parts, 16 clusters, 56 modules),
  Ultracite OK, Knip OK, typecheck OK, tests OK (128 groups) including the
  extended `usage-context-telemetry-facade` asserts (`showTurns === true` and
  `turnCount` increment on `turn_completed` for Claude), docs-sync OK.
- Package: `npm run package:mac` (user-confirmed) rebuilt
  `release/mac-arm64/Harness AI.app` (unsigned, Electron 42.5.0, darwin arm64).
- Packaged `app.asar` SHA-256:
  `bdc6cdd33cd871a74c9b7dc47ec56f03ba7d9444609faa87a07f99daddb22471`.
- Binary proof the new code is inside the package: `showTurns` occurs 3 times
  in `app.asar`; the extracted compiled
  `dist/runtime/product-parts/provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-status-panel.js`
  shows `showTurns: supportsRollback || providerId === "claude" ||
  providerId === "kimi-client"`.

## Retest Checklist

- Open a Claude session in the packaged app: the lower status panel shows
  `Turns: 0` beside `Cache` from session start.
- Send a message and let the agent finish: the chip advances to `Turns: 1`;
  each further user request → final agent answer cycle adds one.
- Restart the app and reopen the session: the Turns value is restored.
