// Projection shapes the settings store persists: which slice of the merged
// HarnessSettings goes into the system settings file and which into the
// workspace settings file. Split from the facade for the 500-line cap.

import type {
  HarnessSettings,
  ProviderCommonSettings,
  ProviderConnectionSettings,
  SettingsPatch,
} from "./settings-store-facade.js";

export function systemSettingsFrom(settings: HarnessSettings): SettingsPatch {
  return {
    general: {
      coreControls: settings.general.coreControls,
      localization: settings.general.localization,
    },
    providers: {
      claude: { autoUpdate: settings.providers.claude.autoUpdate },
      codex: { autoUpdate: settings.providers.codex.autoUpdate },
      kimi: { autoUpdate: settings.providers.kimi.autoUpdate },
      kimiClient: {
        apiKey: settings.providers.kimiClient.apiKey,
        defaultModel: settings.providers.kimiClient.defaultModel,
      },
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

export function workspaceSettingsFrom(
  settings: HarnessSettings
): SettingsPatch {
  return {
    providers: {
      claude: {
        ...workspaceCommon(settings.providers.claude),
        thinking: settings.providers.claude.thinking,
        thinkingByModel: settings.providers.claude.thinkingByModel,
      },
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
