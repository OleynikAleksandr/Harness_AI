# Reasoning Effort Dropdown Overlay And Per-Model Levels - 2026-06-28

## Scope

- Fixed the reasoning-effort dropdown so its open menu overlays the whole settings dialog for both Claude and Codex (one shared `ReasoningEffortSelect`). The menu now renders through a React portal on `document.body`, positioned from the trigger's bounding box (`position: fixed`, `z-index: 50`), escaping the `overflow: hidden` dialog ancestors and the 170px model-row grid cell. Outside-click checks both the trigger and the portalled menu; the menu also closes on Escape, scroll, and resize.
- Added the `ultracode` reasoning effort to the Core `ReasoningEffort` contract and the Claude validation whitelist. Verified facts (Claude CLI v2.1.195 + official docs): Opus = low/medium/high/xhigh/max; Sonnet = low/medium/high/max (no xhigh); Haiku = no effort selection. "Ultracode" is a session orchestration mode (xhigh + dynamic workflows), surfaced in the /effort menu only for xhigh-capable models.
- Added the `CLAUDE_REASONING_EFFORTS_BY_MODEL` capability map so the Claude card filters levels per model: Opus gets the full set plus `ultracode`, Sonnet drops `xhigh`, Haiku shows "Not adjustable" instead of a selector. Codex keeps its default set, so it never shows `ultracode`.
- Kept the capability map in `settings-normalization` (not the `node:fs`-backed `settings-store-facade`) so the renderer no longer bundles Core persistence.

## Verification

- `npm run check:architecture` - OK (3 product parts, 12 clusters, 49 modules).
- `npm run lint` - OK (93 files, no fixes applied).
- `npm run check:knip` - OK.
- `npm run typecheck` - OK.
- `npm test` - OK (11).
- `npm run check:dup` - OK (0.51% / 0.57% duplicated lines, under threshold).
- `npm run check:security` - OK (0 vulnerabilities).
- `npm run check:links` - OK.
- `npm run build` - OK.
- `npm run package:mac` - OK.
- Verified `release/mac-arm64/Harness AI.app` exists; `app.asar` repacked 2026-06-28 09:54.

## Build Evidence

- Moving the capability map off the persistence facade removed Core persistence from the renderer bundle: renderer modules dropped 62 -> 59 and the JS bundle shrank 263.57 kB -> 254.44 kB. The prior vite warning "Module node:fs/os/path has been externalized ... imported by settings-store-facade.ts / provider-auth-store-facade.ts" is gone.
- `.settings-reasoning-menu` is rendered via `createPortal(..., document.body)` with `position: fixed`, so it is no longer clipped by `.settings-body` / `.settings-dialog` `overflow: hidden`.
