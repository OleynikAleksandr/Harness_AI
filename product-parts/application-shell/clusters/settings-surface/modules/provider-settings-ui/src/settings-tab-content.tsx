import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { LocalizationSettingsUiFacade } from "../../localization-settings-ui/src/localization-settings-ui-facade.js";
import { RecoveryControlsUiFacade } from "../../recovery-controls-ui/src/recovery-controls-ui-facade.js";
import {
  ConnectionFields,
  ContinuityRange,
  EffortSelect,
  ModelSelect,
  ProviderCard,
  ProviderChecks,
  TextField
} from "./settings-controls.js";
import {
  PROVIDER_MODEL_OPTIONS,
  type SettingsTabId
} from "./settings-model-options.js";

interface SettingsTabContentProps {
  activeTab: SettingsTabId;
  coreRestartBusy: boolean;
  coreRestartStatus: string;
  onRestartCore: () => void;
  settings: HarnessSettings;
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function SettingsTabContent({
  activeTab,
  coreRestartBusy,
  coreRestartStatus,
  onRestartCore,
  settings,
  update
}: SettingsTabContentProps) {
  if (activeTab === "general") {
    return (
      <div className="settings-stack">
        <RecoveryControlsUiFacade
          allowRestart={settings.general.coreControls.allowRestart}
          busy={coreRestartBusy}
          onAllowRestartChange={(allowRestart) =>
            update((next) => {
              next.general.coreControls.allowRestart = allowRestart;
            })
          }
          onRestart={onRestartCore}
          status={coreRestartStatus}
        />
        <LocalizationSettingsUiFacade
          localization={settings.general.localization}
          onChange={(localization) =>
            update((next) => {
              next.general.localization = localization;
            })
          }
        />
      </div>
    );
  }

  if (activeTab === "claude") {
    const provider = settings.providers.claude;
    return (
      <ProviderCard title="Claude">
        <ModelSelect
          options={PROVIDER_MODEL_OPTIONS.claude}
          value={provider.defaultModel}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.claude.defaultModel = defaultModel;
            })
          }
        />
        <ContinuityRange
          value={provider.sessionContinuity.remainingPercentThreshold}
          onChange={(value) =>
            update((next) => {
              next.providers.claude.sessionContinuity.remainingPercentThreshold =
                value;
            })
          }
        />
        <EffortSelect
          label="Thinking Effort"
          value={provider.thinking.effort}
          onChange={(effort) =>
            update((next) => {
              next.providers.claude.thinking.effort = effort;
            })
          }
        />
        <ProviderChecks
          autoUpdate={provider.autoUpdate.enabled}
          thinkingDisplay={provider.thinkingDisplaySyncEnabled}
          onAutoUpdate={(enabled) =>
            update((next) => {
              next.providers.claude.autoUpdate.enabled = enabled;
            })
          }
          onThinkingDisplay={(enabled) =>
            update((next) => {
              next.providers.claude.thinkingDisplaySyncEnabled = enabled;
            })
          }
        />
      </ProviderCard>
    );
  }

  if (activeTab === "codex") {
    const provider = settings.providers.codex;
    const reasoning = provider.reasoningByModel[provider.defaultModel] ?? "medium";
    return (
      <ProviderCard title="Codex">
        <ModelSelect
          options={PROVIDER_MODEL_OPTIONS.codex}
          value={provider.defaultModel}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.codex.defaultModel = defaultModel;
            })
          }
        />
        <ContinuityRange
          value={provider.sessionContinuity.remainingPercentThreshold}
          onChange={(value) =>
            update((next) => {
              next.providers.codex.sessionContinuity.remainingPercentThreshold =
                value;
            })
          }
        />
        <EffortSelect
          label="Reasoning"
          value={reasoning}
          onChange={(effort) =>
            update((next) => {
              next.providers.codex.reasoningByModel[provider.defaultModel] = effort;
            })
          }
        />
        <label className="settings-check">
          <input
            checked={provider.reasoningSummaryEnabled}
            type="checkbox"
            onChange={(event) =>
              update((next) => {
                next.providers.codex.reasoningSummaryEnabled =
                  event.target.checked;
              })
            }
          />
          <span>Reasoning Summary</span>
        </label>
      </ProviderCard>
    );
  }

  if (activeTab === "kimi") {
    const provider = settings.providers.kimi;
    return (
      <ProviderCard title="Kimi">
        <ModelSelect
          options={PROVIDER_MODEL_OPTIONS.kimi}
          value={provider.defaultModel}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.kimi.defaultModel = defaultModel;
            })
          }
        />
        <ProviderChecks
          autoUpdate={provider.autoUpdate.enabled}
          thinkingDisplay={provider.thinkingDisplaySyncEnabled}
          thinkingEnabled={provider.thinkingEnabled}
          onAutoUpdate={(enabled) =>
            update((next) => {
              next.providers.kimi.autoUpdate.enabled = enabled;
            })
          }
          onThinkingDisplay={(enabled) =>
            update((next) => {
              next.providers.kimi.thinkingDisplaySyncEnabled = enabled;
            })
          }
          onThinkingEnabled={(enabled) =>
            update((next) => {
              next.providers.kimi.thinkingEnabled = enabled;
            })
          }
        />
      </ProviderCard>
    );
  }

  if (activeTab === "glmNative") {
    const provider = settings.providers.glmNative;
    return (
      <ProviderCard title="GLM">
        <ConnectionFields
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          model={provider.defaultModel}
          modelOptions={PROVIDER_MODEL_OPTIONS.glmNative}
          onChange={(patch) =>
            update((next) => {
              Object.assign(next.providers.glmNative, patch);
            })
          }
        />
        <EffortSelect
          label="Reasoning Effort"
          value={provider.reasoningEffort}
          onChange={(reasoningEffort) =>
            update((next) => {
              next.providers.glmNative.reasoningEffort = reasoningEffort;
            })
          }
        />
        <ProviderChecks
          thinkingDisplay={provider.thinkingDisplaySyncEnabled}
          thinkingEnabled={provider.thinkingEnabled}
          onThinkingDisplay={(enabled) =>
            update((next) => {
              next.providers.glmNative.thinkingDisplaySyncEnabled = enabled;
            })
          }
          onThinkingEnabled={(enabled) =>
            update((next) => {
              next.providers.glmNative.thinkingEnabled = enabled;
            })
          }
        />
      </ProviderCard>
    );
  }

  if (activeTab === "glmOpenCode") {
    const provider = settings.providers.glmOpenCode;
    return (
      <ProviderCard title="OpenCode">
        <ConnectionFields
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          model={provider.defaultModel}
          modelOptions={PROVIDER_MODEL_OPTIONS.glmOpenCode}
          onChange={(patch) =>
            update((next) => {
              Object.assign(next.providers.glmOpenCode, patch);
            })
          }
        />
        <TextField
          label="Config Path"
          value={provider.configPath}
          onChange={(configPath) =>
            update((next) => {
              next.providers.glmOpenCode.configPath = configPath;
            })
          }
        />
      </ProviderCard>
    );
  }

  if (activeTab === "localModels") {
    return (
      <ProviderCard title="Local Models">
        <TextField
          label="Default Model"
          value={settings.providers.localModels.defaultModel}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.localModels.defaultModel = defaultModel;
            })
          }
        />
      </ProviderCard>
    );
  }

  const provider = settings.providers.openRouter;
  return (
    <ProviderCard title="OpenRouter">
      <ConnectionFields
        apiKey={provider.apiKey}
        baseUrl={provider.baseUrl}
        model={provider.defaultModel}
        onChange={(patch) =>
          update((next) => {
            Object.assign(next.providers.openRouter, patch);
          })
        }
      />
      <TextField
        label="Endpoint Tag"
        value={provider.endpointTag}
        onChange={(endpointTag) =>
          update((next) => {
            next.providers.openRouter.endpointTag = endpointTag;
          })
        }
      />
      <TextField
        label="UI Translation Model"
        value={provider.translationProfiles.uiTranslation.model}
        onChange={(model) =>
          update((next) => {
            next.providers.openRouter.translationProfiles.uiTranslation.model =
              model;
          })
        }
      />
      <TextField
        label="Reasoning Translation Model"
        value={provider.translationProfiles.reasoningTranslation.model}
        onChange={(model) =>
          update((next) => {
            next.providers.openRouter.translationProfiles.reasoningTranslation.model =
              model;
          })
        }
      />
    </ProviderCard>
  );
}
