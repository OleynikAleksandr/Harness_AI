import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { LocalModelsSettingsCard } from "./local-models-settings-card.js";
import { OpenCodeSettingsCard } from "./opencode-settings-card.js";
import { OpenRouterSettingsCard } from "./openrouter-settings-card.js";
import {
  ProviderVersionsCard,
  type ProviderVersionsSnapshot,
  type UpdatableProviderId,
  type VersionTarget,
} from "./provider-version-controls.js";
import { SessionContinuityCard } from "./session-continuity-card.js";
import {
  PROVIDER_MODEL_OPTIONS,
  REASONING_EFFORT_OPTIONS,
  type SettingsTabId,
} from "./settings-model-options.js";
import {
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
        <DefaultModelCard
          description="Выберите псевдоним Claude, который будет применяться при запуске новых сессий. Подробнее: doc/SolidWorks-WorkFlow/Modules/Claude.md"
          note="Применяется только к вновь созданным сессиям Claude."
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.claude.defaultModel = defaultModel;
            })
          }
          options={PROVIDER_MODEL_OPTIONS.claude}
          title="Claude Default model"
          value={provider.defaultModel}
        />
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
        <SettingsCard title="Claude Thinking Settings">
          <SettingsToggle
            checked={provider.thinking.enabled}
            description="При включении Claude будет использовать свой адаптивный путь мышления для сложных запросов. Выберите уровень усилий ниже, чтобы контролировать интенсивность рассуждений."
            label="Enable thinking mode"
            onChange={(enabled) =>
              update((next) => {
                next.providers.claude.thinking.enabled = enabled;
              })
            }
          />
          <SettingsToggle
            checked={provider.thinkingDisplaySyncEnabled}
            description="Show Claude reasoning as a normal assistant bubble with a Thinking label."
            label="Thinking in dialog"
            onChange={(enabled) =>
              update((next) => {
                next.providers.claude.thinkingDisplaySyncEnabled = enabled;
              })
            }
          />
          <ReasoningEffortRows
            enabled={provider.thinking.enabled}
            onChange={(effort) =>
              update((next) => {
                next.providers.claude.thinking.effort = effort;
              })
            }
            value={provider.thinking.effort}
          />
        </SettingsCard>
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
    const reasoning =
      provider.reasoningByModel[provider.defaultModel] ?? "medium";
    return (
      <div className="settings-reference-stack">
        <DefaultModelCard
          description="Select which Codex model to use when starting new sessions. Each model can store its own reasoning effort level."
          note="Changes apply when creating a new Codex session."
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.codex.defaultModel = defaultModel;
            })
          }
          options={PROVIDER_MODEL_OPTIONS.codex}
          title="Codex Default model"
          value={provider.defaultModel}
        />
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

function ReasoningEffortRows({
  enabled,
  onChange,
  value,
}: {
  enabled: boolean;
  onChange: (
    effort: HarnessSettings["providers"]["claude"]["thinking"]["effort"]
  ) => void;
  value: HarnessSettings["providers"]["claude"]["thinking"]["effort"];
}) {
  return (
    <div
      style={{
        opacity: enabled ? 1 : 0.6,
        pointerEvents: enabled ? "auto" : "none",
      }}
    >
      <p className="settings-description">
        Choose how much reasoning effort Claude should apply for new sessions.
      </p>
      <div className="settings-list">
        {REASONING_EFFORT_OPTIONS.map((option) => (
          <button
            aria-pressed={option.value === value}
            className={
              option.value === value
                ? "active settings-model-row"
                : "settings-model-row"
            }
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="settings-model-title">{option.label}</span>
            <span className="settings-model-id">{option.value}</span>
          </button>
        ))}
      </div>
    </div>
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
