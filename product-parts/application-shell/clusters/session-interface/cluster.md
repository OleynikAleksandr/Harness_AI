# Session Interface Cluster

## Boundary

Owns the reusable central chat surface, ordinary session shell, input controls,
telemetry and left sidebar. It consumes Core session role/tag, parent-child and
subagent timeline contracts for display.

## Owned Modules

- `session-window`
- `session-surface`
- `input-controls`
- `turn-timer`
- `session-telemetry`
- `session-sidebar`

## Facade Rule

Renderer features call Core Runtime through snapshot/action facades, not direct storage or provider internals.
