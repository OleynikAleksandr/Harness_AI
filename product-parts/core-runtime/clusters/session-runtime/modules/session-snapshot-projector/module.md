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

- Renderer-safe session snapshot.
- Incremental snapshot updates.
- Session messages with translated `localizedContent` applied without changing
  source `text`.

## Owned Paths

- `module.md`
- `src/**`
