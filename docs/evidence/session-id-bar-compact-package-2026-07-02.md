# Session Id Bar Compact Layout Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for user acceptance of the compact session id
bar (`.harness/plans/todo-plan.md`, plan `session-id-bar-compact-2026-07-02`,
Phase 2). The build carries commit
`fix(session-window): compact session id bar with stacked identity column`
(`6b8bf69c`): the session id and the applied profile chip are grouped into a
left identity column of two stacked rows (mirroring the two limit rows), the
usage limit rows return to the right grid column pinned to the right edge,
and the bar shrinks back to a single grid row.

## Build

- Verification build requested by the user's session-header task (2026-07-02);
  the active plan Phase 2 asks for this package rebuild.
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-02 17:42` (30416108 bytes).

## Verification State

- The Phase 1 commit passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 66
  static tests).
- User acceptance in the packaged app is the next plan task
  (`harness-ai.phase2.stream1.task2`): the session header shows the id above
  the profile chip on the left as two compact rows, the Session/Weekly limit
  rows sit on the right edge, and the overall header height is reduced.
