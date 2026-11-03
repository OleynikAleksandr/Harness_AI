import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type ProviderModelDescriptor,
  providerDescriptorFacade,
} from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import { claudeSdkDirectory, claudeSdkPrefix } from "./claude-sdk-updates.js";
import { resolveClaudeAgentSdkExecutablePath } from "./reference/installer/sdk-executable-path.js";

// Live Claude model catalog (verified 2026-11-03 on Claude Agent SDK
// 0.3.317 from the packaged app's clean GUI environment):
// `query(...).supportedModels()` returns the models the signed-in account can
// pick, each with `value` (the id the SDK accepts as `model`),
// `displayName`, `description` and `supportedEffortLevels`. Core serves the
// family alias rows through the provider descriptor, so new Claude releases
// replace the labels without a code change. A process started inside a
// Claude Code session inherits that session's environment and receives a
// reduced list; the packaged app does not. The read runs the global npm SDK
// the sessions use (`claude-sdk-updates`) under the Harness Claude provider
// home with CLI auth, like the sessions do. The last successful read is
// persisted under the Harness product home and applied first on every start;
// the verified descriptor list is the fallback when nothing was ever read.

type ClaudeModelReader = () => Promise<unknown>;

interface ClaudeModelCatalogOverrides {
  readonly catalogPath?: string;
  // Re-read even inside the TTL (after the Harness SDK was updated).
  readonly force?: boolean;
  readonly listModels?: ClaudeModelReader;
  readonly now?: number;
}

interface ClaudeSdkQuery {
  close?: () => void;
  supportedModels: () => Promise<unknown>;
}

interface ClaudeSdkModule {
  query: (request: {
    options: Record<string, unknown>;
    prompt: AsyncIterable<unknown>;
  }) => ClaudeSdkQuery;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const READ_TIMEOUT_MS = 30_000;
const CATALOG_FILENAME = "model-catalog.json";
const DEFAULT_ALIAS_VALUE = "default";
// Claude 1M-context ids carry a `[1m]` suffix (`opus[1m]`).
const CONTEXT_SUFFIX_PATTERN = /\[[^\]]*\]$/u;
const VERSION_DIGIT_PATTERN = /\d/u;

let liveExpiresAt = 0;
let persistedCatalogPath: string | null = null;

// Parses `supportedModels()` rows (also the persisted shape). Only the
// family aliases are served (user decision 2026-11-03): `opus`, `fable`,
// `sonnet`, `haiku` always resolve to Anthropic's newest model of the family
// and their display names carry its version ("Opus 5.5"), while pinned rows
// (`claude-opus-4-8`, ids with a version once the context suffix is dropped)
// are skipped. The `default` row only aliases the recommended model.
export function parseClaudeModelCatalog(
  rows: unknown
): ProviderModelDescriptor[] {
  const models: ProviderModelDescriptor[] = [];
  if (!Array.isArray(rows)) {
    return models;
  }
  for (const row of rows) {
    const id = isRecord(row) ? nonEmptyString(row.value) : null;
    if (!(isRecord(row) && id) || id === DEFAULT_ALIAS_VALUE || !isAlias(id)) {
      continue;
    }
    const reasoningEfforts = Array.isArray(row.supportedEffortLevels)
      ? row.supportedEffortLevels.filter(
          (effort): effort is string =>
            typeof effort === "string" && effort.length > 0
        )
      : [];
    const description = nonEmptyString(row.description);
    models.push({
      ...(description ? { description } : {}),
      id,
      label: nonEmptyString(row.displayName) ?? id,
      ...(reasoningEfforts.length > 0 ? { reasoningEfforts } : {}),
    });
  }
  return models;
}

export async function fetchClaudeModelCatalog(
  overrides: ClaudeModelCatalogOverrides = {}
): Promise<ProviderModelDescriptor[] | null> {
  try {
    const models = parseClaudeModelCatalog(
      await (overrides.listModels ?? listModelsThroughSdk)()
    );
    return models.length > 0 ? models : null;
  } catch {
    return null;
  }
}

