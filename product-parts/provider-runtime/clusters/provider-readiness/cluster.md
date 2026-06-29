# Provider Readiness Cluster

## Boundary

Owns provider readiness state, recovery status, and readiness combination for
Core Runtime orchestration.

## Owned Modules

- `provider-readiness-registry`
- `provider-liveness-checker`
- `provider-workspace-provisioner`

## Facade Rule

Core Runtime writes raw provider liveness and workspace provisioning state
through readiness facades, runs workspace provisioning through provider-owned
adapter contracts, then computes active-workspace provider status from the
registry-owned combine function.
