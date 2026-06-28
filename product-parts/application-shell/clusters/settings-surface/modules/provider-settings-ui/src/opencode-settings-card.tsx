import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { PROVIDER_MODEL_OPTIONS } from "./settings-model-options.js";
import {
  ModelRows,
  SettingsCard,
  SettingsTextField,
  SettingsToggle,
} from "./settings-reference-controls.js";

type OpenCodeSettings = HarnessSettings["providers"]["glmOpenCode"];

interface OpenCodeSettingsCardProps {
  onSettingsChange: (settings: OpenCodeSettings) => void;
  settings: OpenCodeSettings;
}

export function OpenCodeSettingsCard({
  onSettingsChange,
  settings,
}: OpenCodeSettingsCardProps) {
  return (
    <SettingsCard title="OpenCode">
      <p className="settings-description">
        Runs models already configured in OpenCode. Tested selectors:
        zai-coding-plan/glm-5.2 and kimi-for-coding/k2p7.
      </p>
      <SettingsToggle
        checked={settings.thinkingDisplaySyncEnabled}
        description="Show OpenCode reasoning as a normal assistant bubble in the dialog."
        label="Reasoning in dialog"
        onChange={(thinkingDisplaySyncEnabled) =>
          onSettingsChange({ ...settings, thinkingDisplaySyncEnabled })
        }
      />
      <SettingsTextField
        label="Optional Z.AI API key"
        onChange={(apiKey) => onSettingsChange({ ...settings, apiKey })}
        password
        placeholder="Optional; OpenCode auth is used first"
        value={settings.apiKey}
      />
      <SettingsTextField
        label="Config"
        onChange={(configPath) => onSettingsChange({ ...settings, configPath })}
        value={settings.configPath}
      />
      <ModelRows
        description="Default model"
        onChange={(defaultModel) =>
          onSettingsChange({ ...settings, defaultModel })
        }
        options={PROVIDER_MODEL_OPTIONS.glmOpenCode}
        value={settings.defaultModel}
      />
      <p className="settings-note">
        Uses isolated home at .harness/runtime/providers/glm-opencode/home.
      </p>
    </SettingsCard>
  );
}
