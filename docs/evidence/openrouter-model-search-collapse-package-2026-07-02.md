# OpenRouter Model Search Collapse Package Evidence - 2026-07-02

## Scope

Packaged application rebuild for user acceptance of the collapsed OpenRouter
model search (`.harness/plans/todo-plan.md`, plan
`session-id-bar-compact-2026-07-02`, Phase 4). The build carries commits
`feat(localization-runtime): add openrouter search refresh label to approved
dictionaries` (`621286ea`) and `feat(provider-settings-ui): collapse
openrouter model matches after selection with search refresh` (`7f539ec1`):
once a model is picked in a `Model slug search` block (or the picker opens
with a stored model), only the selected match card stays visible; typing a
new query expands the list again, and a refresh icon button inside the right
edge of the search field re-runs the search and reopens the full match list.
The behavior covers all three blocks sharing `OpenRouterModelEndpointPicker`
(provider default model, UI Translation Model, Reasoning Translation Model).

## Build

- Verification build requested by the user's OpenRouter settings task
  (2026-07-02); the active plan Phase 4 asks for this package rebuild.
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-02 18:02` (30417552 bytes).

## Verification State

- The Phase 3 commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 67
  static tests including the new `openrouter-settings-card.test.mjs`).
- User acceptance in the packaged app is the next plan task
  (`harness-ai.phase4.stream1.task2`): in Settings → OpenRouter, all three
  model blocks show only the selected card after a pick, typing expands the
  match list again, and the in-field refresh control re-runs the search.
