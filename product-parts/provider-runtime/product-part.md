# Provider Runtime

## Purpose

Independent provider adapters, provider homes/auth, usage telemetry, and
provider-backed translation engines composed by Core Runtime only.

## Owned Clusters

- `provider-registry`
- `provider-readiness`
- `provider-adapters`
- `provider-home-and-auth`
- `provider-events-and-translation`

## Responsibilities

- Own provider catalog, descriptors, invocation profile metadata, readiness, and adapters.
- Keep provider homes, caches, auth references, and runtime files isolated.
- Own provider-specific runtime prompts or native project-instruction startup before requests reach external SDKs or CLIs.
- Normalize provider events for Core Runtime, including structured native
  collaboration/subagent lifecycle events when a provider exposes them.

## Out Of Scope

- Session UI state.
- Application Shell backend composition.
- Core workflow/session truth.
- Product tree ownership.
- Plan lifecycle policy.
