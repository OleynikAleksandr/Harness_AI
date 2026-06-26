# Workspace Skeleton Materializer Module

## Responsibility

Create filesystem structure from the approved Product Part / Cluster / Module tree.

## Public Facade

`WorkspaceSkeletonMaterializerFacade`

## Inputs

- Product tree snapshot.
- Target workspace path.

## Outputs

- Materialized folder and node-document structure.
- Materialization diagnostics.

## Owned Paths

- `module.md`
- `src/**`
