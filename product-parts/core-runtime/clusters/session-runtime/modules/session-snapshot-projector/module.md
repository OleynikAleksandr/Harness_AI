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

- Renderer-safe session snapshot. Without an active project its `workspace`
  is the empty value `{id: "", name: "", path: ""}` (not a project) and its
  session list is empty.
- Incremental snapshot updates.
- Session messages with translated `localizedContent` applied without changing
  source `text`; a patch without `localizedContent` (failed translation) only
  clears the pending state, so the source text shows.

## Owned Paths

- `module.md`
- `src/**`
