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
  with `Cache: 0` so the Codex status panel stays stable from session start;
  Grok follows the identical contract. When either route has
  already reported a positive cached-token count, later smaller values
  (including `cached: 0`) do not erase that visible anchor; the display is the
  maximum positive cache hit seen for the active projected session while the
  context-window `used` value still follows the latest provider report.
  Providers without that signal keep the field `null`.
- Core-owned `statusPanelCapabilities` declares whether a provider session
  exposes Cache, Turns and Rollback, including the number of warmup turns that
  rollback must preserve. No provider surfaces the Rollback action since
  2026-07-18 (user order hid Codex first and Grok right after, so every panel
  shows Model/effort/Tokens/Cache/Turns only); the renderer does not branch on
  provider ids or infer these capabilities from transcript text. Codex and
  Grok keep Cache/Turns with the `Cache: 0` anchor, the Core rollback intents
  for both stay wired behind the capability, and the (currently empty)
  rollback-action set is deliberately separate from the
  cache-anchor/cache-turns set (`codex`, `grok`) so hiding the action cannot
  break the anchor. Since the 2026-07-17 Kimi telemetry
  stream `kimi-client` shows Cache and Turns too (rollback stays
  unavailable): its cached counter starts at `0`, the default token limit
  resolves per model through the Core-catalog
  `kimiClientModelContextLength` (both K2.7 models 262144, `k3` 1048576 —
  live-verified 2026-07-18; unknown config-aliased ids fall back to the
  K2.7 window), cached
  values arrive as `inputCacheRead` from the CLI session-store usage the
  native session runtime emits per turn, and turns advance on
  `turn_completed` like the other providers. `kimi-client` also joins the
  limit tables: pending state `loading`, provider scope `kimi:global` and
  the five-hour window labels (the Kimi Coding Plan `/coding/v1/usages`
  window is 300 minutes), fed by the Kimi adapter's `refreshUsageLimits`
  broadcast. Since 2026-07-18 the Claude panel shows Turns too (Cache was
  already visible, rollback stays unavailable): Claude turns count from the
  adapter's structured `turn_completed` events exactly like the other
  providers.
- Core-owned `turnCount` follows a provider-normalized numeric turn field when
  one is present and otherwise advances only on structured `turn_completed`
  events. Restored snapshots are normalized through the same facade, so older
  persisted telemetry cannot omit the new status-panel fields.
- Grok context defaults are model-aware and match the authenticated ACP catalog:
  `grok-4.5` uses `500000`, while `grok-composer-2.5-fast` uses `200000`.
  Provider snapshots remain authoritative when they report another limit.
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
  `claude:global`, the Codex account scope `codex:global` and the Grok
  subscription scope `grok:subscription`. A Grok billing row may carry a
  weekly reset without a usage percentage; Core preserves that truthful
  `null` instead of turning it into `0%`. GLM OpenCode dropped its scope with the GLM
  migration, the `glm-native`/`openrouter` scopes left with the 2026-07-05
  legacy cleanup, and the ACP `kimi` scope left with the kimi-provider
  retirement (same day) — the dedicated `hasProviderUsageScope` helper is
  retired. The five-hour-window limit (`FIVE_HOUR_WINDOW_TOKEN_LIMIT`) and
  labels match every `glm-*` id, so the live `glm-client` sessions keep the
  window telemetry.

## Owned Paths

- `module.md`
- `src/**`
