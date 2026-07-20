# Core Runtime

## Purpose

Out-of-process long-running local authority for workspaces, sessions,
orchestration, provider composition, settings, localization, and workspace
truth. Application Shell reaches this authority through the Core process
contracts, not through direct module imports.

## Owned Clusters

- `runtime-process`
- `workspace-architecture`
- `session-runtime`
- `session-profiles`
- `profile-studio`
- `provider-network-capture`
- `universal-client`
- `settings-and-localization`

`development-orchestrator` and `intent-normalization` were scaffolded as
`module.md`-only cluster placeholders early in the project and never
implemented; they were removed from the product tree (2026-07-01) rather than
kept as unimplemented debt. Plan-first lifecycle and quality gates run today
through `scripts/*.mjs` and `.husky/**` (see `AGENTS.md`), not a dedicated
Core Runtime cluster. Re-add a cluster here if either responsibility moves
into `product-parts/**` as real module code.

## Responsibilities

- Own workspace/session state and snapshots consumed by Application Shell.
- Own deterministic session auto-title, manual-title lock and regenerate
  commands; Application Shell only submits intent and renders the result.
- Own provider-neutral parent-child session graphs and persisted subagent
  timeline read models; clients only render them.
- Own next-session mode truth; Application Shell can display and submit mode choices but cannot decide provider behavior locally.
- Own provider adapter registration and provider session binding.
- Expose Core RPC and event-stream contracts consumed by Application Shell.
- Own provider CLI/version tooling and local-model discovery requests.
- Run plan-first development orchestration and quality gates (via `scripts/*.mjs` and `.husky/**`).
- Coordinate providers through Provider Runtime facades.
- Normalize visible provider reasoning before it reaches UI snapshots.
- Promote provider session ids emitted by provider runtimes so Core keeps the authoritative binding for later turns.
- Preserve provider-neutral message tags and coalesce live assistant chunks before session readback/display.
- Own native request capture artifacts: raw upstream-request JSONL, separate
  diagnostics JSONL, and readable Markdown reports for profile-verification
  payload groups.
- Persist and validate Profile Studio v2 provider/model passports and their
  separate Draft-tolerant prompt source documents without turning renderer
  state into profile truth.
- Own Profile Studio lifecycle truth: immutable Draft identity, exact
  provider/model and creator-session binding, content-hash approval and
  edit-to-Draft transitions through class facades.

## Out Of Scope

- Electron renderer composition.
- Application Shell windowing and display composition.
- Provider-specific protocol implementation details.
- Application Shell IPC, dialogs, window lifecycle and renderer transport.
