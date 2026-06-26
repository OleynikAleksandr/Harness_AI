# Project Manager Settings Surface Verification

Date: 2026-06-26

## Scope

Verified the Project Manager-style Settings surface for Harness AI:

- Core settings snapshot and persistence.
- Full settings IPC through Electron preload.
- Provider tabs and General settings UI.
- Session-window integration through the Settings sidebar entry.
- Unsigned macOS app packaging.

## Commands

- `npm run check:architecture`
  - Result: OK, 3 product parts, 12 clusters, 49 modules.
- `npm run lint`
  - Result: OK.
- `npm run typecheck`
  - Result: OK.
- `npm run test`
  - Result: OK, 1 test.
- `npm run package:mac`
  - Result: OK.
  - App output: `release/mac-arm64/Harness AI.app`.
- Runtime settings persistence smoke with temporary `HARNESS_AI_HOME`.
  - Result: OK.

## Notes

- The old GLM-only settings panel was removed from `session-window`.
- The renderer no longer imports the Core settings store runtime implementation directly.
- Provider session creation now reads the displayed model from the IPC-loaded settings snapshot.
- General excludes voice/text-to-speech, Response Mode, and Provider Native Request Capture.
