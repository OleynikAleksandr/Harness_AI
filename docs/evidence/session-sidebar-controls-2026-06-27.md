# Session Sidebar Controls Evidence - 2026-06-27

## Scope

- Remove the selected workspace path from the left sidebar workspace button.
- Move `Start New Session` into the old `Sessions` header position.
- Keep detach inside the session row instead of reserving a separate sidebar column.
- Add right-click session context menu with `Delete`.

## Fix

- Sidebar width reduced from `320px` to `280px`.
- Session rows now render one row container with title selection and an inline detach icon.
- Context menu is shown from right-click on the session title and currently contains only `Delete`.
- Delete is Core-owned: renderer calls IPC, Core closes the provider binding, removes session memory, and rewrites the workspace session index.
- Detached session default width updated to `1000px` to match the main session pane after the narrower sidebar.

## Verification

- `npm run typecheck`
- `npm run check:architecture`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`
- Production renderer bundle contains `session-context-menu` and `grid-template-columns:minmax(240px,280px)`.
- Electron bridge contains `harness-ai:core:delete-session`.

Packaged app was rebuilt at `release/mac-arm64/Harness AI.app`.
