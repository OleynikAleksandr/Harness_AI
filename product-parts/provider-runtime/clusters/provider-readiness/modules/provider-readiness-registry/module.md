# Provider Readiness Registry Module

## Responsibility

Own raw provider liveness state, per-workspace provisioning state, readiness
combination, and raw readiness change notifications.

## Public Facade

`ProviderReadinessRegistryFacade`

## Inputs

- Provider liveness status.
- Provider workspace provisioning status.
- Provider id and workspace id for readiness combination.

## Outputs

- Combined provider readiness status for a workspace.
- Raw readiness change observable for Core Runtime orchestration.

## Owned Paths

- `module.md`
- `src/**`
