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
- Codex provider-home `model_reasoning_summary = "detailed"` materialized at top-level TOML scope so Codex app-server can emit visible reasoning summary notifications.

## Owned Paths

- `module.md`
- `src/**`
