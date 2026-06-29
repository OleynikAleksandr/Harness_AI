# Provider Registry Cluster

## Boundary

Owns provider catalog, model descriptors, invocation profile descriptors, and
availability. Provider readiness, startup, and recovery state belong to the
`provider-readiness` cluster.

## Owned Modules

- `provider-registry`
- `provider-descriptor`

## Facade Rule

Core Runtime asks for static provider availability and descriptors through
registry facades.
