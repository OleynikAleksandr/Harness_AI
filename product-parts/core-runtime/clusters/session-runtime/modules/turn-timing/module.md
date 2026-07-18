# Turn Timing Module

## Responsibility

Derive per-turn timing truth from the persisted `session:turn-state` Core
event log. Closed `running` → `idle` pairs accumulate into `activeMs`;
consecutive `running` events continue the same turn from its first `running`;
a trailing unclosed `running` is reported as `runningSince` without counting
into `activeMs`. Whether an open turn is live or an orphan from a previous
app run is the caller's decision, not this module's.

## Public Facade

`deriveTurnTiming(events, sessionId)` — pure function returning `TurnTiming`
(`{ activeMs, runningSince }`).

## Inputs

- Chronological `SessionCoreEvent[]` from `session-event-stream` (live or
  rehydrated from the append-only JSONL history).
- Core session id.

## Outputs

- `activeMs`: summed duration of every completed turn, in milliseconds.
- `runningSince`: ISO timestamp of the first `running` of the currently open
  turn, or `null` when no turn is open.

## Owned Paths

- `module.md`
- `src/**`
