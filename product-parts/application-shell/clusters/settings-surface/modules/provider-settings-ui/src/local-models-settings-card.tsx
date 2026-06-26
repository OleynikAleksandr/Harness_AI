import { SettingsCard } from "./settings-reference-controls.js";

interface LocalModelsSettingsCardProps {
  defaultModel: string;
  models: readonly string[];
  onDefaultModelChange: (modelId: string) => void;
}

export function LocalModelsSettingsCard({
  defaultModel,
  models,
  onDefaultModelChange,
}: LocalModelsSettingsCardProps) {
  const selectedModel = models.includes(defaultModel)
    ? defaultModel
    : models[0];

  return (
    <SettingsCard title="Local Models">
      <div className="settings-list">
        <p className="settings-description">
          Select the default LM Studio model used for new Local Models sessions.
        </p>
        {models.length > 0 ? (
          models.map((modelKey) => (
            <button
              aria-pressed={modelKey === selectedModel}
              className={
                modelKey === selectedModel
                  ? "active settings-model-row"
                  : "settings-model-row"
              }
              key={modelKey}
              onClick={() => onDefaultModelChange(modelKey)}
              type="button"
            >
              <span className="settings-model-title">
                {formatLocalModelName(modelKey)}
              </span>
              <span className="settings-model-description">
                lmstudio:{modelKey}
              </span>
            </button>
          ))
        ) : (
          <p className="settings-muted">
            No downloaded LM Studio models are currently visible to Core.
          </p>
        )}
      </div>
    </SettingsCard>
  );
}

function formatLocalModelName(modelKey: string): string {
  return (
    modelKey
      .split("/")
      .pop()
      ?.replace(/[-_]+/gu, " ")
      .replace(/\b\w/gu, (match) => match.toUpperCase()) ?? modelKey
  );
}
