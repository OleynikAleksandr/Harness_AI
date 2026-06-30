import { CLAUDE_REASONING_EFFORTS_BY_MODEL } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ReasoningEffortSelect } from "./reasoning-effort-select.js";
import { PROVIDER_MODEL_OPTIONS } from "./settings-model-options.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

interface ClaudeDefaultModelCardProps {
  provider: HarnessSettings["providers"]["claude"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function ClaudeDefaultModelCard({
  provider,
  update,
}: ClaudeDefaultModelCardProps) {
  const { t } = useBrowserLocalization();
  return (
    <SettingsCard title="Claude Default model">
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.claude.defaultModel.description",
          "Choose the Claude alias used when new sessions start. Each model stores its own thinking level."
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
        {PROVIDER_MODEL_OPTIONS.claude.map((option) => {
          const efforts = CLAUDE_REASONING_EFFORTS_BY_MODEL[option.id] ?? [];
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
                <p className="settings-model-description">
                  {t(
                    "ui_helper_text",
                    `settings.provider.claude.model.${option.id}.description`,
                    option.description
                  )}
                </p>
              </button>
              <div className="settings-row-select">
                <span>Reasoning</span>
                {efforts.length > 0 ? (
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
                    value={provider.thinkingByModel[option.id] ?? "medium"}
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
          "settings.provider.claude.newSessions.note",
          "Applies only to newly created Claude sessions."
        )}
      </p>
    </SettingsCard>
  );
}
