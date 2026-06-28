# Runtime Process Cluster

## Boundary

Owns the out-of-process Core Runtime server lifecycle and process contracts.

## Owned Modules

- `core-runtime-process`

## Facade Rule

Application Shell talks to Core through process contracts exposed by this
cluster. It must not import Core implementation modules directly.
