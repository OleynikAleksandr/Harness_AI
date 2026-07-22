# Profile Studio Cluster

## Boundary

Owns Core Runtime truth for the provider/model-scoped Profile Studio workflow:
Draft/Valid lifecycle, creator-session binding, controlled structured
authoring, composite creator-agent profile loading and UI read models. It
composes public facades from `session-profiles`, session runtime, provider
descriptors and Native Request Capture; it never asks renderer code to scan
files, infer state or parse agent prose.

Five Core modules are applied: `profile-studio-lifecycle`,
`profile-studio-authoring`, `profile-studio-agent` and
`profile-studio-read-model`, plus `profile-studio-creator-profile`.
Lifecycle mints immutable Draft
ids, preserves exact target/session binding, computes the materialized content
hash, accepts approval only for that hash and returns every later full-snapshot
edit to Draft. It also coordinates deletion of a validated Studio v2 profile
with cleanup of its bound creator session through Session Runtime; this route
cannot target legacy or Native profiles. Approval metadata is derived from the
controlled passport transition; direct/manual profile editing and recovery are
outside this first stage.
Authoring validates complete creator snapshots, honest provider tool modes and
contained raw Native Capture donor truth before delegating one atomic update.
Agent owns the selected provider/model isolated runtime spec, inline complete
context and full-snapshot JSON Schema/parse contract. Claude/Codex creator
targets use high reasoning; Kimi keeps provider-managed reasoning. Session Runtime now
creates and restores its managed creator sessions in the dedicated Studio
workspace, attaches the schema to every creator dispatch, and applies valid
raw structured results through controlled authoring with a bounded repair
turn on rejection.
Read model supplies provider/model targets, compatible creator-session rows and
Core-owned Overview/Prompt/Tools snapshots with honest provider capabilities.
Creator profile loading resolves the settings-selected HARNESS_AI_HOME-aware
four-component profile, validates it without fallbacks, composes its exact
two-part effective system prompt and renders only supported Core assignment
placeholders.

Contract source: `docs/architecture/ProfileStudio.md`.

## Owned Modules

- `profile-studio-lifecycle`
- `profile-studio-authoring`
- `profile-studio-agent`
- `profile-studio-read-model`
- `profile-studio-creator-profile`

## Facade Rule

External Core modules call the cluster's class facades. They do not read Studio
profile documents or mutate lifecycle status directly. Application Shell
receives typed snapshots and submits commands only through the Core bridge.
