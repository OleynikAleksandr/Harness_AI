import type { ClaudeSdkUsageSnapshot } from "./claude-sdk-usage-tracker.js";

export interface TokenUsageSnapshot {
  // Last-API-call cache read, SDK usage tracker parity with Codex's Cache
  // chip; absent when no SDK usage has streamed yet this session.
  readonly cached?: number;
  readonly limit: number;
  // Last-API-call input + cache_read + cache_creation, a temporary
  // diagnostic figure shown next to the legacy `/context` scrape until the
  // two are confirmed to match (docs/evidence/claude-cache-telemetry-research-2026-07-14.md).
  readonly sdkUsed?: number;
  readonly used: number;
}

export const computeSdkUsed = (sdkUsage: ClaudeSdkUsageSnapshot): number =>
  sdkUsage.inputTokens +
  sdkUsage.cacheReadInputTokens +
  sdkUsage.cacheCreationInputTokens;

export const buildTokenUsageSnapshot = (
  legacy: { readonly limit: number; readonly used: number },
  sdkUsage: ClaudeSdkUsageSnapshot | undefined
): TokenUsageSnapshot => ({
  ...(sdkUsage
    ? {
        cached: sdkUsage.cacheReadInputTokens,
        sdkUsed: computeSdkUsed(sdkUsage),
      }
    : {}),
  limit: legacy.limit,
  used: legacy.used,
});

// Full panel snapshot straight from the SDK usage tracker, emitted after
// every agent-loop API call (Codex parity): `used` is the current context
// size, `cached` the last-call cache read, `limit` the model context window
// (0 until `result.modelUsage` reports it — the telemetry facade then keeps
// its previous limit).
export interface LiveTokenUsageSnapshot {
  readonly cached: number;
  readonly limit: number;
  readonly used: number;
}

export const buildLiveTokenUsageSnapshot = (
  sdkUsage: ClaudeSdkUsageSnapshot | undefined
): LiveTokenUsageSnapshot | null =>
  sdkUsage
    ? {
        cached: sdkUsage.cacheReadInputTokens,
        limit: sdkUsage.contextWindow ?? 0,
        used: computeSdkUsed(sdkUsage),
      }
    : null;

// The SDK usage channel must not die with the legacy probe: when `/context`
// yields no snapshot the provider still reports the tracker's last-call
// figures on their own (2026-07-14 acceptance fix).
export interface SdkOnlyTokenUsage {
  readonly cached: number;
  readonly sdkUsed: number;
}

export const buildSdkOnlyTokenUsage = (
  sdkUsage: ClaudeSdkUsageSnapshot | undefined
): SdkOnlyTokenUsage | null =>
  sdkUsage
    ? {
        cached: sdkUsage.cacheReadInputTokens,
        sdkUsed: computeSdkUsed(sdkUsage),
      }
    : null;

export const areTokenUsageSnapshotsEqual = (
  left: TokenUsageSnapshot,
  right: TokenUsageSnapshot
): boolean =>
  left.used === right.used &&
  left.limit === right.limit &&
  left.cached === right.cached &&
  left.sdkUsed === right.sdkUsed;
