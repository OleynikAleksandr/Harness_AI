# Workspace Registry Module

## Responsibility

Own known workspaces and active workspace selection. There is no built-in
workspace: the registry may be empty and may have no active workspace.

## Public Facade

`WorkspaceRegistryFacade`

## Inputs

- Workspace open/create intents.
- User-global known workspace storage (`WorkspaceRegistrySnapshot`).

## Outputs

- Known workspace list (`getKnownWorkspaces()`), empty in a new registry.
- `getActiveWorkspace()` → the active workspace or `null` when none is
  active. `addWorkspace(path)` registers without selecting;
  `selectWorkspace(id)` throws for an unknown id.
- `removeWorkspace(id)` forgets any known workspace (the project is removed
  from the app, not from disk); removing the active workspace activates the
  first remaining one, or none when the registry becomes empty. An unknown id
  throws.
- `restoreSnapshot(snapshot)` replaces the registry: every valid entry is an
  ordinary workspace (an old `harness-ai-local` entry included); an unknown
  or missing active id falls back to the first workspace, an empty snapshot
  leaves no active workspace.
- `getSnapshot()` → `{activeWorkspaceId: string | null, workspaces}`.

## Tests

- `src/workspace-registry-facade.test.mjs` — empty registry, add/select,
  snapshot round trip, old `harness-ai-local` snapshot, removal of the active
  workspace to the next one and to none.

## Owned Paths

- `module.md`
- `src/**`
