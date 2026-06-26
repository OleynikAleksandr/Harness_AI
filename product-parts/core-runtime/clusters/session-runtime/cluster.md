# Session Runtime Cluster

## Boundary

Owns session metadata, append-only JSONL history, turn state, and UI session snapshots.

## Owned Modules

- `session-registry`
- `session-history-store`
- `turn-lifecycle`
- `session-snapshot-projector`

## Facade Rule

Application Shell consumes projected snapshots and sends actions; it does not mutate session files directly.
