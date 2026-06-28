# Session Runtime Cluster

## Boundary

Owns session metadata, next-session mode truth, append-only JSONL history, provider session bindings, provider id promotion, turn state, live assistant chunk read-models, and UI session snapshots.

## Owned Modules

- `session-registry`
- `session-request-handler`
- `provider-session-binding`
- `session-event-stream`
- `session-history-store`
- `turn-lifecycle`
- `session-snapshot-projector`
- `session-reasoning-display`

## Facade Rule

Application Shell consumes projected snapshots and sends actions; it does not mutate session files or call providers directly.
