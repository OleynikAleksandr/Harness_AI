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
- Turn-level Codex reasoning summaries requested from Core-applied settings: `summary: "detailed"` when enabled for models that support summaries, `summary: "none"` when disabled or unsupported, plus the configured reasoning `effort`. Provider-home summary config remains neutral and is prepared by `provider-home-manager`.

## Owned Paths

- `module.md`
- `src/**`
