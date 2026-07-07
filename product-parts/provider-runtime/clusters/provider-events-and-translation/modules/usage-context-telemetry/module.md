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
- Provider-reported cached input token display (`cacheDisplay`) when a
  normalized token-usage event includes cached token counts. Native Codex starts
  with `Cache: 0`; CodexUC also starts with `Cache: 0` so the Codex-family
  status panel stays stable from session start. When a Codex-family route has
  already reported a positive cached-token count, later smaller values
  (including `cached: 0`) do not erase that visible anchor; the display is the
  maximum positive cache hit seen for the active projected session while the
  context-window `used` value still follows the latest provider report.
  Providers without that signal keep the field `null`.
- Warning/limit state.
- Provider usage scope keys are limited to native vendor account scopes:
  `claude:global` and the shared Codex account scope `codex:global` used by
  both `codex` and `codex-uc`. GLM OpenCode dropped its scope with the GLM
  migration, the `glm-native`/`openrouter` scopes left with the 2026-07-05
  legacy cleanup, and the ACP `kimi` scope left with the kimi-provider
  retirement (same day) — the dedicated `hasProviderUsageScope` helper is
  retired. The five-hour-window limit (`FIVE_HOUR_WINDOW_TOKEN_LIMIT`) and
  labels match every `glm-*` id, so the live `glm-client` sessions keep the
  window telemetry.

## Owned Paths

- `module.md`
- `src/**`
