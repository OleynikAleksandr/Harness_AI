# Session Snapshot Projector Module

## Responsibility

Build the read model consumed by the Electron session UI.

## Public Facade

`SessionSnapshotProjectorFacade`

## Inputs

- Session metadata.
- JSONL history events.
- Turn and provider telemetry state.
- Session message translation patch events.

## Outputs

- Renderer-safe session snapshot. `workspace` is the active project
  (`HarnessWorkspace`) or `null` when no project is active; without a
  project the session list is empty. There is no stand-in workspace.
- Incremental snapshot updates.
- Session messages with translated `localizedContent` applied without changing
  source `text`; a patch without `localizedContent` (failed translation) only
  clears the pending state, so the source text shows.

## Tests

- `src/session-snapshot-projector-facade.test.mjs` — `workspace` is `null`
  with no sessions without an active project, the registered project once
  one is active, and `null` again after the last project is removed.

## Owned Paths

- `module.md`
- `src/**`
