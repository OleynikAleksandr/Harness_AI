import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
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
  const { t } = useBrowserLocalization();
  return (
    <SettingsCard
      title={t("ui_labels", "settings.provider.openCode", "OpenCode")}
    >
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.openCode.description",
          "Runs models already configured in OpenCode. Tested selectors: zai-coding-plan/glm-5.2 and kimi-for-coding/k2p7."
        )}
      </p>
      <SettingsToggle
        checked={settings.thinkingDisplaySyncEnabled}
        description={t(
          "ui_helper_text",
          "settings.provider.openCode.reasoning.dialog.description",
          "Show OpenCode reasoning as a normal assistant bubble in the dialog."
        )}
        label={t(
          "ui_labels",
          "settings.thinking.reasoningInDialog",
          "Reasoning in dialog"
        )}
        onChange={(thinkingDisplaySyncEnabled) =>
          onSettingsChange({ ...settings, thinkingDisplaySyncEnabled })
        }
      />
      <SettingsTextField
        label={t(
          "ui_labels",
          "settings.provider.openCode.optionalApiKey",
          "Optional Z.AI API key"
        )}
        onChange={(apiKey) => onSettingsChange({ ...settings, apiKey })}
        password
        placeholder={t(
          "ui_helper_text",
          "settings.provider.openCode.auth.placeholder",
          "Optional; OpenCode auth is used first"
        )}
        value={settings.apiKey}
      />
      <SettingsTextField
        label={t("ui_labels", "settings.provider.openCode.config", "Config")}
        onChange={(configPath) => onSettingsChange({ ...settings, configPath })}
        value={settings.configPath}
      />
      <ModelRows
        description={t(
          "ui_helper_text",
          "settings.provider.openCode.defaultModel.description",
          "Default model"
        )}
        onChange={(defaultModel) =>
          onSettingsChange({ ...settings, defaultModel })
        }
        options={PROVIDER_MODEL_OPTIONS.glmOpenCode.map((option) => ({
          ...option,
          description: t(
            "ui_helper_text",
            `settings.provider.openCode.model.${option.id}.description`,
            option.description
          ),
        }))}
        value={settings.defaultModel}
      />
      <p className="settings-note">
        {t(
          "ui_helper_text",
          "settings.provider.openCode.home.note",
          "Uses isolated home at .harness/runtime/providers/glm-opencode/home."
        )}
      </p>
    </SettingsCard>
  );
}
