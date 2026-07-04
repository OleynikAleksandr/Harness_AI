import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { normalizeSettings } from "./settings-normalization.js";
import {
  logCoreSettingsSnapshot,
  systemSettingsPath,
  workspaceSettingsPath,
} from "./settings-store-logger.js";
import {
  systemSettingsFrom,
  workspaceSettingsFrom,
} from "./settings-store-projections.js";

export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";
export type ReasoningEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultracode";

export interface LocalizationCategorySettings {
  artifactsForTheUser: string;
  interactiveTemplates: string;
  messagesForTheUser: string;
  reasoning: string;
  systemFeedback: string;
  uiHelperText: string;
  uiInterface: string;
  uiLabels: string;
  userGuidance: string;
  workflowTerms: string;
}

export interface HarnessSettings {
  general: {
    coreControls: { allowRestart: boolean };
    localization: {
      categories: LocalizationCategorySettings;
      defaultLanguage: string;
      engineId: string;
      glossaryEnabled: boolean;
      reasoningEngineId: string;
      uiEngineId: string;
      workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
    };
  };
  providers: {
    claude: ProviderCommonSettings & {
      thinking: { enabled: boolean; effort: ReasoningEffort };
      thinkingByModel: Record<string, ReasoningEffort>;
    };
    codex: ProviderCommonSettings & {
      reasoningByModel: Record<string, ReasoningEffort>;
      reasoningSummaryEnabled: boolean;
    };
    kimi: ProviderCommonSettings & {
      thinkingEnabled: boolean;
    };
    kimiClient: ProviderClientKeySettings;
    glmNative: ProviderConnectionSettings & {
      reasoningEffort: ReasoningEffort;
      thinkingEnabled: boolean;
      thinkingDisplaySyncEnabled: boolean;
    };
    glmOpenCode: ProviderConnectionSettings & {
      configPath: string;
      thinkingDisplaySyncEnabled: boolean;
    };
    localModels: {
      defaultModel: string;
    };
    openRouter: ProviderConnectionSettings & {
      endpointTag: string;
      translationProfiles: {
        reasoningTranslation: OpenRouterTranslationProfile;
        uiTranslation: OpenRouterTranslationProfile;
      };
    };
  };
}

export type SettingsPatch = DeepPartial<HarnessSettings>;
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export interface ProviderCommonSettings {
  autoUpdate: { enabled: boolean };
  defaultModel: string;
  sessionContinuity: { remainingPercentThreshold: number };
  thinkingDisplaySyncEnabled: boolean;
}

