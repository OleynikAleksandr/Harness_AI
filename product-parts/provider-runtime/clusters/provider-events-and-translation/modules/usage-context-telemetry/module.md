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
  provider, except when a normalized token-usage event carries the
  Claude-only temporary diagnostic field `sdkUsed` (last-API-call
  `input + cache_read + cache_creation` from the Agent SDK, alongside the
  legacy `/context`-scrape `used`): then the value becomes
  `"<used> - <sdkUsed> (<percent>%)"`, dash-separated, with the percent still
  computed from the legacy `used`/`limit` pair. `sdkUsed` persists across a
  later event that omits it (same latest-wins-but-not-erased merge as
  `cached`), and is a temporary diagnostic pending user comparison of the two
  figures before a future scope retires the legacy probe
  (`docs/evidence/claude-cache-telemetry-research-2026-07-14.md`).
- Restored-telemetry hardening: `buildTelemetry` normalizes `tokenUsage`
  before any formatting, so telemetry objects restored from persisted session
  history written by older builds (no `sdkUsed`/`cached` keys after the JSON
  round-trip) pass through `applyBinding`/`applyStatus`/`applyProviderEvent`
  without crashing (2026-07-14 acceptance fix).
- Partial token-usage events: a provider event may carry only
  `cached`/`sdkUsed` without a legacy `used` figure (probe-less Claude
  emission); the merge keeps the previous `used`/`limit` and still updates the
  Cache chip and the SDK diagnostic figure (2026-07-14 acceptance fix).
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
