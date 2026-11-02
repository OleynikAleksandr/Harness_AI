import type {
  HarnessSettings,
  SettingsModelOption,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useTranslatedModelDescriptions } from "./provider-model-catalog-hooks.js";
import { ReasoningEffortSelect } from "./reasoning-effort-select.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

interface ClaudeDefaultModelCardProps {
  // Live Claude catalog served by Core (`listProviderModelCatalogs`).
  models: readonly SettingsModelOption[];
  provider: HarnessSettings["providers"]["claude"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function ClaudeDefaultModelCard({
  models,
  provider,
  update,
}: ClaudeDefaultModelCardProps) {
  const { t } = useBrowserLocalization();
  const descriptions = useTranslatedModelDescriptions(models);
  return (
    <SettingsCard title="Claude Default model">
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.claude.defaultModel.description",
          "Choose the Claude model used when new sessions start. Each model stores its own thinking level."
        )}
      </p>
      <SettingsToggle
        checked={provider.thinking.enabled}
        description={t(
          "ui_helper_text",
          "settings.provider.claude.thinking.enabled.description",
          "When enabled, Claude can use its adaptive thinking path for complex requests."
        )}
        label="Enable thinking mode"
        onChange={(enabled) =>
          update((next) => {
            next.providers.claude.thinking.enabled = enabled;
          })
        }
      />
      <SettingsToggle
        checked={provider.thinkingDisplaySyncEnabled}
        description={t(
          "ui_helper_text",
          "settings.provider.claude.thinking.dialog.description",
          "Show Claude reasoning as a normal assistant bubble with a Thinking label."
        )}
        label="Thinking in dialog"
        onChange={(enabled) =>
          update((next) => {
            next.providers.claude.thinkingDisplaySyncEnabled = enabled;
          })
        }
      />
      <div className="settings-list">
        {models.map((option) => {
          // Core normalization keeps one effort per catalog model.
          const effort =
            provider.thinkingByModel[option.id] ??
            option.defaultReasoningEffort;
          const description = descriptions[option.id] ?? option.description;
          return (
            <div
              className={
                option.id === provider.defaultModel
                  ? "active settings-model-row settings-model-row--with-control"
                  : "settings-model-row settings-model-row--with-control"
              }
              key={option.id}
            >
              <button
                aria-pressed={option.id === provider.defaultModel}
                className="settings-model-choice"
                onClick={() =>
                  update((next) => {
                    next.providers.claude.defaultModel = option.id;
                  })
                }
                type="button"
              >
                <span className="settings-model-title">{option.label}</span>
                {description ? (
                  <p className="settings-model-description">{description}</p>
                ) : null}
              </button>
              <div className="settings-row-select">
                <span>Reasoning</span>
                {effort ? (
                  <ReasoningEffortSelect
                    disabled={!provider.thinking.enabled}
                    onChange={(effort) =>
                      update((next) => {
                        next.providers.claude.thinkingByModel[option.id] =
                          effort;
                        if (option.id === next.providers.claude.defaultModel) {
                          next.providers.claude.thinking.effort = effort;
                        }
                      })
                    }
                    value={effort}
                    values={option.reasoningEfforts}
                  />
                ) : (
                  <span>Not adjustable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="settings-note">
        {t(
          "ui_helper_text",
          "settings.provider.claude.newSessions.note",
          "Applies only to newly created Claude sessions."
        )}
      </p>
    </SettingsCard>
  );
}
