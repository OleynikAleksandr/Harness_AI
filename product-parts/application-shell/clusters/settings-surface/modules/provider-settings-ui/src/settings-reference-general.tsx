import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  SettingsButton,
  SettingsCard,
  SettingsSelect,
  SettingsToggle,
} from "./settings-reference-controls.js";

type GeneralSettings = HarnessSettings["general"];
type LocalizationSettings = GeneralSettings["localization"];
type LocalizationCategoryKey = keyof LocalizationSettings["categories"];

const LANGUAGE_OPTIONS = [
  {
    label: "Default Language (English)",
    messageId: "language.en",
    value: "en",
  },
  { label: "Russian (ru)", messageId: "language.ru", value: "ru" },
  { label: "Ukrainian (uk)", messageId: "language.uk", value: "uk" },
  { label: "Spanish (es)", messageId: "language.es", value: "es" },
  { label: "German (de)", messageId: "language.de", value: "de" },
  { label: "French (fr)", messageId: "language.fr", value: "fr" },
] as const;

const GOOGLE_GTX_OPTION = {
  label: "Google GTX Free",
  value: "google-gtx",
} as const;
const OPENROUTER_UNSET_MODEL = "openrouter-default";
const OPENROUTER_UI_ENGINE_ID = "openrouter-ui-translation";
const OPENROUTER_REASONING_ENGINE_ID = "openrouter-reasoning-translation";

function buildTranslationEngineOptions(
  openRouterModel: string,
  openRouterEngineId: string
): readonly { label: string; value: string }[] {
  const model = openRouterModel.trim();
  if (!model || model === OPENROUTER_UNSET_MODEL) {
    return [GOOGLE_GTX_OPTION];
  }
  return [
    GOOGLE_GTX_OPTION,
    { label: `OpenRouter (${model})`, value: openRouterEngineId },
  ];
}

const CATEGORY_FIELDS: readonly {
  description: string;
  descriptionId: string;
  key: LocalizationCategoryKey;
  label: string;
  labelId: string;
}[] = [
  {
    description:
      "Buttons, tabs, section names, step names, and short interface terms.",
    descriptionId: "settings.localization.category.uiLabels.description",
    key: "uiInterface",
    label: "UI Labels",
    labelId: "settings.localization.category.uiLabels",
  },
  {
    description:
      "Short interface explanations and helper copy that clarifies labels and settings.",
    descriptionId: "settings.localization.category.uiHelperText.description",
    key: "userGuidance",
    label: "UI Helper Text",
    labelId: "settings.localization.category.uiHelperText",
  },
  {
    description:
      "Warnings, errors, hints, status updates, and other messages addressed to the user.",
    descriptionId: "settings.localization.category.messages.description",
    key: "systemFeedback",
    label: "Messages for the User",
    labelId: "settings.localization.category.messages",
  },
  {
    description:
      "Forms and final user-facing artifacts. Agent instructions and templates stay in English.",
    descriptionId: "settings.localization.category.artifacts.description",
    key: "artifactsForTheUser",
    label: "Artifacts for the User",
    labelId: "settings.localization.category.artifacts",
  },
  {
    description:
      "Visible Thinking and Reasoning bubbles emitted by the provider during a turn. Hidden reasoning is never translated.",
    descriptionId: "settings.localization.category.reasoning.description",
    key: "reasoning",
    label: "Reasoning",
    labelId: "settings.localization.category.reasoning",
  },
];

