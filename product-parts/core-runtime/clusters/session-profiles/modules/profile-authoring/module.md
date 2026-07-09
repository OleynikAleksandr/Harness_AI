# Profile Authoring Module

## Responsibility

Own session profile creation and editing truth: the templates of the three
profile documents (passport, prompt skeleton with action-category guidance,
tooling with every category on), the create-profile operation (trimmed name
-> unicode-aware kebab-case directory id + required provider-scoped
`provider`; duplicate ids, missing providers and underivable names are
structured errors; template output is valid by construction), and document path
resolution for the external-editor ("edit in VS Code") action. Validity
after external editing is deliberately NOT owned here: it is the
scan-time status produced by `profile-store` and surfaced through
`profile-catalog` read models on every listing.

## Public Facade

`ProfileAuthoringFacade`

## Inputs

- `ProfileStoreFacade` (constructor injection) for the storage layout and
  the existence check.
- Create requests: profile display name and required provider id.
- Profile ids for editor path resolution.

## Outputs

- `createProfile(request)` — `{ ok: true, id, documents }` with the created
  document paths, or `{ ok: false, error }` (empty name, underivable id,
  missing provider, already existing id).
- `resolveDocumentPaths(profileId)` — the store's document layout for
  opening files in the external editor.
- `deriveProfileId(name)` — unicode-aware kebab-case id derivation shared
  with tests and future UI validation.

## Owned Paths

- `module.md`
- `src/**`
