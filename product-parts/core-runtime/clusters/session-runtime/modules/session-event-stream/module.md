# Session Event Stream Module

## Responsibility

Expose provider-neutral Core session events to Application Shell projections. Provider-native events are normalized before they enter this stream.

## Public Facade

`SessionEventStreamFacade`

## Inputs

- Core session lifecycle events.
- Normalized provider events.
- Persistence and translation overlay updates.

## Outputs

- Renderer-safe session event payloads.
- Snapshot invalidation signals.

## Owned Paths

- `module.md`
- `src/**`
