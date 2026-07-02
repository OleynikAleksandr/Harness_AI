# Session Profiles Cluster

## Boundary

Owns runtime-selectable session profile truth: user-editable profile
documents on disk (universal document set per profile plus individual
provider-scoped profiles), catalog/selection truth with the virtual Native
profile, provider-neutral session profile payload materialization, and
profile authoring (templates, creation, validity status).

Contract source: `docs/architecture/SessionProfiles.md`.

## Owned Modules

- `profile-store`
- `profile-catalog`
- `profile-materializer`

The cluster grows to `profile-authoring` as the active plan lands it; module
ownership is recorded here and in the product tree in the same commit that
creates each module.

## Facade Rule

Profile files under `~/.harness-ai/Profiles/**` are read and validated only
inside this cluster. Adapters never read profile files: they receive the
provider-neutral `SessionProfilePayload` from Core and translate it into
their channel form in their own profile application layers. Renderer/client
code only displays Core-provided catalog read models and submits the user's
selection through existing session-creation contracts.
