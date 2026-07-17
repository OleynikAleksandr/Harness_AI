import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";

// Kimi Coding Plan usage limits for the top session panel (verified live
// 2026-07-17): `GET https://api.kimi.com/coding/v1/usages` with the
// subscription Bearer key returns `limits[0].detail` (the 300-minute = 5h
// window) and `usage` (the weekly bucket); numeric fields arrive as
// strings. The key comes from the Harness kimi-client auth store with a
// fallback to the CLI config-TOML `api_key`, so native-profile sessions get
// limits even when no key was pasted into Harness.

export interface KimiUsageLimitBucket {
  readonly percentUsed: number | null;
  readonly resetsAt: string | null;
}

export interface KimiUsageLimitsEvent {
  readonly data: Readonly<Record<string, unknown>>;
  readonly providerScopeKey: "kimi:global";
  readonly type: "usage_limits";
  readonly usageLimitLabels: {
    readonly currentSession: string;
    readonly currentWeekAllModels: string;
  };
  readonly usageLimits: {
    readonly currentSession: KimiUsageLimitBucket | null;
    readonly currentWeekAllModels: KimiUsageLimitBucket | null;
    readonly currentWeekSonnetOnly: null;
  };
}

const KIMI_USAGE_ENDPOINT = "https://api.kimi.com/coding/v1/usages";
const TOML_API_KEY_PATTERN = /^\s*api_key\s*=\s*"([^"]+)"/mu;

export async function readKimiUsageLimitsEvent(
  overrides: {
    readonly apiKey?: string;
    readonly configPath?: string;
    readonly fetchImpl?: typeof fetch;
  } = {}
): Promise<KimiUsageLimitsEvent | null> {
  const apiKey =
    overrides.apiKey ??
    providerAuthStoreFacade.getApiKey("kimi-client") ??
    readTomlApiKey(
      overrides.configPath ?? path.join(homedir(), ".kimi-code", "config.toml")
    );
  if (!apiKey) {
    return null;
  }
  try {
    const response = await (overrides.fetchImpl ?? fetch)(KIMI_USAGE_ENDPOINT, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    return buildKimiUsageLimitsEvent(await response.json());
  } catch {
    return null;
  }
}

export function buildKimiUsageLimitsEvent(
  payload: unknown
): KimiUsageLimitsEvent | null {
  if (!isRecord(payload)) {
    return null;
  }
  const firstLimit = Array.isArray(payload.limits) ? payload.limits[0] : null;
  const currentSession = readBucket(
    isRecord(firstLimit) ? firstLimit.detail : null
  );
  const currentWeekAllModels = readBucket(payload.usage);
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  const usageLimits = {
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly: null,
  } as const;
  return {
    data: {
      kind: "usage_limits",
      providerScopeKey: "kimi:global",
      source: "kimi_usage_api",
      usageLimits,
    },
    providerScopeKey: "kimi:global",
    type: "usage_limits",
    usageLimitLabels: { currentSession: "5h", currentWeekAllModels: "Weekly" },
    usageLimits,
  };
}

function readBucket(value: unknown): KimiUsageLimitBucket | null {
  if (!isRecord(value)) {
    return null;
  }
  const limit = readNumber(value.limit);
  const remaining = readNumber(value.remaining);
  const used =
    readNumber(value.used) ??
    (limit !== null && remaining !== null ? limit - remaining : null);
  const percentUsed =
    limit !== null && limit > 0 && used !== null
      ? Math.min(100, Math.max(0, Math.round((used / limit) * 100)))
      : null;
  const resetsAt =
    typeof value.resetTime === "string" && value.resetTime.trim()
      ? value.resetTime
      : null;
  if (percentUsed === null && !resetsAt) {
    return null;
  }
  return { percentUsed, resetsAt };
}

function readTomlApiKey(configPath: string): string | null {
  try {
    return (
      readFileSync(configPath, "utf8").match(TOML_API_KEY_PATTERN)?.[1] ?? null
    );
  } catch {
    return null;
  }
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
