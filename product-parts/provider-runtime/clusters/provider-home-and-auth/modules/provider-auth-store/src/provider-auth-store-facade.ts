import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { ProviderId } from "../../../../provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export interface ProviderSystemSettings {
  apiKey?: string;
  baseUrl?: string;
  configPath?: string;
  defaultModel?: string;
  endpointTag?: string;
  model?: string;
}

const PROVIDER_SETTING_ALIASES: Partial<Record<ProviderId, string[]>> = {
  "glm-native": ["glmNative", "glm-native", "glm"],
  // Universal-client Kimi endpoint: the Kimi Code subscription key lives in
  // Core settings; the canonical source is a key pasted from Kimi Code Console.
  "glm-client": ["glmClient", "glm-client"],
  "kimi-client": ["kimiClient", "kimi-client"],
  "local-models": ["localModels", "local-models", "local"],
  // Universal-client Local Models endpoint: same local server connection as
  // the legacy id, so the file aliases and env fallbacks match.
  "local-models-client": ["localModels", "local-models", "local"],
  openrouter: ["openRouter", "openrouter"],
  // Universal-client OpenRouter endpoint: the SAME shared OpenRouter
  // connection (one key serves sessions and the translation engine).
  "openrouter-client": ["openRouter", "openrouter"],
};

export class ProviderAuthStoreFacade {
  getProviderSettings(providerId: ProviderId): ProviderSystemSettings {
    return {
      ...readGlobalProviderSettings(providerId),
      ...readProviderSettings(providerId),
    };
  }

  getApiKey(providerId: ProviderId): string | null {
    const env = process.env;
    const keys: Partial<Record<ProviderId, string[]>> = {
      "glm-native": ["GLM_API_KEY", "ZAI_API_KEY"],
      "glm-client": ["GLM_API_KEY", "ZAI_API_KEY"],
      "kimi-client": ["KIMI_API_KEY"],
      "local-models": ["HARNESS_AI_LOCAL_API_KEY", "LMSTUDIO_API_KEY"],
      "local-models-client": ["HARNESS_AI_LOCAL_API_KEY", "LMSTUDIO_API_KEY"],
      openrouter: ["OPENROUTER_API_KEY"],
      "openrouter-client": ["OPENROUTER_API_KEY"],
    };
    const settings = this.getProviderSettings(providerId);
    const fromSettings = firstText(settings.apiKey);
    if (fromSettings) {
      return fromSettings;
    }
    for (const key of keys[providerId] ?? []) {
      const value = env[key]?.trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  getBaseUrl(providerId: ProviderId): string | null {
    const env = process.env;
    const urls: Partial<Record<ProviderId, string[]>> = {
      "glm-native": ["GLM_BASE_URL", "ZAI_BASE_URL"],
      "local-models": ["HARNESS_AI_LOCAL_MODELS_BASE_URL", "LMSTUDIO_BASE_URL"],
      "local-models-client": [
        "HARNESS_AI_LOCAL_MODELS_BASE_URL",
        "LMSTUDIO_BASE_URL",
      ],
      openrouter: ["OPENROUTER_BASE_URL"],
      "openrouter-client": ["OPENROUTER_BASE_URL"],
    };
    const settings = this.getProviderSettings(providerId);
    const fromSettings = firstText(settings.baseUrl);
    if (fromSettings) {
      return fromSettings;
    }
    for (const key of urls[providerId] ?? []) {
      const value = env[key]?.trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  getModel(providerId: ProviderId): string | null {
    const settings = this.getProviderSettings(providerId);
    return firstText(settings.defaultModel, settings.model);
  }

  saveProviderSettings(
    providerId: ProviderId,
    patch: ProviderSystemSettings
  ): ProviderSystemSettings {
    const next = { ...this.getProviderSettings(providerId) };
    for (const key of [
      "apiKey",
      "baseUrl",
      "configPath",
      "defaultModel",
      "endpointTag",
    ] as const) {
      if (!Object.hasOwn(patch, key)) {
        continue;
      }
      const value = firstText(patch[key]);
      if (value) {
        next[key] = value;
      } else {
        next[key] = undefined;
      }
    }
    next.model = undefined;
    const filePath = providerSettingsPath(providerId);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  }
}

export const providerAuthStoreFacade = new ProviderAuthStoreFacade();

function readProviderSettings(providerId: ProviderId): ProviderSystemSettings {
  return normalizeProviderSettings(readJson(providerSettingsPath(providerId)));
}

function readGlobalProviderSettings(
  providerId: ProviderId
): ProviderSystemSettings {
  const globalSettings = readRecord(
    readJson(path.join(harnessHome(), "settings", "settings.json"))
  );
  const providers = readRecord(globalSettings?.providers);
  for (const key of PROVIDER_SETTING_ALIASES[providerId] ?? [providerId]) {
    const settings = normalizeProviderSettings(providers?.[key]);
    if (Object.keys(settings).length > 0) {
      return settings;
    }
  }
  return {};
}

function providerSettingsPath(providerId: ProviderId): string {
  return path.join(harnessHome(), "providers", providerId, "settings.json");
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}

function normalizeProviderSettings(value: unknown): ProviderSystemSettings {
  const record = readRecord(value);
  if (!record) {
    return {};
  }
  const settings: ProviderSystemSettings = {};
  const apiKey = firstText(record.apiKey);
  const baseUrl = firstText(record.baseUrl);
  const configPath = firstText(record.configPath);
  const defaultModel = firstText(record.defaultModel);
  const endpointTag = firstText(record.endpointTag);
  const model = firstText(record.model);
  if (apiKey) {
    settings.apiKey = apiKey;
  }
  if (baseUrl) {
    settings.baseUrl = baseUrl;
  }
  if (configPath) {
    settings.configPath = configPath;
  }
  if (defaultModel) {
    settings.defaultModel = defaultModel;
  }
  if (endpointTag) {
    settings.endpointTag = endpointTag;
  }
  if (model) {
    settings.model = model;
  }
  return settings;
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
