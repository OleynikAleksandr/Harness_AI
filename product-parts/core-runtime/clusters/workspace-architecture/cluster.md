# Workspace Architecture Cluster

## Boundary

Owns the workspace registry: known workspaces and active workspace selection.
There is no built-in workspace: the registry may be empty and have no active
workspace; every saved entry (an old `harness-ai-local` one included) is an
ordinary, removable project.

Product tree storage, skeleton materialization, and file-link contracts were
scaffolded as `module.md`-only placeholders early in the project and never
implemented; they were removed from the product tree (2026-07-01) rather than
kept as unimplemented debt. Re-add them here if that work is picked up again.

## Owned Modules

- `workspace-registry`

## Facade Rule

Other clusters access workspace structure through these module facades, not by parsing product-tree files directly.
