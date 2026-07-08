# Codex App-Server Cache Anchor Package Evidence - 2026-07-08

## Scope

- Plan: `codex-uc-reasoning-effort-2026-07-07`
- Implementation commit:
  `13a38bb4 fix(codex): stabilize app-server cache anchor`
- Package task: `harness-ai.phase14.stream1.task1`
- Packaged app: `release/mac-arm64/Harness AI.app`

## Change Packaged

Codex app-server `thread/start` and `thread/resume` now send
`persistExtendedHistory: false`, matching the Native Request Capture path.

The diagnostic app-server probe before the implementation showed the reason for
the change:

- `persistExtendedHistory: false`: raw cache moved from `4992` on turn 1 to
  `14208` on turn 2 and stayed at `14208` on turn 3.
- `persistExtendedHistory: true`: raw cache was less stable under the same
  direct app-server protocol and can depend on extended-history bootstrap state.

This keeps the live Codex app-server path aligned with the captured native
envelope that CodexUC synthetic-native profiles use for parity testing.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs`
  - Result: completed successfully.
- `npm run plan:validate`
  - Result: `Plan validation: OK`
- `npm run plan:commit -- "fix(codex): stabilize app-server cache anchor"`
  - Result: commit `13a38bb4`
  - Hook result: `Tests: OK (81)`
- `npm run build`
  - Result: completed successfully.
- `npm run package:mac`
  - Result: completed successfully.
  - The package script stopped stale packaged app process `91548` before
    rebuilding.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
  - Timestamp/size: `Jul 8 09:47:23 2026`, `30470564` bytes.

## Retest Notes

Start the rebuilt packaged app and create fresh Codex app-server and CodexUC
sessions with the same simple three-turn cache probe. Expected result: both
providers should show the large static-prefix cache by the second visible turn,
instead of Codex app-server requiring a third turn before the full cache is
visible.
