# Input Wait Copy Evidence - 2026-06-27

## Scope

- While the active session is waiting for an agent response, the user input shows `Agent is working… Please wait.`
- The wait copy uses the same hidden-placeholder plus pulsing overlay pattern as the reference project.
- Normal drag-and-drop overlay still takes precedence while dragging files with Shift held.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm run check:architecture`
- `npm run build`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`

## Result

- Checks pass.
- Packaged macOS app exists at `release/mac-arm64/Harness AI.app`.
