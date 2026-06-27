# Core Session Restore Verification - 2026-06-27

## Scope

- Persist Core workspace registry snapshot under `HARNESS_AI_HOME` or `~/.harness-ai/workspaces.json`.
- Persist Core session index under `<workspace>/.harness/sessions/index.json`.
- Persist Core session events as append-only JSONL under `<workspace>/.harness/sessions/events/<session>.jsonl`.
- Restore session list and event replay into Core before renderer session hydration.

## Checks

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run check:knip` - OK with existing configuration hints only
- `npm run typecheck` - OK
- `npm test` - OK, 6 tests
- Runtime smoke check - OK, new Core facades restored a persisted session and its events from a temporary workspace
- `npm run package:mac` - OK
- `npm run check:dup` - OK under configured thresholds
- `npm run check:security` - OK, 0 vulnerabilities
- `npm run check:links` - OK

## Artifact

- `release/mac-arm64/Harness AI.app` exists.
