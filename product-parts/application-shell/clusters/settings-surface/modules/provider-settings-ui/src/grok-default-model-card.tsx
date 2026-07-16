import { GROK_REASONING_EFFORTS_BY_MODEL } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ReasoningEffortSelect } from "./reasoning-effort-select.js";
import { PROVIDER_MODEL_OPTIONS } from "./settings-model-options.js";
import { SettingsCard } from "./settings-reference-controls.js";

interface GrokDefaultModelCardProps {
  provider: HarnessSettings["providers"]["grok"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function GrokDefaultModelCard({
  provider,
  update,
}: GrokDefaultModelCardProps) {
  const { t } = useBrowserLocalization();
  return (
    <SettingsCard title="Grok Default model">
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.grok.defaultModel.description",
          "Select the installed Grok Build model used for new sessions. Reasoning is adjustable only when the native model advertises it."
        )}
      </p>
      <div className="settings-list">
        {PROVIDER_MODEL_OPTIONS.grok.map((option) => {
          const efforts = GROK_REASONING_EFFORTS_BY_MODEL[option.id] ?? [];
          const effort = provider.reasoningByModel[option.id] ?? efforts[0];
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
                    next.providers.grok.defaultModel = option.id;
                  })
                }
                type="button"
              >
                <span className="settings-model-title">{option.label}</span>
                <p className="settings-model-description">
                  {t(
                    "ui_helper_text",
                    `settings.provider.grok.model.${option.id}.description`,
                    option.description
                  )}
                </p>
              </button>
              <div className="settings-row-select">
                <span>Reasoning</span>
                {effort ? (
                  <ReasoningEffortSelect
                    onChange={(value) =>
                      update((next) => {
                        next.providers.grok.reasoningByModel[option.id] = value;
                      })
                    }
                    value={effort}
                    values={efforts}
                  />
                ) : (
                  <span>Provider managed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="settings-note">
        {t(
          "ui_helper_text",
          "settings.provider.grok.newSessions.note",
          "The options mirror the verified installed Grok Build catalog; the official CLI remains the runtime authority. Changes apply to new sessions."
        )}
      </p>
    </SettingsCard>
  );
}
