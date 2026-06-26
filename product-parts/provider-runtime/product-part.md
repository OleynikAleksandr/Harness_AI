# Provider Runtime

## Purpose

Provider adapters, provider homes/auth, usage telemetry, and provider-backed translation engines.

## Owned Clusters

- `provider-registry`
- `provider-adapters`
- `provider-home-and-auth`
- `provider-events-and-translation`

## Responsibilities

- Own provider catalog, descriptors, health, and adapters.
- Keep provider homes, caches, auth references, and runtime files isolated.
- Normalize provider events for Core Runtime.

## Out Of Scope

- Session UI state.
- Product tree ownership.
- Plan lifecycle policy.
