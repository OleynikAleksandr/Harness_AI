import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { normalizeSettings } from "./settings-normalization.js";

export interface ProviderModelSetting {
  providerId: ProviderId;
  selectedModel: string;
}

export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max";

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
      workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
    };
  };
  providers: {
    claude: ProviderCommonSettings & {
      thinking: { enabled: boolean; effort: ReasoningEffort };
    };
    codex: ProviderCommonSettings & {
      reasoningByModel: Record<string, ReasoningEffort>;
      reasoningSummaryEnabled: boolean;
    };
    kimi: ProviderCommonSettings & {
      thinkingEnabled: boolean;
    };
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

type SettingsPatch = DeepPartial<HarnessSettings>;
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

interface ProviderCommonSettings {
  autoUpdate: { enabled: boolean };
  defaultModel: string;
  sessionContinuity: { remainingPercentThreshold: number };
  thinkingDisplaySyncEnabled: boolean;
}

interface ProviderConnectionSettings {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

interface OpenRouterTranslationProfile {
  endpointTag: string;
  model: string;
}

const DEFAULT_LANGUAGE = "en";
const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/opencode/config.json";
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
      workflowTermsPolicy: "keep_english",
    },
  },
  providers: {
    claude: {
      ...commonProvider("sonnet"),
      thinking: { enabled: true, effort: "medium" },
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
  "glm-native": "glmNative",
  "glm-opencode": "glmOpenCode",
  openrouter: "openRouter",
  "local-models": "localModels",
};

export class SettingsStoreFacade {
  getSettings(workspacePath?: string): HarnessSettings {
    return normalizeSettings(
      mergeSettings(
        DEFAULT_SETTINGS,
        readJson(systemSettingsPath()),
        providerAuthOverlay(),
        workspacePath ? readJson(workspaceSettingsPath(workspacePath)) : null
      )
    );
  }

  getProviderModel(
    providerId: ProviderId,
    workspacePath?: string
  ): ProviderModelSetting {
    const settings = this.getSettings(workspacePath);
    const provider = settings.providers[PROVIDER_KEY_BY_ID[providerId]];
    return {
      providerId,
      selectedModel: firstText(readRecord(provider)?.defaultModel) ?? "sonnet",
    };
  }

  resetWorkspaceSettings(workspacePath?: string): HarnessSettings {
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
    writeJson(systemSettingsPath(), systemSettingsFrom(next));
    if (workspacePath) {
      writeJson(
        workspaceSettingsPath(workspacePath),
        workspaceSettingsFrom(next)
      );
    }
    syncProviderAuthFiles(next);
    return this.getSettings(workspacePath);
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

function systemSettingsFrom(settings: HarnessSettings): SettingsPatch {
  return {
    general: {
      coreControls: settings.general.coreControls,
      localization: settings.general.localization,
    },
    providers: {
      claude: { autoUpdate: settings.providers.claude.autoUpdate },
      codex: { autoUpdate: settings.providers.codex.autoUpdate },
      kimi: { autoUpdate: settings.providers.kimi.autoUpdate },
      glmNative: pickConnection(settings.providers.glmNative),
      glmOpenCode: {
        ...pickConnection(settings.providers.glmOpenCode),
        configPath: settings.providers.glmOpenCode.configPath,
      },
      localModels: {},
      openRouter: {
        ...pickConnection(settings.providers.openRouter),
        endpointTag: settings.providers.openRouter.endpointTag,
        translationProfiles: settings.providers.openRouter.translationProfiles,
      },
    },
  };
}

function workspaceSettingsFrom(settings: HarnessSettings): SettingsPatch {
  return {
    providers: {
      claude: workspaceCommon(settings.providers.claude),
      codex: {
        ...workspaceCommon(settings.providers.codex),
        reasoningByModel: settings.providers.codex.reasoningByModel,
        reasoningSummaryEnabled:
          settings.providers.codex.reasoningSummaryEnabled,
      },
      kimi: {
        ...workspaceCommon(settings.providers.kimi),
        thinkingEnabled: settings.providers.kimi.thinkingEnabled,
      },
      glmNative: {
        defaultModel: settings.providers.glmNative.defaultModel,
        reasoningEffort: settings.providers.glmNative.reasoningEffort,
        thinkingDisplaySyncEnabled:
          settings.providers.glmNative.thinkingDisplaySyncEnabled,
        thinkingEnabled: settings.providers.glmNative.thinkingEnabled,
      },
      glmOpenCode: {
        defaultModel: settings.providers.glmOpenCode.defaultModel,
        thinkingDisplaySyncEnabled:
          settings.providers.glmOpenCode.thinkingDisplaySyncEnabled,
      },
      localModels: settings.providers.localModels,
      openRouter: { defaultModel: settings.providers.openRouter.defaultModel },
    },
  };
}

function workspaceCommon(
  provider: ProviderCommonSettings
): Partial<ProviderCommonSettings> {
  return {
    defaultModel: provider.defaultModel,
    sessionContinuity: provider.sessionContinuity,
    thinkingDisplaySyncEnabled: provider.thinkingDisplaySyncEnabled,
  };
}

function pickConnection(
  provider: ProviderConnectionSettings
): ProviderConnectionSettings {
  return {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    defaultModel: provider.defaultModel,
  };
}

function providerAuthOverlay(): SettingsPatch {
  return {
    providers: {
      glmNative: providerSettingsOverlay("glm-native"),
      glmOpenCode: providerSettingsOverlay("glm-opencode"),
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
  return next as HarnessSettings;
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
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function systemSettingsPath(): string {
  return path.join(harnessHome(), "settings", "settings.json");
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}

function compactRecord(
  values: Record<string, unknown>
): Record<string, string> {
  const compacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const text = firstText(value);
    if (text) {
      compacted[key] = text;
    }
  }
  return compacted;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
