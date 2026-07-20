# Profile Studio Cluster

## Boundary

Owns Core Runtime truth for the provider/model-scoped Profile Studio workflow:
Draft/Valid lifecycle, creator-session binding, controlled structured
authoring, fixed creator-agent contract and UI read models. It composes public
facades from `session-profiles`, session runtime, provider descriptors and
Native Request Capture; it never asks renderer code to scan files, infer state
or parse agent prose.

Applied slices: `profile-studio-lifecycle` and `profile-studio-authoring`.
Lifecycle mints immutable Draft
ids, preserves exact target/session binding, computes the materialized content
hash, accepts approval only for that hash and returns every later full-snapshot
edit to Draft. Approval metadata is derived from the controlled passport
transition; direct/manual profile editing and recovery are outside this first
stage.
Authoring validates complete creator snapshots, honest provider tool modes and
contained raw Native Capture donor truth before delegating one atomic update.

Contract source: `docs/architecture/ProfileStudio.md`.

## Owned Modules

- `profile-studio-lifecycle`
- `profile-studio-authoring`

## Accepted Next Modules (Not Yet Applied)

- `profile-studio-agent` (planned in the active implementation scope)
- `profile-studio-read-model` (planned in the active implementation scope)

## Facade Rule

External Core modules call the cluster's class facades. They do not read Studio
profile documents or mutate lifecycle status directly. Application Shell
receives typed snapshots and submits commands only through the Core bridge.
