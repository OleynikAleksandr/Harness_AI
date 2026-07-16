import { isRecord } from "./grok-acp-contracts.js";
import type { GrokSessionTransport } from "./grok-session-runtime.js";

export interface GrokBillingPeriod {
  readonly endAt: string | null;
  readonly kind: "monthly" | "unknown" | "weekly";
  readonly startAt: string | null;
}

export interface GrokBillingSnapshot {
  readonly collectedAt: string;
  readonly currentPeriod: GrokBillingPeriod | null;
  readonly includedCreditLimitCents: number | null;
  readonly includedCreditUsedCents: number | null;
  readonly isUnifiedBillingUser: boolean | null;
  readonly onDemandCapCents: number | null;
  readonly onDemandEnabled: boolean | null;
  readonly onDemandUsedCents: number | null;
  readonly prepaidBalanceCents: number | null;
  readonly providerScopeKey: "grok:subscription";
  readonly resetAt: string | null;
  readonly source: "grok_acp";
  readonly subscriptionTier: string | null;
  readonly usagePercent: number | null;
}

export interface GrokBillingClientOptions {
  readonly now?: () => Date;
  readonly transport: Pick<GrokSessionTransport, "request">;
}

export class GrokBillingClient {
  readonly #now: () => Date;
  readonly #transport: Pick<GrokSessionTransport, "request">;

  constructor(options: GrokBillingClientOptions) {
    this.#transport = options.transport;
    this.#now = options.now ?? (() => new Date());
  }

  async read(): Promise<GrokBillingSnapshot> {
    const response = await this.#transport.request("_x.ai/billing", {});
    return normalizeGrokBillingSnapshot(response, this.#now());
  }
}

export function normalizeGrokBillingSnapshot(
  payload: unknown,
  collectedAt = new Date()
): GrokBillingSnapshot {
  const root = unwrapResult(payload);
  const config = isRecord(root?.config) ? root.config : null;
  const period = normalizePeriod(config);
  const limit = readCent(config?.monthlyLimit);
  const used = readCent(config?.used);
  const nativeUsagePercent = readPercent(config?.creditUsagePercent);
  return {
    collectedAt: collectedAt.toISOString(),
    currentPeriod: period,
    includedCreditLimitCents: limit,
    includedCreditUsedCents: used,
    isUnifiedBillingUser: readBoolean(config?.isUnifiedBillingUser),
    onDemandCapCents: readCent(config?.onDemandCap),
    onDemandEnabled: readBoolean(root?.onDemandEnabled),
    onDemandUsedCents: readCent(config?.onDemandUsed),
    prepaidBalanceCents: readCent(config?.prepaidBalance),
    providerScopeKey: "grok:subscription",
    resetAt: period?.endAt ?? null,
    source: "grok_acp",
    subscriptionTier: readString(root?.subscriptionTier),
    usagePercent: nativeUsagePercent ?? deriveLegacyUsagePercent(limit, used),
  };
}

function normalizePeriod(
  config: Record<string, unknown> | null
): GrokBillingPeriod | null {
  if (!config) {
    return null;
  }
  const current = isRecord(config.currentPeriod) ? config.currentPeriod : null;
  const startAt = normalizeDate(current?.start ?? config.billingPeriodStart);
  const endAt = normalizeDate(current?.end ?? config.billingPeriodEnd);
  const rawType = readString(current?.type)?.toUpperCase() ?? null;
  if (!(current || startAt || endAt)) {
    return null;
  }
  let kind: GrokBillingPeriod["kind"] = "unknown";
  if (rawType?.includes("WEEKLY")) {
    kind = "weekly";
  } else if (rawType?.includes("MONTHLY") || !current) {
    kind = "monthly";
  }
  return {
    endAt,
    kind,
    startAt,
  };
}

function unwrapResult(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }
  return isRecord(payload.result) ? payload.result : payload;
}

function deriveLegacyUsagePercent(
  limit: number | null,
  used: number | null
): number | null {
  return limit !== null && limit > 0 && used !== null
    ? clampPercent((used / limit) * 100)
    : null;
}

function readCent(value: unknown): number | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.val === undefined) {
    return 0;
  }
  return typeof value.val === "number" && Number.isFinite(value.val)
    ? value.val
    : null;
}

function readPercent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clampPercent(value)
    : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeDate(value: unknown): string | null {
  const text = readString(value);
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
