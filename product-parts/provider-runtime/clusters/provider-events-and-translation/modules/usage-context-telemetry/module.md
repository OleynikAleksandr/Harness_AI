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
- Provider usage scope keys are limited to the native vendor channels
  (`claude`/`codex`): GLM OpenCode dropped its scope with the GLM migration,
  the `glm-native`/`openrouter` scopes left with the 2026-07-05 legacy
  cleanup, and the ACP `kimi` scope left with the kimi-provider retirement
  (same day) — the dedicated `hasProviderUsageScope` helper is retired. The
  five-hour-window limit (`FIVE_HOUR_WINDOW_TOKEN_LIMIT`) and labels match
  every `glm-*` id, so the live `glm-client` sessions keep the window
  telemetry.

## Owned Paths

- `module.md`
- `src/**`
