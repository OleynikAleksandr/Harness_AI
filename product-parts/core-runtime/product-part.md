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
- `development-orchestrator`
- `intent-normalization`
- `settings-and-localization`

## Responsibilities

- Own workspace/session state and snapshots consumed by Application Shell.
- Own next-session mode truth; Application Shell can display and submit mode choices but cannot decide provider behavior locally.
- Own provider adapter registration and provider session binding.
- Expose Core RPC and event-stream contracts consumed by Application Shell.
- Own provider CLI/version tooling and local-model discovery requests.
- Run plan-first development orchestration and quality gates.
- Coordinate providers through Provider Runtime facades.
- Normalize visible provider reasoning before it reaches UI snapshots.
- Promote provider session ids emitted by provider runtimes so Core keeps the authoritative binding for later turns.
- Preserve provider-neutral message tags and coalesce live assistant chunks before session readback/display.

## Out Of Scope

- Electron renderer composition.
- Application Shell windowing and display composition.
- Provider-specific protocol implementation details.
- Application Shell IPC, dialogs, window lifecycle and renderer transport.
