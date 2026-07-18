import { kimiClientModelContextLength } from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";

export interface ProviderStatusPanelCapabilities {
  readonly rollbackPreserveFirstUserTurns: number | null;
  readonly showCache: boolean;
  readonly showTurns: boolean;
}

const ROLLBACK_PROVIDER_IDS = new Set(["codex", "grok"]);

export function defaultProviderCachedTokens(providerId: string): number | null {
  return ROLLBACK_PROVIDER_IDS.has(providerId) || providerId === "kimi-client"
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
  const supportsRollback = ROLLBACK_PROVIDER_IDS.has(providerId);
  return {
    rollbackPreserveFirstUserTurns: supportsRollback ? 2 : null,
    // Kimi native turns report inputCacheRead from the CLI session store.
    // Claude and Kimi turns count from turn_completed like the rollback
    // providers; Claude shows the Turns chip without rollback support.
    showCache:
      supportsRollback ||
      providerId === "claude" ||
      providerId === "kimi-client",
    showTurns:
      supportsRollback ||
      providerId === "claude" ||
      providerId === "kimi-client",
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
