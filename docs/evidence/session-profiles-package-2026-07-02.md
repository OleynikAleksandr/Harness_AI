# Session Profiles Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for user acceptance of the session profiles
scope (`.harness/plans/todo-plan.md`, plan
`session-profiles-plan-document-2026-07-02`, Phase 10). The build carries the
full implementation: the `session-profiles` Core cluster (store, catalog,
materializer, authoring), snapshot-first session wiring, the four adapter
application layers (Kimi deferred to native-only), the session profile RPC
surface, the new-session profile step, the applied-profile chip, and the
Settings `Profile Creator` tab (skeleton, New Profile flow, profiles list,
source dictionary copy).

## Build

- User confirmed the package build in chat (2026-07-02) after Phase 9
  completion.
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-02 12:35` (30410789 bytes).

## Verification State

- All Phase 2-9 commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 65
  static tests including the session-profiles module suites).
- User acceptance in the packaged app is the next plan task
  (`harness-ai.phase10.stream1.task2`), including the dedicated
  breaking-change gate: profile step with Native first and remembered last
  choice, Native default behavior, `codeai-workflow-*` migration profiles,
  universal seeds across providers, snapshot-frozen resume, Profile Creator
  create/edit/validity, the applied-profile chip, and the seeded draft
  prompt text review.