export interface ProviderConnectionSettings {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

// Universal-client endpoint providers: key-only onboarding, the base URL is
// Core-owned (dialect profile), and the model catalog is Core-owned too.
interface ProviderClientKeySettings {
  apiKey: string;
  defaultModel: string;
}

interface OpenRouterTranslationProfile {
  endpointTag: string;
  model: string;
}

const DEFAULT_LANGUAGE = "en";
const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.harness-ai/providers/opencode/config.json";
const DEFAULT_SETTINGS: HarnessSettings = {
  general: {
    coreControls: { allowRestart: true },
    localization: {
      categories: {
        artifactsForTheUser: DEFAULT_LANGUAGE,
        interactiveTemplates: DEFAULT_LANGUAGE,
        messagesForTheUser: DEFAULT_LANGUAGE,
        reasoning: DEFAULT_LANGUAGE,
        systemFeedback: DEFAULT_LANGUAGE,
        uiHelperText: DEFAULT_LANGUAGE,
        uiInterface: DEFAULT_LANGUAGE,
        uiLabels: DEFAULT_LANGUAGE,
        userGuidance: DEFAULT_LANGUAGE,
        workflowTerms: DEFAULT_LANGUAGE,
      },
      defaultLanguage: DEFAULT_LANGUAGE,
      engineId: "google-gtx",
      glossaryEnabled: true,
      reasoningEngineId: "google-gtx",
      uiEngineId: "google-gtx",
      workflowTermsPolicy: "keep_english",
    },
  },
  providers: {
    claude: {
      ...commonProvider("sonnet"),
      thinking: { enabled: true, effort: "medium" },
      thinkingByModel: { sonnet: "medium" },
    },
    codex: {
      ...commonProvider("gpt-5.4-mini"),
      reasoningByModel: { "gpt-5.4-mini": "medium" },
      reasoningSummaryEnabled: true,
    },
    kimi: {
      ...commonProvider("kimi-k2.7-code"),
      thinkingEnabled: true,
    },
    kimiClient: {
      apiKey: "",
      defaultModel: "kimi-for-coding",
    },
    glmNative: {
      ...connectionProvider("glm-5.2", "https://open.bigmodel.cn/api/paas/v4"),
      reasoningEffort: "max",
      thinkingDisplaySyncEnabled: true,
      thinkingEnabled: true,
    },
    glmOpenCode: {
      ...connectionProvider("zai-coding-plan/glm-5.2", ""),
      configPath: DEFAULT_GLM_OPENCODE_CONFIG_PATH,
      thinkingDisplaySyncEnabled: true,
    },
    localModels: {
      defaultModel: "local-model",
    },
    openRouter: {
      ...connectionProvider(
        "openrouter-default",
        "https://openrouter.ai/api/v1"
      ),
      endpointTag: "default",
      translationProfiles: {
        reasoningTranslation: {
          endpointTag: "default",
          model: "openrouter-default",
        },
        uiTranslation: { endpointTag: "default", model: "openrouter-default" },
      },
    },
  },
};

const PROVIDER_KEY_BY_ID: Record<
  ProviderId,
  keyof HarnessSettings["providers"]
> = {
  claude: "claude",
  codex: "codex",
  kimi: "kimi",
  "kimi-client": "kimiClient",
  "glm-native": "glmNative",
  "glm-opencode": "glmOpenCode",
  openrouter: "openRouter",
  "local-models": "localModels",
};

export class SettingsStoreFacade {
  getSettings(workspacePath?: string): HarnessSettings {
    const settings = normalizeSettings(
      mergeSettings(
        DEFAULT_SETTINGS,
        readJson(systemSettingsPath()),
        providerAuthOverlay(),
        workspacePath ? readJson(workspaceSettingsPath(workspacePath)) : null
      )
    );
    logCoreSettingsSnapshot("settings.get", workspacePath, settings);
    return settings;
  }

  getProviderModel(
    providerId: ProviderId,
    workspacePath?: string
  ): { providerId: ProviderId; selectedModel: string } {
    const settings = this.getSettings(workspacePath);
    const provider = settings.providers[PROVIDER_KEY_BY_ID[providerId]];
    const selectedModel =
      "defaultModel" in provider ? provider.defaultModel : "sonnet";
    return {
      providerId,
      selectedModel: firstText(selectedModel) ?? "sonnet",
    };
  }

  getLocalizationTranslationEngines(workspacePath?: string): {
    reasoningEngineId: string;
    uiEngineId: string;
  } {
    const localization = this.getSettings(workspacePath).general.localization;
    return {
      reasoningEngineId: localization.reasoningEngineId,
      uiEngineId: localization.uiEngineId,
    };
  }

  shouldSyncLocalization(
    previous: HarnessSettings,
    next: HarnessSettings
  ): boolean {
    return localizationSyncKey(previous) !== localizationSyncKey(next);
  }

  resetWorkspaceSettings(workspacePath?: string): HarnessSettings {
    logCoreSettingsSnapshot("settings.reset", workspacePath);
    if (workspacePath) {
      rmSync(workspaceSettingsPath(workspacePath), { force: true });
    }
    return this.getSettings(workspacePath);
  }

