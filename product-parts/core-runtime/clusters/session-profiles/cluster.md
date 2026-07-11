# Session Profiles Cluster

## Boundary

Owns runtime-selectable session profile truth: user-editable profile
documents on disk (provider-scoped profiles, optional provider namespaces such
as `Profiles/Codex/**`, plus read-only legacy
universal profile parsing), catalog/selection truth with the virtual Native
profile, provider-neutral session profile payload materialization, optional
native request sidecars (`input-prefix.json`, `request-template.json`,
`tools.json`, `custom-instructions.md`), and profile authoring (templates,
creation, validity status). Codex app-server provider-scoped profiles are
prompt-only profiles and do not own a `tooling.yaml` sidecar; app-server
process startup flags and its internal registry own that tool surface.

Contract source: `docs/architecture/SessionProfiles.md`.

## Owned Modules

- `profile-store`
- `profile-catalog`
- `profile-materializer`
- `profile-authoring`

## Facade Rule

Profile files under `~/.harness-ai/Profiles/**` are read and validated only
inside this cluster. Adapters never read profile files: they receive the
provider-neutral `SessionProfilePayload` from Core, including any frozen
native request sidecars, and translate it into their channel form in their own
profile application layers. Renderer/client code only displays Core-provided
catalog read models and submits the user's selection through existing
session-creation contracts.
