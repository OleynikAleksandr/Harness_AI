# Provider Events And Translation Cluster

## Boundary

Owns provider stream/event normalization, usage/context telemetry, and provider-backed translation engines.

## Owned Modules

- `provider-event-normalizer`
- `usage-context-telemetry`
- `provider-translation-engines`

## Facade Rule

Core receives normalized events and telemetry signals instead of provider-native stream payloads.
