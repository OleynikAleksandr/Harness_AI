# Electron Host Cluster

## Boundary

Owns the Electron main process, Core Runtime process bridge, and file-link launch behavior.

## Owned Modules

- `app-bootstrap`
- `core-process-bridge`
- `vscode-link-opener`

## Facade Rule

Application Shell modules outside this cluster import only module facades exposed by these modules.
