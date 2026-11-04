# Workspace Registry Module

## Responsibility

Own known workspaces and active workspace selection.

## Public Facade

`WorkspaceRegistryFacade`

## Inputs

- Workspace open/create intents.
- User-global known workspace storage.

## Outputs

- Known workspace snapshot.
- Active workspace selection state.
- `removeWorkspace(id)` forgets a known workspace (the project is removed from
  the app, not from disk); the built-in workspace (`isBuiltInWorkspace`)
  cannot be removed and becomes active when the active workspace is removed.

## Owned Paths

- `module.md`
- `src/**`
