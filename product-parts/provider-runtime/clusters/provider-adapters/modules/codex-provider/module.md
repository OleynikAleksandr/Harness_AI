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
- Turn-level Codex reasoning summaries requested from Core-applied settings: `summary: "detailed"` when enabled, `summary: "none"` when disabled, plus the configured reasoning `effort`.

## Owned Paths

- `module.md`
- `src/**`
