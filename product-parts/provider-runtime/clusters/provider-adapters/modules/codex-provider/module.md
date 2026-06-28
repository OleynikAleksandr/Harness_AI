# Codex Provider Module

## Responsibility

Fresh Harness AI adapter for Codex provider turns.

## Public Facade

`CodexProviderFacade`

## Inputs

- Provider turn request.
- Codex auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Turn-level Codex reasoning summaries requested as `summary: "detailed"` so app-server reasoning notifications can reach Core.

## Owned Paths

- `module.md`
- `src/**`
