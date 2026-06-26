import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  PROVIDER_MODEL_OPTIONS,
  REASONING_EFFORT_OPTIONS,
  type SettingsTabId,
} from "./settings-model-options.js";
import {
  ManualIntegerField,
  ModelRows,
  SettingsCard,
  SettingsSelect,
  SettingsTextField,
  SettingsToggle,
} from "./settings-reference-controls.js";
import { ReferenceGeneralSettings } from "./settings-reference-general.js";

interface SettingsTabContentProps {
  activeTab: SettingsTabId;
  coreRestartBusy: boolean;
  coreRestartStatus: string;
  onOpenGlossary: () => void;
  onRestartCore: () => void;
  settings: HarnessSettings;
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function SettingsTabContent({
  activeTab,
  coreRestartBusy,
  coreRestartStatus,
  onOpenGlossary,
  onRestartCore,
  settings,
  update,
}: SettingsTabContentProps) {
  if (activeTab === "general") {
    return (
      <ReferenceGeneralSettings
        coreRestartBusy={coreRestartBusy}
        coreRestartStatus={coreRestartStatus}
        onOpenGlossary={onOpenGlossary}
        onRestartCore={onRestartCore}
        settings={settings}
        update={update}
      />
    );
  }

  if (activeTab === "claude") {
    const provider = settings.providers.claude;
    return (
      <div className="settings-reference-stack">
        <DefaultModelCard
          description="Choose the Claude alias that will be applied when new sessions start."
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.claude.defaultModel = defaultModel;
            })
          }
          options={PROVIDER_MODEL_OPTIONS.claude}
          title="Claude Default model"
          value={provider.defaultModel}
        />
        <SessionContinuityCard
          onChange={(value) =>
            update((next) => {
              next.providers.claude.sessionContinuity.remainingPercentThreshold =
                value;
            })
          }
          title="Claude Session Continuity"
          value={provider.sessionContinuity.remainingPercentThreshold}
        />
        <SettingsCard title="Thinking">
          <SettingsSelect
            label="Thinking Effort"
            onChange={(effort) =>
              update((next) => {
                next.providers.claude.thinking.effort =
                  effort as HarnessSettings["providers"]["claude"]["thinking"]["effort"];
              })
            }
            options={REASONING_EFFORT_OPTIONS}
            value={provider.thinking.effort}
          />
          <SettingsToggle
            checked={provider.thinkingDisplaySyncEnabled}
            label="Thinking Display Sync"
            onChange={(enabled) =>
              update((next) => {
                next.providers.claude.thinkingDisplaySyncEnabled = enabled;
              })
            }
          />
        </SettingsCard>
        <ProviderUpdatesCard
          autoUpdate={provider.autoUpdate.enabled}
          onChange={(enabled) =>
            update((next) => {
              next.providers.claude.autoUpdate.enabled = enabled;
            })
          }
        />
      </div>
    );
  }

  if (activeTab === "codex") {
    const provider = settings.providers.codex;
    const reasoning =
      provider.reasoningByModel[provider.defaultModel] ?? "medium";
    return (
      <div className="settings-reference-stack">
        <DefaultModelCard
          description="Choose the Codex model used when new sessions start."
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.codex.defaultModel = defaultModel;
            })
          }
          options={PROVIDER_MODEL_OPTIONS.codex}
          title="Codex Default model"
          value={provider.defaultModel}
        />
        <SessionContinuityCard
          onChange={(value) =>
            update((next) => {
              next.providers.codex.sessionContinuity.remainingPercentThreshold =
                value;
            })
          }
          title="Codex Session Continuity"
          value={provider.sessionContinuity.remainingPercentThreshold}
        />
        <SettingsCard title="Reasoning">
          <SettingsSelect
            label="Reasoning"
            onChange={(effort) =>
              update((next) => {
                next.providers.codex.reasoningByModel[provider.defaultModel] =
                  effort as HarnessSettings["providers"]["codex"]["reasoningByModel"][string];
              })
            }
            options={REASONING_EFFORT_OPTIONS}
            value={reasoning}
          />
          <SettingsToggle
            checked={provider.reasoningSummaryEnabled}
            label="Reasoning Summary"
            onChange={(enabled) =>
              update((next) => {
                next.providers.codex.reasoningSummaryEnabled = enabled;
              })
            }
          />
        </SettingsCard>
      </div>
    );
  }

  if (activeTab === "kimi") {
    const provider = settings.providers.kimi;
    return (
      <div className="settings-reference-stack">
        <DefaultModelCard
          description="Choose the Kimi model used when new sessions start."
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.kimi.defaultModel = defaultModel;
            })
          }
          options={PROVIDER_MODEL_OPTIONS.kimi}
          title="Kimi Default model"
          value={provider.defaultModel}
        />
        <SettingsCard title="Thinking">
          <SettingsToggle
            checked={provider.thinkingEnabled}
            label="Thinking Enabled"
            onChange={(enabled) =>
              update((next) => {
                next.providers.kimi.thinkingEnabled = enabled;
              })
            }
          />
          <SettingsToggle
            checked={provider.thinkingDisplaySyncEnabled}
            label="Thinking Display Sync"
            onChange={(enabled) =>
              update((next) => {
                next.providers.kimi.thinkingDisplaySyncEnabled = enabled;
              })
            }
          />
        </SettingsCard>
        <ProviderUpdatesCard
          autoUpdate={provider.autoUpdate.enabled}
          onChange={(enabled) =>
            update((next) => {
              next.providers.kimi.autoUpdate.enabled = enabled;
            })
          }
        />
      </div>
    );
  }

  if (activeTab === "glmNative") {
    const provider = settings.providers.glmNative;
    return (
      <ConnectionProviderSettings
        apiKey={provider.apiKey}
        baseUrl={provider.baseUrl}
        model={provider.defaultModel}
        modelOptions={PROVIDER_MODEL_OPTIONS.glmNative}
        onChange={(patch) =>
          update((next) => {
            Object.assign(next.providers.glmNative, patch);
          })
        }
        title="GLM"
      />
    );
  }

  if (activeTab === "glmOpenCode") {
    const provider = settings.providers.glmOpenCode;
    return (
      <div className="settings-reference-stack">
        <ConnectionProviderSettings
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          model={provider.defaultModel}
          modelOptions={PROVIDER_MODEL_OPTIONS.glmOpenCode}
          onChange={(patch) =>
            update((next) => {
              Object.assign(next.providers.glmOpenCode, patch);
            })
          }
          title="OpenCode"
        />
        <SettingsCard title="OpenCode Config">
          <SettingsTextField
            label="Config Path"
            onChange={(configPath) =>
              update((next) => {
                next.providers.glmOpenCode.configPath = configPath;
              })
            }
            value={provider.configPath}
          />
        </SettingsCard>
      </div>
    );
  }

  if (activeTab === "localModels") {
    return (
      <SettingsCard title="Local Models">
        <SettingsTextField
          label="Default Model"
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.localModels.defaultModel = defaultModel;
            })
          }
          value={settings.providers.localModels.defaultModel}
        />
      </SettingsCard>
    );
  }

  const provider = settings.providers.openRouter;
  return (
    <div className="settings-reference-stack">
      <ConnectionProviderSettings
        apiKey={provider.apiKey}
        baseUrl={provider.baseUrl}
        model={provider.defaultModel}
        onChange={(patch) =>
          update((next) => {
            Object.assign(next.providers.openRouter, patch);
          })
        }
        title="OpenRouter"
      />
      <SettingsCard title="OpenRouter Profiles">
        <SettingsTextField
          label="Endpoint Tag"
          onChange={(endpointTag) =>
            update((next) => {
              next.providers.openRouter.endpointTag = endpointTag;
            })
          }
          value={provider.endpointTag}
        />
        <SettingsTextField
          label="UI Translation Model"
          onChange={(model) =>
            update((next) => {
              next.providers.openRouter.translationProfiles.uiTranslation.model =
                model;
            })
          }
          value={provider.translationProfiles.uiTranslation.model}
        />
        <SettingsTextField
          label="Reasoning Translation Model"
          onChange={(model) =>
            update((next) => {
              next.providers.openRouter.translationProfiles.reasoningTranslation.model =
                model;
            })
          }
          value={provider.translationProfiles.reasoningTranslation.model}
        />
      </SettingsCard>
    </div>
  );
}