  saveSettings(
    settings: HarnessSettings,
    workspacePath?: string
  ): HarnessSettings {
    const next = normalizeSettings(mergeSettings(DEFAULT_SETTINGS, settings));
    logCoreSettingsSnapshot("settings.save.requested", workspacePath, next);
    writeJson(systemSettingsPath(), systemSettingsFrom(next));
    if (workspacePath) {
      writeJson(
        workspaceSettingsPath(workspacePath),
        workspaceSettingsFrom(next)
      );
    }
    syncProviderAuthFiles(next);
    const saved = this.getSettings(workspacePath);
    logCoreSettingsSnapshot("settings.save.completed", workspacePath, saved);
    return saved;
  }
}

export const settingsStoreFacade = new SettingsStoreFacade();

function commonProvider(defaultModel: string): ProviderCommonSettings {
  return {
    autoUpdate: { enabled: false },
    defaultModel,
    sessionContinuity: { remainingPercentThreshold: 30 },
    thinkingDisplaySyncEnabled: true,
  };
}

function connectionProvider(
  defaultModel: string,
  baseUrl: string
): ProviderConnectionSettings {
  return {
    apiKey: "",
    baseUrl,
    defaultModel,
  };
}

function providerAuthOverlay(): SettingsPatch {
  return {
    providers: {
      glmNative: providerSettingsOverlay("glm-native"),
      glmOpenCode: providerSettingsOverlay("glm-opencode"),
      kimiClient: providerSettingsOverlay("kimi-client"),
      localModels: providerSettingsOverlay("local-models"),
      openRouter: providerSettingsOverlay("openrouter"),
    },
  };
}

function providerSettingsOverlay(
  providerId: ProviderId
): Record<string, string> {
  const settings = providerAuthStoreFacade.getProviderSettings(providerId);
  return compactRecord({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    configPath: settings.configPath,
    defaultModel: settings.defaultModel ?? settings.model,
    endpointTag: settings.endpointTag,
  });
}

function syncProviderAuthFiles(settings: HarnessSettings): void {
  providerAuthStoreFacade.saveProviderSettings(
    "glm-native",
    settings.providers.glmNative
  );
  providerAuthStoreFacade.saveProviderSettings(
    "glm-opencode",
    settings.providers.glmOpenCode
  );
  providerAuthStoreFacade.saveProviderSettings(
    "kimi-client",
    settings.providers.kimiClient
  );
  providerAuthStoreFacade.saveProviderSettings(
    "local-models",
    settings.providers.localModels
  );
  providerAuthStoreFacade.saveProviderSettings(
    "openrouter",
    settings.providers.openRouter
  );
}

function mergeSettings(...sources: unknown[]): HarnessSettings {
  let next: unknown = structuredClone(DEFAULT_SETTINGS);
  for (const source of sources) {
    next = mergeRecord(next, source);
  }
  return normalizeLocalizationEngineIds(next as HarnessSettings);
}

function normalizeLocalizationEngineIds(
  settings: HarnessSettings
): HarnessSettings {
  const localization = settings.general.localization;
  const uiEngineId =
    firstText(localization.uiEngineId, localization.engineId) ?? "google-gtx";
  localization.uiEngineId = uiEngineId;
  localization.engineId = uiEngineId;
  localization.reasoningEngineId =
    firstText(localization.reasoningEngineId) ?? "google-gtx";
  return settings;
}

function localizationSyncKey(settings: HarnessSettings): string {
  const localization = settings.general.localization;
  const { reasoning: _reasoning, ...uiCategories } = localization.categories;
  return JSON.stringify({
    categories: uiCategories,
    defaultLanguage: localization.defaultLanguage,
    glossaryEnabled: localization.glossaryEnabled,
    uiEngineId: localization.uiEngineId,
    workflowTermsPolicy: localization.workflowTermsPolicy,
  });
}

function mergeRecord(base: unknown, patch: unknown): unknown {
  if (!(isRecord(base) && isRecord(patch))) {
    return patch ?? base;
  }
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    next[key] =
      isRecord(value) && isRecord(next[key])
        ? mergeRecord(next[key], value)
        : value;
  }
  return next;
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function compactRecord(
  values: Record<string, unknown>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const text = firstText(value);
      return text ? [[key, text]] : [];
    })
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstText(...values: unknown[]): string | null {
  return (
    values
      .find(
        (value): value is string =>
          typeof value === "string" && Boolean(value.trim())
      )
      ?.trim() ?? null
  );
}
