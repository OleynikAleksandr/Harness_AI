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
- Core read-model messages with provider `tag` markers preserved.
- Core message translation metadata: `translationState`, `localizedContent`,
  and `session:message_translation` patch events.
- Consecutive assistant messages tagged `live` coalesced for session replay/readback.
- Snapshot invalidation signals.
- Per-session teardown via `deleteSessionEvents(sessionId)`: idempotently unlinks the
  session event log, forgets the session, and drops its in-memory events so a later
  append cannot recreate the file.

## Owned Paths

- `module.md`
- `src/**`
