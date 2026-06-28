# Provider Registry Cluster

## Boundary

Owns provider catalog, model descriptors, invocation profile descriptors, availability, health, startup, and recovery reporting.

## Owned Modules

- `provider-registry`
- `provider-descriptor`
- `provider-health`

## Facade Rule

Core Runtime asks for provider availability and descriptors through registry facades.
