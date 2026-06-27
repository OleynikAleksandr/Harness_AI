# Detached Session Sizing Evidence - 2026-06-27

## Scope

- Detached session window rendered the session interface in the left grid column and left a large empty field on the right.
- The reference session surface must fill the detached window and start at the same width as the main app session workspace pane.

## Fix

- Detached session window defaults changed to `960x820`, matching the main app right session pane width (`1280 - 320` sidebar).
- Late reference CSS now preserves `.harness-app-shell--detached { grid-template-columns: minmax(0, 1fr); }`, so the no-sidebar detached renderer does not keep the main two-column layout.

## Verification

- `npm run plan:validate`
- `npm run typecheck`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`
- Production CSS bundle contains `.harness-app-shell--detached{grid-template-columns:minmax(0,1fr)}`.
- Packaged `app.asar` contains `product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/app-bootstrap-facade.mjs`.

Visual retest should open the detached session window from the rebuilt app at `release/mac-arm64/Harness AI.app`.
