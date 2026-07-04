# Usage Context Telemetry Module

## Responsibility

Own usage limits and context-window signals derived from provider events.

## Public Facade

`UsageContextTelemetryFacade`

## Inputs

- Normalized provider events.
- Provider usage limit metadata.

## Outputs

- Usage/context telemetry snapshot.
- Warning/limit state.
- GLM OpenCode no longer contributes a provider usage scope after the GLM
  migration; current GLM telemetry uses the active GLM provider ids only.

## Owned Paths

- `module.md`
- `src/**`
