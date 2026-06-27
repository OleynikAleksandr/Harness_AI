# Reference Session Panels Verification - 2026-06-27

Scope:
- Verify the Harness AI session surface uses the reference-style session panels after `feat: port reference session panels`.
- Verify the packaged macOS app is rebuilt.

Commands run:
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`
- `rg -n "session-reference-shell|session-id-bar|session-dialog|session-input|session-status|Type your request or drag files with Shift held|Модель:|Токены:" dist/renderer/assets`

Results:
- `npm run package:mac` completed successfully.
- `release/mac-arm64/Harness AI.app` exists.
- Production renderer assets contain the reference session shell, session id bar, dialog panel, input panel, status panel, input placeholder, and bottom status labels.

Notes:
- The session panels are display/input surfaces only. They use Core session events, Core session identity, settings snapshot, and session telemetry as available inputs.
- Usage-limit percentages and exact token counters are not invented in the renderer. Those require Core-owned telemetry fields before the UI can display the same reset percentages and token totals as the reference project.
