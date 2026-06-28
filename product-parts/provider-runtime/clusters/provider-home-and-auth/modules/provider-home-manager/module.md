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
- Codex provider-home `model_reasoning_summary = "none"` materialized at top-level TOML scope. Provider-home config is process-global; visible reasoning summaries are controlled per turn by Core/provider turn options.

## Owned Paths

- `module.md`
- `src/**`
