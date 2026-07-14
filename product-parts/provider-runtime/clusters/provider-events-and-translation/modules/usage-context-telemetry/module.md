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
  with `Cache: 0` so the Codex status panel stays stable from session start.
  When the Codex route has
  already reported a positive cached-token count, later smaller values
  (including `cached: 0`) do not erase that visible anchor; the display is the
  maximum positive cache hit seen for the active projected session while the
  context-window `used` value still follows the latest provider report.
  Providers without that signal keep the field `null`.
- `tokenDisplay` renders as a single `"<used> (<percent>%)"` figure for every
  provider. For Claude, `used` now streams from the Agent SDK usage tracker
  after every agent-loop API call, so the figure and percent tick live during
  the turn (the legacy `/context` scrape and the temporary dash-separated
  dual-figure diagnostic retired 2026-07-14 by user order after both figures
  matched; `docs/evidence/claude-cache-telemetry-research-2026-07-14.md`).
  Mid-turn Claude events may carry `limit: 0` until the turn's
  `result.modelUsage` reports the context window — the merge keeps the
  previous limit.
- Restored-telemetry hardening: `buildTelemetry` normalizes `tokenUsage`
  before any formatting, so telemetry objects restored from persisted session
  history written by older builds (missing newer token-usage keys after the
  JSON round-trip) pass through `applyBinding`/`applyStatus`/
  `applyProviderEvent` without crashing (2026-07-14 acceptance fix).
- Warning/limit state.
- Provider usage scope keys are limited to native vendor account scopes:
  `claude:global` and the Codex account scope `codex:global`. GLM OpenCode dropped its scope with the GLM
  migration, the `glm-native`/`openrouter` scopes left with the 2026-07-05
  legacy cleanup, and the ACP `kimi` scope left with the kimi-provider
  retirement (same day) — the dedicated `hasProviderUsageScope` helper is
  retired. The five-hour-window limit (`FIVE_HOUR_WINDOW_TOKEN_LIMIT`) and
  labels match every `glm-*` id, so the live `glm-client` sessions keep the
  window telemetry.

## Owned Paths

- `module.md`
- `src/**`
