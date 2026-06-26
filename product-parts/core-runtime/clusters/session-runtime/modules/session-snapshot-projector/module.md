# Session Snapshot Projector Module

## Responsibility

Build the read model consumed by the Electron session UI.

## Public Facade

`SessionSnapshotProjectorFacade`

## Inputs

- Session metadata.
- JSONL history events.
- Turn and provider telemetry state.

## Outputs

- Renderer-safe session snapshot.
- Incremental snapshot updates.

## Owned Paths

- `module.md`
- `src/**`
