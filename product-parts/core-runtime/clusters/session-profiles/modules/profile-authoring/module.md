# Profile Authoring Module

## Responsibility

Own session profile creation and editing truth. The legacy Settings route keeps
the templates of the three
profile documents (passport, prompt skeleton with action-category guidance,
tooling with every category on), the create-profile operation (trimmed name
-> unicode-aware kebab-case directory id + required provider-scoped
`provider`; duplicate ids, missing providers and underivable names are
structured errors; template output is valid by construction), and document path
resolution for the external-editor ("edit in VS Code") action. Validity
after external editing is deliberately NOT owned here: it is the
scan-time status produced by `profile-store` and surfaced through
`profile-catalog` read models on every listing.

The Studio route is agent-owned and has no external-editor action. It creates
an immutable caller-supplied safe Draft id under the current provider
namespace (`Claude`, `Codex`, or `Kimi`), writes a Studio v2 passport with exact
provider/model, creator-session binding and purpose, and initializes the two
prompt source files. `updateStudioDraft()` accepts only a complete validated
snapshot and replaces the profile directory through a sibling staging
directory and rename/rollback sequence. The snapshot owns
`system-prompt.md`, `custom-instructions.md` and optional `tools.json`; an
agent cannot write `status: valid`, change target identity or gain arbitrary
filesystem access through this facade.

## Public Facade

`ProfileAuthoringFacade`

## Inputs

- `ProfileStoreFacade` (constructor injection) for the storage layout and
  the existence check.
- Create requests: profile display name and required provider id.
- Profile ids for editor path resolution.
- Studio create requests: safe immutable id, exact supported provider/model,
  creator session id and optional initial display metadata.
- Studio update requests: complete name/description/purpose/prompt/custom/tool
  snapshot and validated donor provenance.

## Outputs

- `createProfile(request)` — `{ ok: true, id, documents }` with the created
  document paths, or `{ ok: false, error }` (empty name, underivable id,
  missing provider, already existing id).
- `resolveDocumentPaths(profileId)` — the store's document layout for
  opening files in the external editor.
- `deriveProfileId(name)` — unicode-aware kebab-case id derivation shared
  with tests and future UI validation.
- `createStudioDraft(request)` — atomically creates an empty Studio v2 Draft
  without launching an editor.
- `updateStudioDraft(request)` — validates and atomically replaces all managed
  Studio documents; every accepted agent edit remains `draft`.

## Owned Paths

- `module.md`
- `src/**`
