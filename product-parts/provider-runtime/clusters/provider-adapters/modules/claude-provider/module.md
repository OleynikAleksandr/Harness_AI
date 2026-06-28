# Claude Provider Module

## Responsibility

Fresh Harness AI adapter for Claude provider turns.

## Public Facade

`ClaudeProviderFacade`

## Inputs

- Provider turn request.
- Claude auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Claude CLI runs with the active workspace as `cwd`, so workspace-level files such as `CLAUDE.md` are visible to the provider.

## Owned Paths

- `module.md`
- `src/**`
