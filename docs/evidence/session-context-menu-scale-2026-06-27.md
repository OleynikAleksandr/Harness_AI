# Session Context Menu Scale Fix - 2026-06-27

## Scope

- The session right-click context menu used oversized fonts and buttons that did not match the app scale, in both states (the standalone Delete item and the Delete confirmation with Cancel/Delete).
- Rescaled the menu to the app popover scale used by the settings reasoning menu:
  - Title `Delete session?`: 12px, centered (was 13px, left-aligned).
  - Buttons (Delete item, Cancel, Delete): 12px font, 28px min-height, 0 10px padding (were 13px, 32px, 0 12px).
  - Actions gap 6px; title bottom padding tightened.
- Colors and danger styling from the previous pass are unchanged; this is sizing and centering only.

## Verification

- `npm run check:architecture` - OK (3 product parts, 12 clusters, 49 modules).
- `npm run lint` - OK (90 files, no fixes applied).
- `npm run check:knip` - OK.
- `npm run typecheck` - OK.
- `npm test` - OK (9).
- `npm run build` - OK.
- `npm run package:mac` - OK.
- Verified `release/mac-arm64/Harness AI.app` exists.

## Build Evidence

- Context menu title and buttons now render at 12px with 28px control height, centered, matching the settings reasoning popover scale.
