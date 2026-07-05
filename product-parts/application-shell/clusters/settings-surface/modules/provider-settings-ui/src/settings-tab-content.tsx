import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ProfileSettingsUiFacade } from "../../profile-settings-ui/src/profile-settings-ui-facade.js";
import { ClaudeDefaultModelCard } from "./claude-default-model-card.js";
import {
  GlmClientApiKeyCard,
  KimiClientApiKeyCard,
  LocalModelsClientConnectionCard,
} from "./client-api-key-card.js";
import { CodexDefaultModelCard } from "./codex-default-model-card.js";
import { LocalModelsSettingsCard } from "./local-models-settings-card.js";
import { NativeCaptureCard } from "./native-capture-card.js";
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
  DefaultModelCard,
  localizeModelOptions,
} from "./settings-provider-cards.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";
import { ReferenceGeneralSettings } from "./settings-reference-general.js";

interface SettingsTabContentProps {
  activeTab: SettingsTabId;
  coreRestartBusy: boolean;
  coreRestartStatus: string;
  localModels: readonly string[];
  onOpenGlossary: () => void;
  onRebuildTranslations: () => void;
  onRestartCore: () => void;
  onUpdateProvider: (
    provider: UpdatableProviderId,
    target: VersionTarget
  ) => void;
  rebuildTranslationsBusy: boolean;
  rebuildTranslationsStatus: string;
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
  onRebuildTranslations,
  onRestartCore,
  onUpdateProvider,
  localModels,
  rebuildTranslationsBusy,
  rebuildTranslationsStatus,
  settings,
  update,
  versionError,
  versionLoading,
  versions,
  versionUpdatingTargets,
}: SettingsTabContentProps) {
  const { t } = useBrowserLocalization();
  if (activeTab === "profileCreator") {
    return <ProfileSettingsUiFacade />;
  }

  if (activeTab === "general") {
    return (
      <div className="settings-reference-stack">
        <ReferenceGeneralSettings
          coreRestartBusy={coreRestartBusy}
          coreRestartStatus={coreRestartStatus}
          onOpenGlossary={onOpenGlossary}
          onRebuildTranslations={onRebuildTranslations}
          onRestartCore={onRestartCore}
          rebuildTranslationsBusy={rebuildTranslationsBusy}
          rebuildTranslationsStatus={rebuildTranslationsStatus}
          settings={settings}
          update={update}
        />
        <NativeCaptureCard />
      </div>
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
          title={t(
            "ui_labels",
            "settings.provider.claude.sessionContinuity",
            "Claude Session Continuity"
          )}
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
          title={t(
            "ui_labels",
            "settings.provider.codex.sessionContinuity",
            "Codex Session Continuity"
          )}
          value={provider.sessionContinuity.remainingPercentThreshold}
        />
      </div>
    );
  }

  if (activeTab === "kimi") {
    const provider = settings.providers.kimi;
    return (
      <div className="settings-reference-stack">
        <KimiClientApiKeyCard
          apiKey={settings.providers.kimiClient.apiKey}
          onChange={(value) =>
            update((next) => {
              next.providers.kimiClient.apiKey = value;
            })
          }
        />
        <DefaultModelCard
          description={t(
            "ui_helper_text",
            "settings.provider.kimi.defaultModel.description",
            "Choose the Kimi model used when new sessions start."
          )}
          note={t(
            "ui_helper_text",
            "settings.provider.kimi.defaultModel.note",
            "Uses the installed Kimi Code CLI through ACP."
          )}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.kimi.defaultModel = defaultModel;
            })
          }
          options={localizeModelOptions(
            t,
            "settings.provider.kimi.model",
            PROVIDER_MODEL_OPTIONS.kimi
          )}
          title={t(
            "ui_labels",
            "settings.provider.kimi.defaultModel",
            "Kimi Default model"
          )}
          value={provider.defaultModel}
        />
        <SettingsCard title={t("ui_labels", "settings.thinking", "Thinking")}>
          <SettingsToggle
            checked={provider.thinkingEnabled}
            label={t(
              "ui_labels",
              "settings.thinking.enabled",
              "Thinking Enabled"
            )}
            onChange={(enabled) =>
              update((next) => {
                next.providers.kimi.thinkingEnabled = enabled;
              })
            }
          />
          <SettingsToggle
            checked={provider.thinkingDisplaySyncEnabled}
            label={t(
              "ui_labels",
              "settings.thinking.displaySync",
              "Thinking Display Sync"
            )}
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
    return (
      <div className="settings-reference-stack">
        <GlmClientApiKeyCard
          apiKey={settings.providers.glmClient.apiKey}
          onChange={(value) =>
            update((next) => {
              next.providers.glmClient.apiKey = value;
            })
          }
        />
        <DefaultModelCard
          description={t(
            "ui_helper_text",
            "settings.provider.glmClient.defaultModel.description",
            "Choose the GLM model used by the universal client when new sessions start."
          )}
          onChange={(defaultModel) =>
            update((next) => {
              next.providers.glmClient.defaultModel = defaultModel;
            })
          }
          options={localizeModelOptions(
            t,
            "settings.provider.glmClient.model",
            PROVIDER_MODEL_OPTIONS.glmClient
          )}
          title={t(
            "ui_labels",
            "settings.provider.glmClient.defaultModel",
            "GLM Default model"
          )}
          value={settings.providers.glmClient.defaultModel}
        />
      </div>
    );
  }

  if (activeTab === "localModels") {
    const provider = settings.providers.localModels;
    return (
      <div className="settings-reference-stack">
        <LocalModelsClientConnectionCard
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          contextLength={provider.contextLength}
          onChange={(patch) =>
            update((next) => {
              if (patch.apiKey !== undefined) {
                next.providers.localModels.apiKey = patch.apiKey;
              }
              if (patch.baseUrl !== undefined) {
                next.providers.localModels.baseUrl = patch.baseUrl;
              }
              if (patch.contextLength !== undefined) {
                next.providers.localModels.contextLength = patch.contextLength;
              }
            })
          }
        />
        <LocalModelsSettingsCard
          defaultModel={provider.defaultModel}
          models={localModels}
          onDefaultModelChange={(defaultModel) =>
            update((next) => {
              next.providers.localModels.defaultModel = defaultModel;
            })
          }
        />
      </div>
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
      <SettingsCard
        title={t(
          "ui_labels",
          "settings.openRouter.profiles",
          "OpenRouter Profiles"
        )}
      >
        <h4 className="settings-profile-title">
          {t(
            "ui_labels",
            "settings.openRouter.uiTranslationModel",
            "UI Translation Model"
          )}
        </h4>
        <OpenRouterModelEndpointPicker
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          endpointTag={provider.translationProfiles.uiTranslation.endpointTag}
          label={t(
            "ui_labels",
            "settings.openRouter.modelSlugSearch",
            "Model slug search"
          )}
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
      <SettingsCard
        title={t(
          "ui_labels",
          "settings.openRouter.profiles",
          "OpenRouter Profiles"
        )}
      >
        <h4 className="settings-profile-title">
          {t(
            "ui_labels",
            "settings.openRouter.reasoningTranslationModel",
            "Reasoning Translation Model"
          )}
        </h4>
        <OpenRouterModelEndpointPicker
          apiKey={provider.apiKey}
          baseUrl={provider.baseUrl}
          endpointTag={
            provider.translationProfiles.reasoningTranslation.endpointTag
          }
          label={t(
            "ui_labels",
            "settings.openRouter.modelSlugSearch",
            "Model slug search"
          )}
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
