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
