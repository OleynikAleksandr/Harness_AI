# Session Context Menu Button States - 2026-06-27

## Scope

- Reduced the session context menu font size from 12px to 11px (title and buttons), keeping the centered layout.
- Reduced button min-height from 28px to 26px.
- Added the three interaction states to the menu buttons:
  - Resting: surface background, neutral outline.
  - Hover: teal-soft fill (`rgba(66, 201, 162, 0.12)`) with teal border.
  - Pressed (`:active`): neutral buttons deepen the teal fill (`rgba(66, 201, 162, 0.2)`, accent border); the danger Delete button becomes a solid red fill (`#dc3d3d`, white text).
- Danger Delete keeps its resting tint and stronger hover tint; only the pressed state turns solid red.

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

- Context menu buttons render at 11px with resting, hover, and pressed states; the danger Delete fills solid red `#dc3d3d` on press.
