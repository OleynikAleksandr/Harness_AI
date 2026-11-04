# Session Runtime Cluster

## Boundary

Owns session metadata, parent-child subagent graph truth, next-session mode,
append-only JSONL history, provider session bindings, provider id promotion,
turn state, live assistant chunk/timeline read-models, and UI session snapshots.
Structural session kind remains primary/subagent; optional persisted purpose
metadata can identify a Profile Studio creator session and its bound profile
without changing tree semantics. The request-handler owns the dedicated
persistent Studio workspace route and ensures selected target provider/model
creator turn options survive normal provider resume. It also intercepts raw structured
results only for creator-purpose sessions and routes validated full snapshots
to Profile Studio authoring with a bounded automatic repair attempt. Ordinary
session creation resolves a managed Studio profile against the exact requested
model before freezing its applied profile snapshot. The request-handler
also runs the per-session workflow autopilot (on by default, stopped by the
Kit pause, with the derived `pauseState`). There is no bootstrap session:
the session registry lists none, and the UI snapshot has `workspace: null`
without an active project.

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
