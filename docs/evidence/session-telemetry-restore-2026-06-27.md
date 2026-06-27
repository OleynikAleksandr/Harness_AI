# Session Telemetry Restore Evidence - 2026-06-27

## Scope

- Restored Core live session telemetry from persisted `session:telemetry` JSONL events after kernel/app restart.
- Verified that provider resume happens after the persisted telemetry is loaded into `SessionRequestHandlerFacade`, so token usage is not reset by a fresh idle telemetry snapshot.

## Checks

- `node product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.test.mjs`
- `npm run build`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`

## Result

- Focused event-stream history test passes and confirms the latest saved telemetry for a session is selected.
- Runtime build and renderer build pass.
- Packaged macOS app exists at `release/mac-arm64/Harness AI.app`.
