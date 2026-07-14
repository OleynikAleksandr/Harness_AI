import type { ClaudeSdkUsageSnapshot } from "./claude-sdk-usage-tracker.js";

// Panel snapshot built straight from the SDK usage tracker (the legacy
// `/context` CLI probe retired 2026-07-14 by user order after its figure and
// the SDK figure matched): `used` is the current context size (last-call
// input + cache_read + cache_creation), `cached` the last-call cache read
// (Codex parity for the Cache chip), `limit` the model context window —
// 0 until the turn's `result.modelUsage` reports it, in which case the
// telemetry facade keeps its previous limit.
export interface TokenUsageSnapshot {
  readonly cached: number;
  readonly limit: number;
  readonly used: number;
}

export const computeSdkUsed = (sdkUsage: ClaudeSdkUsageSnapshot): number =>
  sdkUsage.inputTokens +
  sdkUsage.cacheReadInputTokens +
  sdkUsage.cacheCreationInputTokens;

export const buildTokenUsageSnapshot = (
  sdkUsage: ClaudeSdkUsageSnapshot | undefined
): TokenUsageSnapshot | null =>
  sdkUsage
    ? {
        cached: sdkUsage.cacheReadInputTokens,
        limit: sdkUsage.contextWindow ?? 0,
        used: computeSdkUsed(sdkUsage),
      }
    : null;
