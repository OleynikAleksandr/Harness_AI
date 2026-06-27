# Sidebar Session Surface Verification - 2026-06-27

Scope:
- Verify the left sidebar remains visible.
- Verify `Start New Session` is the new-session entry point.
- Verify reference session panels render in the right workspace only after a session exists.

Commands run:
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`
- `rg -n "Start New Session|session-empty-workspace|session-reference-shell|session-sidebar|settings-entry|session-status" dist/renderer/assets`

Results:
- `npm run package:mac` completed successfully.
- `release/mac-arm64/Harness AI.app` exists.
- Production renderer assets contain the sidebar, Settings entry, `Start New Session`, empty right workspace, and reference session panel classes.
