# Session Interface Cluster

## Boundary

Owns the classic chat session renderer, input controls, telemetry surface, and left sidebar.

## Owned Modules

- `session-window`
- `input-controls`
- `session-telemetry`
- `session-sidebar`

## Facade Rule

Renderer features call Core Runtime through snapshot/action facades, not direct storage or provider internals.
