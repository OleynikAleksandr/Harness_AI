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
  migration, and the retired `glm-native`/`openrouter` scopes left with the
  2026-07-05 legacy cleanup — `hasProviderUsageScope` keeps only the ACP
  `kimi` (alive behind the native capture feature). The five-hour-window
  labels/limits keep matching `kimi` and every `glm-*` id, so the live
  `glm-client` sessions stay on the Kimi-style window telemetry.

## Owned Paths

- `module.md`
- `src/**`
