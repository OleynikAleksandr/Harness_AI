import {
  KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH,
  KIMI_CLIENT_MODELS,
} from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import { resolveKimiApiKey } from "./kimi-usage-limits.js";

// Live Kimi Coding Plan model catalog (verified 2026-07-18):
// `GET https://api.kimi.com/coding/v1/models` with the subscription Bearer
// key returns one row per model with its `context_length` (k3 1048576,
// both K2.7 models 262144). The resolver merges the live rows over the
// Core-catalog fallback so native sessions keep honest windows offline,
// and memoizes a successful read per process so session starts stay
// instant.

export type KimiModelContexts = Readonly<Record<string, number>>;

const KIMI_MODELS_ENDPOINT = "https://api.kimi.com/coding/v1/models";
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 15 * 60 * 1000;

let cache: { expiresAt: number; value: KimiModelContexts } | null = null;

export function parseKimiModelContexts(
  payload: unknown
): Record<string, number> {
  const contexts: Record<string, number> = {};
  if (!(isRecord(payload) && Array.isArray(payload.data))) {
    return contexts;
  }
  for (const row of payload.data) {
    if (!isRecord(row) || typeof row.id !== "string" || !row.id.trim()) {
      continue;
    }
    const contextLength = row.context_length;
    if (
      typeof contextLength === "number" &&
      Number.isInteger(contextLength) &&
      contextLength > 0
    ) {
      contexts[row.id] = contextLength;
    }
  }
  return contexts;
}

export async function fetchKimiModelContexts(
  overrides: {
    readonly apiKey?: string;
    readonly configPath?: string;
    readonly fetchImpl?: typeof fetch;
  } = {}
): Promise<Record<string, number> | null> {
  const apiKey = resolveKimiApiKey(overrides);
  if (!apiKey) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  timer.unref?.();
  try {
    const response = await (overrides.fetchImpl ?? fetch)(
      KIMI_MODELS_ENDPOINT,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      }
    );
    if (!response.ok) {
      return null;
    }
    const contexts = parseKimiModelContexts(await response.json());
    return Object.keys(contexts).length > 0 ? contexts : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Merged per-model context windows for a session start. A successful live
// read is cached for the TTL; a failed one returns the Core-catalog
// fallback immediately and retries on the next call.
export async function resolveKimiModelContexts(
  overrides: {
    readonly apiKey?: string;
    readonly configPath?: string;
    readonly fetchImpl?: typeof fetch;
    readonly now?: number;
  } = {}
): Promise<KimiModelContexts> {
  const now = overrides.now ?? Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }
  const live = await fetchKimiModelContexts(overrides);
  const merged: KimiModelContexts = {
    ...fallbackKimiModelContexts(),
    ...(live ?? {}),
  };
  if (live) {
    cache = { expiresAt: now + CACHE_TTL_MS, value: merged };
  }
  return merged;
}

function fallbackKimiModelContexts(): Record<string, number> {
  const contexts: Record<string, number> = {};
  for (const model of KIMI_CLIENT_MODELS) {
    contexts[model.id] =
      model.contextLength ?? KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH;
  }
  return contexts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
