import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  type ProviderModelDescriptor,
  providerDescriptorFacade,
} from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import { CodexAppServerProcess } from "./reference/app-server/process/codex-app-server-process.js";

// Live Codex model catalog (verified 2026-11-02 on codex-cli 0.166.0): the
// app-server `model/list` request returns every model the signed-in account
// can use with `displayName`, `description`, `hidden`,
// `supportedReasoningEfforts[].reasoningEffort` and `defaultReasoningEffort`.
// Core serves the visible (non-hidden) rows through the provider descriptor,
// so new Codex models appear without a code change. The last successful read
// is persisted under the Harness product home and applied first on every
// start, so an offline start keeps the last known models; the verified
// descriptor list is the fallback when nothing was ever read.

// Reads one `model/list` page; `close` releases the app-server after the read.
type CodexModelPageReader = ((cursor: string | null) => Promise<unknown>) & {
  readonly close?: () => Promise<void>;
};

interface CodexModelCatalogOverrides {
  readonly catalogPath?: string;
  readonly listModels?: CodexModelPageReader;
  readonly now?: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PAGES = 10;
const CATALOG_FILENAME = "model-catalog.json";

let liveExpiresAt = 0;
let persistedCatalogPath: string | null = null;

// Parses `model/list` rows (also the persisted shape). Hidden rows (review
// and reserve models) are not offered.
export function parseCodexModelCatalog(
  rows: unknown
): ProviderModelDescriptor[] {
  const models: ProviderModelDescriptor[] = [];
  if (!Array.isArray(rows)) {
    return models;
  }
  for (const row of rows) {
    if (!isRecord(row) || row.hidden === true) {
      continue;
    }
    const id = nonEmptyString(row.model) ?? nonEmptyString(row.id);
    if (!id) {
      continue;
    }
    const reasoningEfforts = Array.isArray(row.supportedReasoningEfforts)
      ? row.supportedReasoningEfforts.flatMap((option) => {
          const effort = isRecord(option)
            ? nonEmptyString(option.reasoningEffort)
            : null;
          return effort ? [effort] : [];
        })
      : [];
    const defaultEffort = nonEmptyString(row.defaultReasoningEffort);
    const description = nonEmptyString(row.description);
    models.push({
      ...(defaultEffort && reasoningEfforts.includes(defaultEffort)
        ? { defaultReasoningEffort: defaultEffort }
        : {}),
      ...(description ? { description } : {}),
      id,
      label: nonEmptyString(row.displayName) ?? id,
      ...(reasoningEfforts.length > 0 ? { reasoningEfforts } : {}),
    });
  }
  return models;
}

export async function fetchCodexModelCatalog(
  overrides: CodexModelCatalogOverrides = {}
): Promise<ProviderModelDescriptor[] | null> {
  const rows: unknown[] = [];
  const reader = overrides.listModels ?? listModelsThroughAppServer();
  try {
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await reader(cursor);
      if (!(isRecord(response) && Array.isArray(response.data))) {
        return null;
      }
      rows.push(...response.data);
      cursor = nonEmptyString(response.nextCursor);
      if (!cursor) {
        break;
      }
    }
  } catch {
    return null;
  } finally {
    await reader.close?.();
  }
  const models = parseCodexModelCatalog(rows);
  return models.length > 0 ? models : null;
}

// Applies the persisted catalog once per catalog path, then refreshes from
// the app-server when the previous successful read is older than the TTL.
// A successful read is applied to the provider descriptor and persisted; a
// failed one keeps the served catalog and retries on the next call. Core
// calls this on start.
export async function refreshCodexModelCatalog(
  overrides: CodexModelCatalogOverrides = {}
): Promise<readonly ProviderModelDescriptor[]> {
  const catalogPath = overrides.catalogPath ?? defaultCatalogPath();
  if (persistedCatalogPath !== catalogPath) {
    persistedCatalogPath = catalogPath;
    liveExpiresAt = 0;
    providerDescriptorFacade.setCodexModels(readPersistedCatalog(catalogPath));
  }
  const now = overrides.now ?? Date.now();
  if (liveExpiresAt > now) {
    return providerDescriptorFacade.getCodexModels();
  }
  const live = await fetchCodexModelCatalog(overrides);
  if (live) {
    liveExpiresAt = now + CACHE_TTL_MS;
    providerDescriptorFacade.setCodexModels(live);
    writePersistedCatalog(catalogPath, live, now);
  }
  return providerDescriptorFacade.getCodexModels();
}

// One short-lived app-server under the Harness Codex provider home (the same
// signed-in account the sessions use); `close` stops it after the read.
function listModelsThroughAppServer(): CodexModelPageReader {
  const server = new CodexAppServerProcess({
    environment: { CODEX_HOME: defaultCodexHome() },
  });
  const reader = (cursor: string | null) =>
    server.request("model/list", {
      cursor,
      includeHidden: false,
    });
  return Object.assign(reader, { close: () => server.stop() });
}

function readPersistedCatalog(catalogPath: string): ProviderModelDescriptor[] {
  try {
    const stored: unknown = JSON.parse(readFileSync(catalogPath, "utf8"));
    return isRecord(stored) ? parseCodexModelCatalog(stored.data) : [];
  } catch {
    return [];
  }
}

// Persisted in the `model/list` row shape so the same parser reads it back.
function writePersistedCatalog(
  catalogPath: string,
  models: readonly ProviderModelDescriptor[],
  now: number
): void {
  try {
    mkdirSync(path.dirname(catalogPath), { recursive: true });
    const data = models.map((model) => ({
      ...(model.defaultReasoningEffort
        ? { defaultReasoningEffort: model.defaultReasoningEffort }
        : {}),
      ...(model.description ? { description: model.description } : {}),
      displayName: model.label,
      hidden: false,
      model: model.id,
      supportedReasoningEfforts: (model.reasoningEfforts ?? []).map(
        (reasoningEffort) => ({ reasoningEffort })
      ),
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

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}

function defaultCatalogPath(): string {
  return path.join(harnessHome(), "providers", "codex", CATALOG_FILENAME);
}

function defaultCodexHome(): string {
  return path.join(harnessHome(), "providers", "codex", "home");
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
