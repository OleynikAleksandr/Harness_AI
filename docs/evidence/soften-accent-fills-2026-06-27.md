# Soften Accent Fills And Selection Outlines - 2026-06-27

## Scope

- Muted the bright accent-filled buttons to the status-panel button style (the `gpt-5.3-codex-spark` chip look): dark teal fill `#263832`, teal border `#2d9a86`, light teal text `#b8d1c7`, with a slightly brighter hover (`#2d4a40` / `#38b89e`).
  - Session window: `.start-new-session-button`, `.start-session-button`, `.icon-button.primary` (and their hover states).
  - Settings: `.settings-button.primary`, `.settings-primary:not(:disabled)` (Save Changes).
- Replaced the double selection outline on settings selected rows (`.settings-model-row.active`, `.settings-option-row.active`) — which used a 1px border plus an inset 1px shadow (reading as 2px) — with a single 1px border, matching the model chip.

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

- Bundled renderer CSS contains the muted button fill `#263832` (6 occurrences across the muted buttons).
- The selected settings rows no longer carry the inset 1px accent shadow; the selection is a single 1px border.
