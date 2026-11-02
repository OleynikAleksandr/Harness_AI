import type {
  HarnessSettings,
  SettingsModelOption,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useTranslatedModelDescriptions } from "./provider-model-catalog-hooks.js";
import { ReasoningEffortSelect } from "./reasoning-effort-select.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

interface CodexDefaultModelCardProps {
  // Live Codex catalog served by Core (`listProviderModelCatalogs`).
  models: readonly SettingsModelOption[];
  provider: HarnessSettings["providers"]["codex"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function CodexDefaultModelCard({
  models,
  provider,
  update,
}: CodexDefaultModelCardProps) {
  const { t } = useBrowserLocalization();
  const descriptions = useTranslatedModelDescriptions(models);
  return (
    <SettingsCard title="Codex Default model">
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.codex.defaultModel.description",
          "Select which Codex model to use when starting new sessions. Each model stores its own reasoning effort level."
        )}
      </p>
      <SettingsToggle
        checked={provider.reasoningSummaryEnabled}
        description={t(
          "ui_helper_text",
          "settings.provider.codex.reasoningSummary.description",
          "Show Codex reasoning summaries in the dialog when the model provides them."
        )}
        label="Reasoning Summary"
        onChange={(enabled) =>
          update((next) => {
            next.providers.codex.reasoningSummaryEnabled = enabled;
          })
        }
      />
      <div className="settings-list">
        {models.map((option) => {
          // Core normalization keeps one effort per catalog model.
          const effort =
            provider.reasoningByModel[option.id] ??
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
                    next.providers.codex.defaultModel = option.id;
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
                    onChange={(value) =>
                      update((next) => {
                        next.providers.codex.reasoningByModel[option.id] =
                          value;
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
          "settings.provider.codex.newSessions.note",
          "Changes apply when creating a new Codex session."
        )}
      </p>
    </SettingsCard>
  );
}
