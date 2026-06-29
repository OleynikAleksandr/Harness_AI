# Provider Workspace Provisioner Module

## Responsibility

Run provider-owned workspace home provisioning for a selected workspace and
write raw provisioning state.

## Public Facade

`ProviderWorkspaceProvisionerFacade`

## Inputs

- Workspace id.
- Workspace path.
- Provider registry descriptors and adapters.

## Outputs

- Raw per-workspace provider provisioning status in the readiness registry.

## Owned Paths

- `module.md`
- `src/**`
