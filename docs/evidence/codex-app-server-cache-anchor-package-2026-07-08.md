# Codex App-Server Cache Anchor Package Evidence - 2026-07-08

## Scope

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
envelope used for cache testing.

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

Start the rebuilt packaged app and create a fresh Codex app-server session with
the same simple three-turn cache probe. Expected result: the large static-prefix
cache is visible by the second turn.

## User Acceptance

Accepted by packaged-app retest on 2026-07-08. The user verified the rebuilt
application and confirmed that the Codex app-server cache behavior now works as
expected.

Finding to preserve for future work: the cache timing problem was not a
time-based prompt-cache warmup issue. It was caused by the live app-server
history mode differing from Native Request Capture. Keep live Codex app-server
on `persistExtendedHistory: false` unless a future direct app-server probe
proves that `true` preserves the same second-visible-turn cache-anchor timing.
