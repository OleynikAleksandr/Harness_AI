# Session Event Stream Module

## Responsibility

Expose provider-neutral Core session events to Application Shell projections. Provider-native events are normalized before they enter this stream.

Live provider interactions and their resolution events use the same Core event
channel but are excluded from transcript JSONL. A restored provider session
must reissue a still-valid blocking gate, preventing stale permissions from
appearing after Core restart.

## Public Facade

`SessionEventStreamFacade`

## Inputs

- Core session lifecycle events.
- Normalized provider events.
- Persistence and translation overlay updates.

## Outputs

- Renderer-safe session event payloads.
- Core read-model messages with provider `tag` markers preserved.
- `session:messages-replaced` events that replace the renderer transcript for a
  Core-owned rollback/prune operation while preserving the append-only event log
  as audit history.
- Core message translation metadata: `translationState`, `localizedContent`,
  and `session:message_translation` patch events.
- Consecutive assistant messages tagged `live` coalesced for session replay/readback.
- Exact `session:message` replays (same session + stable id + role + tag +
  source text) are rejected before the in-memory stream, listener fan-out and
  JSONL append. Fingerprints are rebuilt while loading history, so provider
  replay stays idempotent across Core restarts; changed source content under
  the same provider id remains a normal history-recovery update.
- Persisted `session:subagent-call` timeline items with stable creation
  position, child Core session ids, delegated task, model/reasoning and live
  status. Repeated snapshots for the same call coalesce at the original
  timeline position during hydration.
- `session:updated` invalidation events tell clients to re-read the Core
  session snapshot instead of deriving metadata changes locally.
- Snapshot invalidation signals.
- Per-session teardown via `deleteSessionEvents(sessionId)`: idempotently unlinks the
  session event log, forgets the session, and drops its in-memory events so a later
  append cannot recreate the file.

## Owned Paths

- `module.md`
- `src/**`
