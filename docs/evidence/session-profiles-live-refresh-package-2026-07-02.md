# Session Profiles Live Refresh Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for user acceptance of the live session profile
refresh (`.harness/plans/todo-plan.md`, plan
`session-profiles-live-refresh-2026-07-02`, Phase 3). The build carries
commits `feat(profile-store): watch session profile files for changes`
(`6bb03a5b`), `feat(core-runtime-process): publish session profiles updated
core events` (`c689cee5`) and `feat(application-shell): refresh session
profile lists on profile update events` (`8fc4b185`): a Core-owned recursive
watcher over the profiles root debounces file events and publishes
`{ type: "session-profiles:updated" }` through the existing SSE -> Electron
bridge -> renderer event channel, and both profile surfaces (Profile Creator
list, new-session profile step) re-run the catalog RPC when it arrives. The
profile step keeps the user's still-valid selection on reloads.

Investigation context recorded with the plan: Core never caches profiles —
every RPC and session create reads the profile files from disk, so new
sessions always get the fresh prompt already; open sessions keep their
immutable applied snapshot by contract. The stale UI came from the renderer
surfaces fetching the catalog only once on mount.

## Build

- Verification build requested by the user's live-refresh task (2026-07-02);
  the active plan Phase 3 asks for this package rebuild.
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-02 18:29` (30420058 bytes).

## Verification State

- The Phase 1-2 commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 69
  static tests including the new profile-store watcher test,
  `core-session-profile-events.test.mjs` and `profile-list.test.mjs`).
- User acceptance in the packaged app is the next plan task
  (`harness-ai.phase3.stream1.task2`): edit a profile's `profile.yaml` /
  `system-prompt.md` in VS Code, save, and confirm the Profile Creator list
  and the new-session profile step refresh without an app restart.
