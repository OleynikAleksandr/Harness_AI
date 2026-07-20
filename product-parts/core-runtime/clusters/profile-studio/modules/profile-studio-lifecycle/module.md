# Profile Studio Lifecycle Module

## Responsibility

Own immutable Studio Draft identity and approval truth. `createDraft()` mints
`draft-<uuid>`, binds it to one exact provider/model and one creator session,
then delegates physical creation to `ProfileAuthoringFacade`.

`applyDraftSnapshot()` delegates a complete managed snapshot and always
returns the profile to Draft without changing target or creator-session
identity. `approveDraft()` reloads and materializes current content, requires
both prompt parts, compares the user's explicit content hash and only then
calls the narrow Core-only passport transition to `Valid`. A stale hash or
incomplete prompt changes nothing. In the first-stage no-manual-edit contract,
a Valid passport represents approval of the current deterministic content
hash; a subsequent controlled authoring write rewrites the passport as Draft.

The facade also resolves profile by creator session and derives created,
updated and approved timestamps from managed directory/passport filesystem
metadata. It does not create sessions, parse Claude output or decide provider
capability readiness.

## Public Facade

`ProfileStudioLifecycleFacade`

## Inputs

- Public `ProfileStoreFacade`, `ProfileAuthoringFacade` and
  `ProfileMaterializerFacade` boundaries.
- Exact provider/model and creator-session id for creation.
- Complete `StudioProfileDraftSnapshot` for edits.
- Direct approval command `{ profileId, contentHash }`.

## Outputs

- `ProfileStudioProfile`: id, display metadata, purpose, exact target,
  Draft/Valid status, creator-session binding, donor provenance, deterministic
  content/approved hash and managed timestamps.
- Structured lifecycle errors; no silent approval, fallback or identity
  mutation.
- `getProfileIdForCreatorSession()` persistent binding lookup.

## Owned Paths

- `module.md`
- `src/**`
