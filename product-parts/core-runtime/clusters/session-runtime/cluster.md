# Session Runtime Cluster

## Boundary

Owns session metadata, parent-child subagent graph truth, next-session mode,
append-only JSONL history, provider session bindings, provider id promotion,
turn state, live assistant chunk/timeline read-models, and UI session snapshots.
Structural session kind remains primary/subagent; optional persisted purpose
metadata can identify a Profile Studio creator session and its bound profile
without changing tree semantics. The request-handler owns the dedicated
persistent Studio workspace route and ensures fixed Claude/Opus/high creator
turn options survive normal provider resume.

## Owned Modules

- `session-registry`
- `session-request-handler`
- `provider-session-binding`
- `session-event-stream`
- `session-snapshot-projector`
- `session-reasoning-display`
- `turn-timing`

`session-history-store` and `turn-lifecycle` were scaffolded as `module.md`-only
placeholders early in the project and never implemented; they were removed
from the product tree (2026-07-01) rather than kept as unimplemented debt.
Append-only JSONL history writing and running/idle/failure turn state
currently live inside `session-request-handler`. Re-add dedicated modules here
if that responsibility is split out again.

## Facade Rule

Application Shell consumes projected snapshots and sends actions; it does not mutate session files or call providers directly.
