// Shared provider-tab card helpers (default-model card, connection provider
// block, model-option localization), split from settings-tab-content.tsx for
// the 500-line implementation cap. Presentation only: every card edits the
// Core-owned settings snapshot through the caller's update mutator.

import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  ModelRows,
  SettingsCard,
  SettingsTextField,
} from "./settings-reference-controls.js";

export function localizeModelOptions(
  t: ReturnType<typeof useBrowserLocalization>["t"],
  messagePrefix: string,
  options: Parameters<typeof ModelRows>[0]["options"]
): Parameters<typeof ModelRows>[0]["options"] {
  return options.map((option) => {
    if (typeof option === "string" || !option.description) {
      return option;
    }
    return {
      ...option,
      description: t(
        "ui_helper_text",
        `${messagePrefix}.${option.id}.description`,
        option.description
      ),
    };
  });
}

export function DefaultModelCard({
  description,
  note,
  onChange,
  options,
  title,
  value,
}: {
  description: string;
  note?: string;
  onChange: (value: string) => void;
  options: Parameters<typeof ModelRows>[0]["options"];
  title: string;
  value: string;
}) {
  return (
    <SettingsCard title={title}>
      <ModelRows
        description={description}
        note={note}
        onChange={onChange}
        options={options}
        value={value}
      />
    </SettingsCard>
  );
}

export function ConnectionProviderSettings({
  apiKey,
  baseUrl,
  model,
  modelOptions,
  onChange,
  title,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  modelOptions?: Parameters<typeof ModelRows>[0]["options"];
  onChange: (patch: {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }) => void;
  title: string;
}) {
  const { t } = useBrowserLocalization();
  return (
    <div className="settings-reference-stack">
      <SettingsCard title={`${title} Connection`}>
        <SettingsTextField
          label={t("ui_labels", "settings.provider.apiKey", "API Key")}
          onChange={(value) => onChange({ apiKey: value })}
          password
          value={apiKey}
        />
        <SettingsTextField
          label={t("ui_labels", "settings.provider.baseUrl", "Base URL")}
          onChange={(value) => onChange({ baseUrl: value })}
          value={baseUrl}
        />
      </SettingsCard>
      {modelOptions ? (
        <DefaultModelCard
          description={t(
            "ui_helper_text",
            "settings.provider.glm.defaultModel.description",
            `Choose the ${title} model used when new sessions start.`
          )}
          onChange={(defaultModel) => onChange({ defaultModel })}
          options={modelOptions}
          title={t(
            "ui_labels",
            "settings.provider.glm.defaultModel",
            `${title} Default model`
          )}
          value={model}
        />
      ) : (
        <SettingsCard title={`${title} Default model`}>
          <SettingsTextField
            label={t(
              "ui_labels",
              "settings.provider.defaultModel",
              "Default Model"
            )}
            onChange={(defaultModel) => onChange({ defaultModel })}
            value={model}
          />
        </SettingsCard>
      )}
    </div>
  );
}
