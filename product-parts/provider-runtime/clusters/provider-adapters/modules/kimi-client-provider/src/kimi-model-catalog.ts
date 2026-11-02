import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH,
  type ProviderModelDescriptor,
  providerDescriptorFacade,
} from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import { resolveKimiApiKey } from "./kimi-usage-limits.js";

// Live Kimi Coding Plan model catalog (verified 2026-11-02):
// `GET https://api.kimi.com/coding/v1/models` with the subscription Bearer
// key returns one row per model with `display_name`, `context_length` and
// `think_efforts` ({ support, valid_efforts, default_effort }; older servers
// expose the same under `reasoning.effort`). Core serves this catalog through
// the provider descriptor, so newly published models (K3.1 Pro) appear
// without a code change. The last successful read is persisted under the
// Harness product home and applied first on every start, so an offline start
// keeps the last known models; the verified descriptor list is the fallback
// when nothing was ever read.

export type KimiModelContexts = Readonly<Record<string, number>>;

interface KimiModelCatalogOverrides {
  readonly apiKey?: string;
  readonly catalogPath?: string;
  readonly configPath?: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: number;
}

const KIMI_MODELS_ENDPOINT = "https://api.kimi.com/coding/v1/models";
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const CATALOG_FILENAME = "model-catalog.json";

let liveExpiresAt = 0;
let persistedCatalogPath: string | null = null;

export function parseKimiModelCatalog(
  payload: unknown
): ProviderModelDescriptor[] {
  const models: ProviderModelDescriptor[] = [];
  if (!(isRecord(payload) && Array.isArray(payload.data))) {
    return models;
  }
  for (const row of payload.data) {
    if (!isRecord(row) || typeof row.id !== "string" || !row.id.trim()) {
      continue;
    }
    const contextLength = row.context_length;
    const efforts = parseEfforts(row);
    models.push({
      ...(isPositiveInteger(contextLength) ? { contextLength } : {}),
      ...(efforts.defaultReasoningEffort
        ? { defaultReasoningEffort: efforts.defaultReasoningEffort }
        : {}),
      id: row.id,
      label:
        typeof row.display_name === "string" && row.display_name.trim()
          ? row.display_name.trim()
          : row.id,
      ...(efforts.reasoningEfforts.length > 0
        ? { reasoningEfforts: efforts.reasoningEfforts }
        : {}),
    });
  }
  return models;
}

export async function fetchKimiModelCatalog(
  overrides: KimiModelCatalogOverrides = {}
): Promise<ProviderModelDescriptor[] | null> {
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
    const models = parseKimiModelCatalog(await response.json());
    return models.length > 0 ? models : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Applies the persisted catalog once per catalog path, then refreshes from
// the live endpoint when the previous successful read is older than the
// TTL. A successful read is applied to the provider descriptor and
// persisted; a failed one keeps the served catalog and retries on the next
// call. Core calls this on start; session starts call it through
// `resolveKimiModelContexts`.
export async function refreshKimiModelCatalog(
  overrides: KimiModelCatalogOverrides = {}
): Promise<readonly ProviderModelDescriptor[]> {
  const catalogPath = overrides.catalogPath ?? defaultCatalogPath();
  if (persistedCatalogPath !== catalogPath) {
    persistedCatalogPath = catalogPath;
    liveExpiresAt = 0;
    providerDescriptorFacade.setKimiClientModels(
      readPersistedCatalog(catalogPath)
    );
  }
  const now = overrides.now ?? Date.now();
  if (liveExpiresAt > now) {
    return providerDescriptorFacade.getKimiClientModels();
  }
  const live = await fetchKimiModelCatalog(overrides);
  if (live) {
    liveExpiresAt = now + CACHE_TTL_MS;
    providerDescriptorFacade.setKimiClientModels(live);
    writePersistedCatalog(catalogPath, live, now);
  }
  return providerDescriptorFacade.getKimiClientModels();
}

// Per-model context windows of the served catalog for a native session
// start (workspace-home config and per-turn usage limit).
export async function resolveKimiModelContexts(
  overrides: KimiModelCatalogOverrides = {}
): Promise<KimiModelContexts> {
  const models = await refreshKimiModelCatalog(overrides);
  return Object.fromEntries(
    models.map((model) => [
      model.id,
      model.contextLength ?? KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH,
    ])
  );
}

function parseEfforts(row: Record<string, unknown>): {
  defaultReasoningEffort: string | null;
  reasoningEfforts: string[];
} {
  const thinkEfforts = row.think_efforts;
  if (isRecord(thinkEfforts) && thinkEfforts.support === true) {
    return effortsOf(thinkEfforts.valid_efforts, thinkEfforts.default_effort);
  }
  const reasoning = row.reasoning;
  if (isRecord(reasoning) && isRecord(reasoning.effort)) {
    return effortsOf(reasoning.effort.valid, reasoning.effort.default);
  }
  return { defaultReasoningEffort: null, reasoningEfforts: [] };
}

function effortsOf(
  valid: unknown,
  fallbackDefault: unknown
): { defaultReasoningEffort: string | null; reasoningEfforts: string[] } {
  const reasoningEfforts = Array.isArray(valid)
    ? valid.filter(
        (effort): effort is string => typeof effort === "string" && !!effort
      )
    : [];
  const defaultReasoningEffort =
    typeof fallbackDefault === "string" &&
    reasoningEfforts.includes(fallbackDefault)
      ? fallbackDefault
      : null;
  return { defaultReasoningEffort, reasoningEfforts };
}

function readPersistedCatalog(catalogPath: string): ProviderModelDescriptor[] {
  try {
    const stored: unknown = JSON.parse(readFileSync(catalogPath, "utf8"));
    return isRecord(stored) ? parseKimiModelCatalog({ data: stored.data }) : [];
  } catch {
    return [];
  }
}

// Persisted in the endpoint's own row shape so the same parser reads it back.
function writePersistedCatalog(
  catalogPath: string,
  models: readonly ProviderModelDescriptor[],
  now: number
): void {
  try {
    mkdirSync(path.dirname(catalogPath), { recursive: true });
    const data = models.map((model) => ({
      ...(model.contextLength ? { context_length: model.contextLength } : {}),
      display_name: model.label,
      id: model.id,
      ...(model.reasoningEfforts
        ? {
            think_efforts: {
              default_effort: model.defaultReasoningEffort ?? null,
              support: true,
              valid_efforts: model.reasoningEfforts,
            },
          }
        : {}),
    }));
    writeFileSync(
      catalogPath,
      `${JSON.stringify({ data, fetchedAt: new Date(now).toISOString() }, null, 2)}\n`,
      "utf8"
    );
  } catch {
    // The served catalog stays applied; persistence retries on the next read.
  }
}

function defaultCatalogPath(): string {
  return path.join(
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai"),
    "providers",
    "kimi-client",
    CATALOG_FILENAME
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