export function ReferenceGeneralSettings({
  coreRestartBusy,
  coreRestartStatus,
  onOpenGlossary,
  onRestartCore,
  settings,
  update,
}: {
  coreRestartBusy: boolean;
  coreRestartStatus: string;
  onOpenGlossary: () => void;
  onRestartCore: () => void;
  settings: HarnessSettings;
  update: (mutator: (next: HarnessSettings) => void) => void;
}) {
  const { t } = useBrowserLocalization();
  const general = settings.general;
  const localization = general.localization;
  const languageOptions = LANGUAGE_OPTIONS.map((option) => ({
    label: t("ui_labels", option.messageId, option.label),
    value: option.value,
  }));
  const translationProfiles = settings.providers.openRouter.translationProfiles;
  const uiTranslationEngineOptions = buildTranslationEngineOptions(
    translationProfiles.uiTranslation.model,
    OPENROUTER_UI_ENGINE_ID
  );
  const reasoningTranslationEngineOptions = buildTranslationEngineOptions(
    translationProfiles.reasoningTranslation.model,
    OPENROUTER_REASONING_ENGINE_ID
  );

  return (
    <div className="settings-reference-stack">
      <SettingsCard
        title={t("ui_labels", "settings.coreControls", "Core Controls")}
      >
        <p className="settings-description">
          {t(
            "ui_helper_text",
            "settings.coreControls.description",
            "Restart the Harness AI app. The current app closes and relaunches, so the Electron host and Core runtime both reload from disk."
          )}
        </p>
        <div className="settings-core-row">
          <SettingsButton
            disabled={coreRestartBusy}
            onClick={onRestartCore}
            variant="primary"
          >
            {coreRestartBusy ? (
              <>
                <span aria-hidden="true" className="settings-spinner" />
                {t(
                  "messages_for_the_user",
                  "settings.coreControls.restarting",
                  "Restarting app..."
                )}
              </>
            ) : (
              t("ui_labels", "settings.coreControls.restart", "Restart App")
            )}
          </SettingsButton>
          <span className="settings-core-status">{coreRestartStatus}</span>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t("ui_labels", "settings.localization", "Localization")}
      >
        <p className="settings-description">
          {t(
            "ui_helper_text",
            "settings.localization.description",
            "Configure which user-facing text should stay in English and which should be localized for the user."
          )}
        </p>
        <p className="settings-helper">
          {t(
            "ui_helper_text",
            "settings.localization.workflowTerms",
            "`Workflow Terms` now follow `UI Labels`, and `Default Language (English)` is the reset state for every category."
          )}
        </p>
        <div className="settings-reference-stack tight">
          <SettingsSelect
            label={t(
              "ui_labels",
              "settings.localization.uiEngine",
              "UI Translation Engine"
            )}
            onChange={(engineId) =>
              update((next) => {
                next.general.localization.uiEngineId = engineId;
                next.general.localization.engineId = engineId;
              })
            }
            options={uiTranslationEngineOptions}
            value={localization.uiEngineId}
          />
          <SettingsSelect
            label={t(
              "ui_labels",
              "settings.localization.reasoningEngine",
              "Reasoning Translation Engine"
            )}
            onChange={(reasoningEngineId) =>
              update((next) => {
                next.general.localization.reasoningEngineId = reasoningEngineId;
              })
            }
            options={reasoningTranslationEngineOptions}
            value={localization.reasoningEngineId}
          />
          <SettingsToggle
            checked={localization.glossaryEnabled}
            description={t(
              "ui_helper_text",
              "settings.localization.glossary.description",
              "Keep protected terms, provider names, and product vocabulary stable during localization."
            )}
            label={t(
              "ui_labels",
              "settings.localization.glossary",
              "Glossary protection"
            )}
            onChange={(glossaryEnabled) =>
              update((next) => {
                next.general.localization.glossaryEnabled = glossaryEnabled;
              })
            }
          />
          <GlossaryCard
            enabled={localization.glossaryEnabled}
            onOpen={onOpenGlossary}
            t={t}
          />
          {CATEGORY_FIELDS.map((category) => (
            <LocalizationCategory
              category={category}
              key={category.key}
              localization={localization}
              options={languageOptions}
              t={t}
              update={update}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function GlossaryCard({
  enabled,
  onOpen,
  t,
}: {
  enabled: boolean;
  onOpen: () => void;
  t: ReturnType<typeof useBrowserLocalization>["t"];
}) {
  return (
    <div className="settings-control-row">
      <p className="settings-control-title">
        {t(
          "ui_labels",
          "settings.localization.glossaryTerms",
          "Do-not-translate terms"
        )}
      </p>
      <p className="settings-control-description">
        {t(
          "ui_helper_text",
          "settings.localization.glossaryTerms.description",
          "Open the glossary file in VS Code and edit one English term per line. The file is created automatically on first open and starts with common product and workflow terms."
        )}
      </p>
      <div className="settings-callout">
        {enabled
          ? t(
              "messages_for_the_user",
              "settings.localization.glossary.enabled",
              "Glossary protection is enabled. Terms from the glossary file remain protected during localization."
            )
          : t(
              "messages_for_the_user",
              "settings.localization.glossary.disabled",
              "Glossary protection is disabled. Terms may be translated."
            )}
      </div>
      <SettingsButton onClick={onOpen} variant="primary">
        {t(
          "ui_labels",
          "settings.localization.openGlossary",
          "Open glossary file"
        )}
      </SettingsButton>
      <p className="settings-control-description mono">
        {t(
          "ui_helper_text",
          "settings.localization.glossary.prefilled",
          "File is prefilled with common terms such as: Project Manager, Description, CODEX_HOME, questionnaire.md."
        )}
      </p>
    </div>
  );
}

function LocalizationCategory({
  category,
  localization,
  options,
  t,
  update,
}: {
  category: (typeof CATEGORY_FIELDS)[number];
  localization: LocalizationSettings;
  options: readonly { label: string; value: string }[];
  t: ReturnType<typeof useBrowserLocalization>["t"];
  update: (mutator: (next: HarnessSettings) => void) => void;
}) {
  return (
    <div className="settings-control-row">
      <p className="settings-control-title">
        {t("ui_labels", category.labelId, category.label)}
      </p>
      <p className="settings-control-description">
        {t("ui_helper_text", category.descriptionId, category.description)}
      </p>
      <SettingsSelect
        label=""
        onChange={(language) =>
          update((next) => {
            next.general.localization.categories[category.key] = language;
            if (category.key === "uiInterface") {
              next.general.localization.categories.uiLabels = language;
              next.general.localization.categories.workflowTerms = language;
              next.general.localization.workflowTermsPolicy =
                language === "en" ? "keep_english" : "translate";
            }
          })
        }
        options={options}
        value={resolveLanguageValue(localization.categories[category.key])}
      />
    </div>
  );
}

function resolveLanguageValue(value: string): string {
  return value === "source" ? "en" : value;
}
