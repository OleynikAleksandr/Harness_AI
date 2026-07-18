import { kimiClientModelContextLength } from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";

export interface ProviderStatusPanelCapabilities {
  readonly rollbackPreserveFirstUserTurns: number | null;
  readonly showCache: boolean;
  readonly showTurns: boolean;
}

// Providers whose status panel surfaces the Rollback action. Codex keeps the
// Core rollback intent wired, but its panel action is hidden since
// 2026-07-18 (user order: the Codex panel matches Claude/Kimi —
// Model/effort/Tokens/Cache/Turns).
const ROLLBACK_ACTION_PROVIDER_IDS = new Set(["grok"]);

// Providers whose status panel anchors the Cache chip at `Cache: 0` from
// session start and shows the Cache/Turns chips.
const CACHE_ANCHOR_PROVIDER_IDS = new Set(["codex", "grok"]);

export function defaultProviderCachedTokens(providerId: string): number | null {
  return CACHE_ANCHOR_PROVIDER_IDS.has(providerId) ||
    providerId === "kimi-client"
    ? 0
    : null;
}

export function defaultProviderTokenLimit(
  providerId: string,
  model: string
): number {
  if (providerId === "grok") {
    return model === "grok-4.5" ? 500_000 : 200_000;
  }
  if (providerId === "kimi-client") {
    // Core-catalog context per model (k3 is a 1M-context model, K2.7 stays
    // at 262144 — verified live 2026-07-18); real usage events override it
    // per turn.
    return kimiClientModelContextLength(model);
  }
  return providerId.startsWith("glm-") ? 262_144 : 200_000;
}

export function providerStatusPanelCapabilities(
  providerId: string
): ProviderStatusPanelCapabilities {
  const supportsRollbackAction = ROLLBACK_ACTION_PROVIDER_IDS.has(providerId);
  // Kimi native turns report inputCacheRead from the CLI session store.
  // Claude, Kimi and Codex count turns from turn_completed like Grok; Codex
  // shows the Cache/Turns chips without the Rollback action.
  const showsCacheAndTurns =
    CACHE_ANCHOR_PROVIDER_IDS.has(providerId) ||
    providerId === "claude" ||
    providerId === "kimi-client";
  return {
    rollbackPreserveFirstUserTurns: supportsRollbackAction ? 2 : null,
    showCache: showsCacheAndTurns,
    showTurns: showsCacheAndTurns,
  };
}

export function resolveProviderTurnCount(
  current: number,
  event: unknown
): number {
  const root = isRecord(event) ? event : null;
  const data = isRecord(root?.data) ? root.data : null;
  const raw = isRecord(root?.raw) ? root.raw : null;
  const meta = isRecord(raw?._meta) ? raw._meta : null;
  const native = [
    root?.turnCount,
    root?.turns,
    data?.turnCount,
    data?.turns,
    meta?.numTurns,
  ].find(isNonNegativeInteger);
  if (native !== undefined) {
    return native;
  }
  return root?.type === "turn_completed" ? current + 1 : current;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
