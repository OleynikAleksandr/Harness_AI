# Workspace Architecture Cluster

## Boundary

Owns workspace registry, product tree storage, skeleton materialization, and file-link contracts.

## Owned Modules

- `workspace-registry`
- `product-tree-store`
- `workspace-skeleton-materializer`
- `workspace-link-contract`

## Facade Rule

Other clusters access workspace structure through these module facades, not by parsing product-tree files directly.
