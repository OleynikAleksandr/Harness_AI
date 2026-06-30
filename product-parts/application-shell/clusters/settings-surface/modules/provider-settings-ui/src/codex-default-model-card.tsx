import {
  CODEX_REASONING_EFFORTS_BY_MODEL,
  resolveCodexReasoningEffort,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ReasoningEffortSelect } from "./reasoning-effort-select.js";
import { PROVIDER_MODEL_OPTIONS } from "./settings-model-options.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

interface CodexDefaultModelCardProps {
  provider: HarnessSettings["providers"]["codex"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function CodexDefaultModelCard({
  provider,
  update,
}: CodexDefaultModelCardProps) {
  const { t } = useBrowserLocalization();
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
        {PROVIDER_MODEL_OPTIONS.codex.map((option) => {
          const efforts = CODEX_REASONING_EFFORTS_BY_MODEL[option.id] ?? [];
          const resolvedEffort = resolveCodexReasoningEffort(
            option.id,
            provider.reasoningByModel[option.id]
          );
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
                <p className="settings-model-description">
                  {t(
                    "ui_helper_text",
                    `settings.provider.codex.model.${option.id}.description`,
                    option.description
                  )}
                </p>
              </button>
              <div className="settings-row-select">
                <span>Reasoning</span>
                {resolvedEffort ? (
                  <ReasoningEffortSelect
                    onChange={(value) =>
                      update((next) => {
                        next.providers.codex.reasoningByModel[option.id] =
                          value;
                      })
                    }
                    value={resolvedEffort}
                    values={efforts}
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
