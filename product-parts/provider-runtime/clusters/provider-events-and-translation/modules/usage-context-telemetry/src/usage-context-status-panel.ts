export interface ProviderStatusPanelCapabilities {
  readonly rollbackPreserveFirstUserTurns: number | null;
  readonly showCache: boolean;
  readonly showTurns: boolean;
}

const ROLLBACK_PROVIDER_IDS = new Set(["codex", "grok"]);

export function defaultProviderCachedTokens(providerId: string): number | null {
  return ROLLBACK_PROVIDER_IDS.has(providerId) ? 0 : null;
}

export function defaultProviderTokenLimit(
  providerId: string,
  model: string
): number {
  if (providerId === "grok") {
    return model === "grok-4.5" ? 500_000 : 200_000;
  }
  return providerId.startsWith("glm-") ? 262_144 : 200_000;
}

export function providerStatusPanelCapabilities(
  providerId: string
): ProviderStatusPanelCapabilities {
  const supportsRollback = ROLLBACK_PROVIDER_IDS.has(providerId);
  return {
    rollbackPreserveFirstUserTurns: supportsRollback ? 2 : null,
    showCache: supportsRollback || providerId === "claude",
    showTurns: supportsRollback,
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
