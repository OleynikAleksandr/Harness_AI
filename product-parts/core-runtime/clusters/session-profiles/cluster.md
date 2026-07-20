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

The storage boundary additionally reads Studio v2 exact provider/model
passports and their separate Native-foundation/custom-instructions prompt
parts. Draft source parts may be incomplete; a stored `valid` passport must
have both. Existing v1 parsing and runtime selection remain unchanged.
The authoring boundary can now create and atomically replace Studio Draft
directories from complete agent-produced snapshots; this route never opens an
external editor and never assigns `Valid`.
The catalog exposes a separate exact provider/model Studio list with no Native
or legacy rows, while the ordinary provider picker preserves v1 behavior and
admits only exact-model Studio `Valid` profiles. The runtime picker RPC and
session resolver both carry that same model id, so a stale client selection
cannot bypass the target check.
Studio v2 materialization compiles only its two stored prompt parts, forwards
the effective structured tools and hashes target/donor provenance; it never
adds workspace `AGENTS.md`, Skills, date/language context or a generic wrapper.

Contract sources: `docs/architecture/SessionProfiles.md` and the accepted
Studio extension in `docs/architecture/ProfileStudio.md`.

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
