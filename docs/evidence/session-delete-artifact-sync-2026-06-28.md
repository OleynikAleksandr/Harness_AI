# Session Delete Artifact Sync And Core Restart Repair - 2026-06-28

## Scope

Two user-requested fixes plus a packaged build:

1. Deleting a session in the sidebar must also delete the on-disk artifacts that
   session created, per workspace.
2. The Settings "Restart Core" button must truly restart the core process, with
   correct label spacing and a spinner while busy.

## Result

### Session delete now cleans up owned artifacts

- `session-event-stream` gained `deleteSessionEvents(sessionId)`: idempotently
  unlinks `.harness/sessions/events/<id>.jsonl`, forgets the session, and drops
  its in-memory events so a later append cannot recreate the file.
- `CoreSession` now persists `providerSessionId` (set when the provider binding
  becomes ready), so a removed session can locate its provider rollout without
  parsing the event log, even after a core restart.
- The provider adapter contract gained an optional
  `deleteSessionArtifacts(providerSessionId, workspacePath)`. The Codex adapter
  implements it (via a pure `codex-rollout-cleanup` helper) to remove
  `home/sessions/**/rollout-*-<providerSessionId>.jsonl`. The shared provider
  home is left intact.
- `core-runtime-api` orchestrates all three on the `delete-session` RPC.

Root cause confirmed empirically: the core runtime holds session state in memory
and rewrites disk from it, so deleting files by hand is futile. The previous
`deleteSession` only emptied `index.json`, leaving the event log and rollout
orphaned.

### Restart Core truly restarts the process

- `core-process-supervisor.stop()` now captures the pid from the health payload,
  sends the HTTP shutdown best-effort, then force-terminates by pid (SIGTERM
  escalating to SIGKILL) when a hung core ignores it. `restart()` therefore
  always respawns a fresh process that re-reads disk state.
- The Core Controls row (`settings-core-row`) lays the button and status label
  out with a gap, and the button shows a spinner (`settings-spinner`) while the
  restart is in flight.

## Guards

- `session-event-stream-facade.test.mjs`: `deleteSessionEvents` removes the file,
  clears in-memory events, and is idempotent.
- `codex-rollout-cleanup.test.mjs`: removes the target rollout, keeps siblings,
  is idempotent, and tolerates a missing sessions dir.
- `core-process-bridge-facade.test.mjs`: asserts the supervisor force-terminates
  via `process.kill` / `SIGKILL`.

## Checks

- `npm run check:architecture` - OK (3 product parts, 13 clusters, 51 modules)
- `npm run lint` - OK
- `npm run check:knip` - OK (hints only)
- `npm run typecheck` - OK
- `npm test` - OK (34)
- `npm run check:dup` - OK (within threshold)
- `npm run check:security` - 0 vulnerabilities
- `npm run check:links` - OK
- `npm run build` - OK
- `npm run package:mac` - OK; `release/mac-arm64/Harness AI.app` rebuilt (unsigned)
