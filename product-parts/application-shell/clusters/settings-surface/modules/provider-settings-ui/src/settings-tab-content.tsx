import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { ClaudeDefaultModelCard } from "./claude-default-model-card.js";
import { CodexDefaultModelCard } from "./codex-default-model-card.js";
import { LocalModelsSettingsCard } from "./local-models-settings-card.js";
import { OpenCodeSettingsCard } from "./opencode-settings-card.js";
import {
  OpenRouterModelEndpointPicker,
  OpenRouterSettingsCard,
} from "./openrouter-settings-card.js";
import {
  ProviderVersionsCard,
  type ProviderVersionsSnapshot,
  type UpdatableProviderId,
  type VersionTarget,
} from "./provider-version-controls.js";
import { SessionContinuityCard } from "./session-continuity-card.js";
import {
  PROVIDER_MODEL_OPTIONS,
  type SettingsTabId,
} from "./settings-model-options.js";
import {
  ModelRows,
  SettingsCard,
  SettingsTextField,
  SettingsToggle,
} from "./settings-reference-controls.js";
import { ReferenceGeneralSettings } from "./settings-reference-general.js";

interface SettingsTabContentProps {
  activeTab: SettingsTabId;
  coreRestartBusy: boolean;
  coreRestartStatus: string;
  localModels: readonly string[];
  onOpenGlossary: () => void;
  onRestartCore: () => void;
  onUpdateProvider: (
    provider: UpdatableProviderId,
    target: VersionTarget
  ) => void;
  settings: HarnessSettings;
  update: (mutator: (next: HarnessSettings) => void) => void;
  versionError: null | string;
  versionLoading: boolean;
  versions: null | ProviderVersionsSnapshot;
  versionUpdatingTargets: readonly string[];
}

export function SettingsTabContent({
  activeTab,
  coreRestartBusy,
  coreRestartStatus,
  onOpenGlossary,
  onRestartCore,
  onUpdateProvider,
  localModels,
  settings,
  update,
  versionError,
  versionLoading,
  versions,
  versionUpdatingTargets,
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
        <ClaudeDefaultModelCard provider={provider} update={update} />
        <ProviderVersionsCard
          autoUpdate={provider.autoUpdate.enabled}
          error={versionError}
          loading={versionLoading}
          onAutoUpdateChange={(enabled) =>
            update((next) => {
              next.providers.claude.autoUpdate.enabled = enabled;
            })
          }
          onUpdate={onUpdateProvider}
          provider="claude"
          snapshot={versions}
          updatingTargets={versionUpdatingTargets}
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
      </div>
    );
  }

  if (activeTab === "codex") {
    const provider = settings.providers.codex;
    return (
      <div className="settings-reference-stack">
        <CodexDefaultModelCard provider={provider} update={update} />
        <ProviderVersionsCard
          autoUpdate={provider.autoUpdate.enabled}
          error={versionError}
          loading={versionLoading}
          onAutoUpdateChange={(enabled) =>
            update((next) => {
              next.providers.codex.autoUpdate.enabled = enabled;
            })
          }
          onUpdate={onUpdateProvider}
          provider="codex"
          snapshot={versions}
          updatingTargets={versionUpdatingTargets}
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
      </div>
    );
  }

  if (activeTab === "kimi") {
    const provider = settings.providers.kimi;
    return (
      <div className="settings-reference-stack">
        <DefaultModelCard
          description="Choose the Kimi model used when new sessions start."
          note="Uses the installed Kimi Code CLI through ACP."
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
        <OpenCodeSettingsCard
          onSettingsChange={(nextSettings) =>
            update((next) => {
              next.providers.glmOpenCode = nextSettings;
            })
          }
          settings={provider}
        />
        <ProviderVersionsCard
          autoUpdate={false}
          error={versionError}
          loading={versionLoading}
          onAutoUpdateChange={() => undefined}
          onUpdate={onUpdateProvider}
          provider="glmOpenCode"
          snapshot={versions}
          updatingTargets={versionUpdatingTargets}
        />
      </div>
    );
  }

  if (activeTab === "localModels") {
    return (
      <LocalModelsSettingsCard
        defaultModel={settings.providers.localModels.defaultModel}
        models={localModels}
        onDefaultModelChange={(defaultModel) =>
          update((next) => {
            next.providers.localModels.defaultModel = defaultModel;
          })
        }
      />
    );
  }

  const provider = settings.providers.openRouter;
  return (
    <div className="settings-reference-stack">
      <OpenRouterSettingsCard
        onChange={(nextSettings) =>
          update((next) => {
            next.providers.openRouter = nextSettings;
          })
        }
        settings={provider}
      />
      <SettingsCard title="OpenRouter Profiles">
        <h4 className="settings-profile-title">UI Translation Model</h4>
        <OpenRouterModelEndpointPicker
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          endpointTag={provider.translationProfiles.uiTranslation.endpointTag}
          label="Model slug search"
          onChange={(patch) =>
            update((next) => {
              Object.assign(
                next.providers.openRouter.translationProfiles.uiTranslation,
                patch
              );
            })
          }
          value={provider.translationProfiles.uiTranslation.model}
        />
      </SettingsCard>
      <SettingsCard title="OpenRouter Profiles">
        <h4 className="settings-profile-title">Reasoning Translation Model</h4>
        <OpenRouterModelEndpointPicker
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          endpointTag={
            provider.translationProfiles.reasoningTranslation.endpointTag
          }
          label="Model slug search"
          onChange={(patch) =>
            update((next) => {
              Object.assign(
                next.providers.openRouter.translationProfiles
                  .reasoningTranslation,
                patch
              );
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
  note,
  onChange,
  options,
  title,
  value,
}: {
  description: string;
  note?: string;
  onChange: (value: string) => void;
  options: Parameters<typeof ModelRows>[0]["options"];
  title: string;
  value: string;
}) {
  return (
    <SettingsCard title={title}>
      <ModelRows
        description={description}
        note={note}
        onChange={onChange}
        options={options}
        value={value}
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
  modelOptions?: Parameters<typeof ModelRows>[0]["options"];
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