// Applies the persisted catalog once per catalog path, then refreshes from
// the SDK when the previous successful read is older than the TTL. A
// successful read is applied to the provider descriptor and persisted; a
// failed one keeps the served catalog and retries on the next call. Core
// calls this on start, and with `force` right after a Harness SDK update so
// the new SDK's model descriptions replace the memoized ones.
export async function refreshClaudeModelCatalog(
  overrides: ClaudeModelCatalogOverrides = {}
): Promise<readonly ProviderModelDescriptor[]> {
  const catalogPath = overrides.catalogPath ?? defaultCatalogPath();
  if (persistedCatalogPath !== catalogPath) {
    persistedCatalogPath = catalogPath;
    liveExpiresAt = 0;
    providerDescriptorFacade.setClaudeModels(readPersistedCatalog(catalogPath));
  }
  const now = overrides.now ?? Date.now();
  if (!overrides.force && liveExpiresAt > now) {
    return providerDescriptorFacade.getClaudeModels();
  }
  const live = await fetchClaudeModelCatalog(overrides);
  if (live) {
    liveExpiresAt = now + CACHE_TTL_MS;
    providerDescriptorFacade.setClaudeModels(live);
    writePersistedCatalog(catalogPath, live, now);
  }
  return providerDescriptorFacade.getClaudeModels();
}

// One idle SDK query (no prompt is ever sent) under the Harness Claude
// provider home: the CLI answers `supportedModels()` from its initialize
// handshake, then the query is closed.
async function listModelsThroughSdk(): Promise<unknown> {
  const sdkDirectory = claudeSdkDirectory();
  // Native import: a transpiled direct import(file://) would become require.
  const dynamicImport = new Function("url", "return import(url);") as (
    url: string
  ) => Promise<ClaudeSdkModule>;
  const sdk = await dynamicImport(
    pathToFileURL(path.join(sdkDirectory, "sdk.mjs")).href
  );
  const {
    ANTHROPIC_API_KEY: _apiKey,
    CLAUDECODE: _claudeCode,
    ...environment
  } = process.env;
  const query = sdk.query({
    options: {
      cwd: homedir(),
      env: {
        ...environment,
        CLAUDE_SUBSCRIPTION_MODE: "true",
        CLAUDE_USE_CLI_AUTH: "true",
        HOME: path.join(harnessHome(), "providers", "claude", "home"),
      },
      pathToClaudeCodeExecutable: resolveClaudeAgentSdkExecutablePath({
        arch: process.arch,
        moduleDirectory: sdkDirectory,
        npmPrefix: claudeSdkPrefix(),
        platform: process.platform,
      }),
      settingSources: [],
    },
    prompt: idlePrompt(),
  });
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      query.supportedModels(),
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Claude model list timed out")),
          READ_TIMEOUT_MS
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    clearTimeout(timer);
    query.close?.();
  }
}

async function* idlePrompt(): AsyncIterable<unknown> {
  await new Promise(() => undefined);
}

function readPersistedCatalog(catalogPath: string): ProviderModelDescriptor[] {
  try {
    const stored: unknown = JSON.parse(readFileSync(catalogPath, "utf8"));
    return isRecord(stored) ? parseClaudeModelCatalog(stored.data) : [];
  } catch {
    return [];
  }
}

// Persisted in the `supportedModels()` row shape so the same parser reads it.
function writePersistedCatalog(
  catalogPath: string,
  models: readonly ProviderModelDescriptor[],
  now: number
): void {
  try {
    mkdirSync(path.dirname(catalogPath), { recursive: true });
    const data = models.map((model) => ({
      ...(model.description ? { description: model.description } : {}),
      displayName: model.label,
      ...(model.reasoningEfforts
        ? { supportedEffortLevels: model.reasoningEfforts }
        : {}),
      value: model.id,
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
  return path.join(harnessHome(), "providers", "claude", CATALOG_FILENAME);
}

function isAlias(id: string): boolean {
  return !VERSION_DIGIT_PATTERN.test(id.replace(CONTEXT_SUFFIX_PATTERN, ""));
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
