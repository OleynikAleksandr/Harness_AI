# Sidebar Menu Behavior Evidence - 2026-06-27

## Scope

- Session row context menu closes on outside click and Escape.
- Session delete requires an in-app confirmation.
- Left sidebar width follows content instead of a fixed wide column.
- Start New Session is a separated blue primary control above the session list.

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
