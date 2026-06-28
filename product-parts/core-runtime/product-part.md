# Core Runtime

## Purpose

Long-running local authority for workspaces, sessions, orchestration, settings, localization, and workspace truth.

## Owned Clusters

- `workspace-architecture`
- `session-runtime`
- `development-orchestrator`
- `intent-normalization`
- `settings-and-localization`

## Responsibilities

- Own workspace/session state and snapshots consumed by Application Shell.
- Run plan-first development orchestration and quality gates.
- Coordinate providers through Provider Runtime facades.
- Normalize visible provider reasoning before it reaches UI snapshots.
- Preserve provider-neutral message tags and coalesce live assistant chunks before session readback/display.

## Out Of Scope

- Electron renderer composition.
- Provider-specific protocol implementation details.
