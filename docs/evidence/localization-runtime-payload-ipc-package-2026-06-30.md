# Localization Runtime Payload IPC Package Evidence - 2026-06-30

## User Report

After selecting Russian for every localization category except UI Labels,
Settings showed the blocking localization card and spinner, but the visible
interface stayed in English after Save and after Restart App.

## Runtime Evidence

- `~/.harness-ai/settings/settings.json` persisted the compatibility category
  targets used by the General Settings UI:
  - `userGuidance: "ru"` for UI helper text.
  - `systemFeedback: "ru"` for user-facing messages.
  - `artifactsForTheUser: "ru"`.
  - `reasoning: "ru"`.
  - `uiInterface: "en"` / `uiLabels: "en"` as requested.
- `~/.harness-ai/logs/core/settings-store.jsonl` recorded the Save request and
  completion at `2026-06-30T19:15:01Z` with the same category snapshot.
- `~/.harness-ai/Localization/cache/browser-runtime-bootstrap.json` contained a
  Core materialized browser payload with:
  - `ui_helper_text` language `ru`, source `materialized`, 33 entries.
  - `messages_for_the_user` language `ru`, source `materialized`, 15 entries.
  - `ui_labels` language `en`, source `source_fallback`, matching the user's
    "everything except UI Labels" selection.

## Root Cause

The renderer preload exposed:

`window.harnessCore.getLocalizationRuntimePayload()` →
`harness-ai:core:get-localization-runtime-payload`

Core Runtime also implemented the matching RPC method:

`get-localization-runtime-payload`

But the Electron main Core process bridge did not register the IPC channel in
its `IPC_TO_RPC` map. As a result, renderer calls to refresh the browser
localization payload could not reach Core, so `BrowserLocalizationProvider`
kept a `null` payload and every `t(...)` lookup returned its English fallback.

## Change

- Registered `harness-ai:core:get-localization-runtime-payload` in the Electron
  Core process bridge IPC-to-RPC map.
- Added a bridge test assertion so this renderer localization channel cannot
  silently disappear again.
- Updated the `core-process-bridge` module documentation to include the
  localization runtime payload forwarding contract.

## Verification

- `npm run plan:validate` passed.
- `npm test` passed.
- `npm run package:mac` passed.
  - The package script stopped stale packaged process `36780`.
  - `npm run build` ran as part of packaging.
  - `release/mac-arm64/Harness AI.app` was rebuilt.

## Expected User-Visible Result

After launching the rebuilt packaged app, the renderer can fetch the existing
Core materialized localization payload. With the current saved settings,
UI helper copy and user messages should display in Russian while UI labels
remain English.
