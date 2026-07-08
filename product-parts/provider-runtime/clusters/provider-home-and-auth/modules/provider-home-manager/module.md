# Provider Home Manager Module

## Responsibility

Own isolated provider home layout.

## Public Facade

`ProviderHomeManagerFacade`

## Inputs

- Provider id.
- Workspace/user home policy.

## Outputs

- Provider home paths.
- Home preparation diagnostics.
- CLI-free provider home file materialization by copy-if-missing or link for
  provider-owned workspace provisioning.
- Codex provider-home `model_reasoning_summary = "detailed"` materialized at top-level TOML scope. Provider-home config is process-global and must not suppress visible reasoning summaries requested per turn by Core/provider turn options.

## Owned Paths

- `module.md`
- `src/**`
