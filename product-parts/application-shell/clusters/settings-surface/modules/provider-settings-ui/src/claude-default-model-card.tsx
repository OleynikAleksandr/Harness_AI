import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  PROVIDER_MODEL_OPTIONS,
  REASONING_EFFORT_OPTIONS,
} from "./settings-model-options.js";
import { SettingsCard, SettingsToggle } from "./settings-reference-controls.js";

interface ClaudeDefaultModelCardProps {
  provider: HarnessSettings["providers"]["claude"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}

export function ClaudeDefaultModelCard({
  provider,
  update,
}: ClaudeDefaultModelCardProps) {
  return (
    <SettingsCard title="Claude Default model">
      <p className="settings-description">
        Выберите псевдоним Claude, который будет применяться при запуске новых
        сессий. Каждая модель хранит свой уровень thinking.
      </p>
      <SettingsToggle
        checked={provider.thinking.enabled}
        description="При включении Claude будет использовать свой адаптивный путь мышления для сложных запросов."
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
      <div className="settings-list">
        {PROVIDER_MODEL_OPTIONS.claude.map((option) => (
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
              <span className="settings-model-id">{option.id}</span>
              <p className="settings-model-description">{option.description}</p>
            </button>
            <label className="settings-row-select">
              <span>Reasoning</span>
              <select
                disabled={!provider.thinking.enabled}
                onChange={(event) =>
                  update((next) => {
                    const effort = event.target
                      .value as HarnessSettings["providers"]["claude"]["thinkingByModel"][string];
                    next.providers.claude.thinkingByModel[option.id] = effort;
                    if (option.id === next.providers.claude.defaultModel) {
                      next.providers.claude.thinking.effort = effort;
                    }
                  })
                }
                value={provider.thinkingByModel[option.id] ?? "medium"}
              >
                {REASONING_EFFORT_OPTIONS.map((reasoning) => (
                  <option key={reasoning.value} value={reasoning.value}>
                    {reasoning.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
      <p className="settings-note">
        Применяется только к вновь созданным сессиям Claude.
      </p>
    </SettingsCard>
  );
}
