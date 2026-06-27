import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
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
  return (
    <SettingsCard title="Codex Default model">
      <p className="settings-description">
        Select which Codex model to use when starting new sessions. Each model
        stores its own reasoning effort level.
      </p>
      <SettingsToggle
        checked={provider.reasoningSummaryEnabled}
        description="Show Codex reasoning summaries in the dialog when the model provides them."
        label="Reasoning Summary"
        onChange={(enabled) =>
          update((next) => {
            next.providers.codex.reasoningSummaryEnabled = enabled;
          })
        }
      />
      <div className="settings-list">
        {PROVIDER_MODEL_OPTIONS.codex.map((option) => (
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
              <span className="settings-model-id">{option.id}</span>
              <p className="settings-model-description">{option.description}</p>
            </button>
            <div className="settings-row-select">
              <span>Reasoning</span>
              <ReasoningEffortSelect
                onChange={(value) =>
                  update((next) => {
                    next.providers.codex.reasoningByModel[option.id] = value;
                  })
                }
                value={provider.reasoningByModel[option.id] ?? "medium"}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="settings-note">
        Changes apply when creating a new Codex session.
      </p>
    </SettingsCard>
  );
}