function DefaultModelCard({
  description,
  onChange,
  options,
  title,
  value,
}: {
  description: string;
  onChange: (value: string) => void;
  options: readonly string[];
  title: string;
  value: string;
}) {
  return (
    <SettingsCard title={title}>
      <ModelRows
        description={description}
        onChange={onChange}
        options={options}
        value={value}
      />
    </SettingsCard>
  );
}

function SessionContinuityCard({
  onChange,
  title,
  value,
}: {
  onChange: (value: number) => void;
  title: string;
  value: number;
}) {
  return (
    <SettingsCard title={title}>
      <p className="settings-description">
        When the remaining context window drops to or below this percentage,
        CodeAI Hub can automatically wrap up the current session and start a new
        one. Default: 30%.
      </p>
      <ManualIntegerField
        label="Remaining context threshold (%)"
        max={80}
        min={5}
        onChange={onChange}
        value={value}
      />
    </SettingsCard>
  );
}

function ProviderUpdatesCard({
  autoUpdate,
  onChange,
}: {
  autoUpdate: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <SettingsCard title="Provider Updates">
      <SettingsToggle
        checked={autoUpdate}
        description="Automatically keep the provider integration current when update metadata is available."
        label="Auto Update"
        onChange={onChange}
      />
    </SettingsCard>
  );
}

function ConnectionProviderSettings({
  apiKey,
  baseUrl,
  model,
  modelOptions,
  onChange,
  title,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelOptions?: readonly string[];
  onChange: (patch: {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }) => void;
  title: string;
}) {
  return (
    <div className="settings-reference-stack">
      <SettingsCard title={`${title} Connection`}>
        <SettingsTextField
          label="API Key"
          onChange={(value) => onChange({ apiKey: value })}
          password
          value={apiKey}
        />
        <SettingsTextField
          label="Base URL"
          onChange={(value) => onChange({ baseUrl: value })}
          value={baseUrl}
        />
      </SettingsCard>
      {modelOptions ? (
        <DefaultModelCard
          description={`Choose the ${title} model used when new sessions start.`}
          onChange={(defaultModel) => onChange({ defaultModel })}
          options={modelOptions}
          title={`${title} Default model`}
          value={model}
        />
      ) : (
        <SettingsCard title={`${title} Default model`}>
          <SettingsTextField
            label="Default Model"
            onChange={(defaultModel) => onChange({ defaultModel })}
            value={model}
          />
        </SettingsCard>
      )}
    </div>
  );
}
