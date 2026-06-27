# Teal Studio Design Unification - 2026-06-27

## Scope

- Unified the whole interface onto the Teal Studio design language (variant A).
- Settings surface: replaced the VS Code blue accent and backgrounds with the shared `--pm-*` teal tokens, restyled the reasoning R2 trigger (`#0e1521`) and menu (shared popup `#161b21`), moved radio/tab/checkbox selection to teal, unified radii, and set font weights by role. Kept success (latency) and warning (version) status colors.
- Session window: removed the blue reference layer, collapsing shell/panel/message/status colors onto the teal tokens; replaced the monospace input with the UI font plus teal focus while keeping monospace only for the thinking block and the token total; unified radii to 8px; bumped titles to weight 400.
- Send button: restyled after the CodeAI Hub reference as an outlined play action button outside the input field, with the smaller stop square (14px, radius 3px) as a design-only state. The existing submit handler and disabled logic are unchanged; no stop function was added.

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

- Bundled renderer CSS contains the teal accent `#42c9a2` (37 occurrences).
- Bundled renderer CSS no longer contains the VS Code blue `#0e639c` or the reference blue `#2c405b` (0 occurrences each).
- Bundled renderer CSS contains the new `session-input__action-button` send-button class.
