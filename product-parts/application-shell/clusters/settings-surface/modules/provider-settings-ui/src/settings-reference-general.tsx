import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
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
  { label: "Default Language (English)", value: "en" },
  { label: "Russian (ru)", value: "ru" },
  { label: "Ukrainian (uk)", value: "uk" },
  { label: "Spanish (es)", value: "es" },
  { label: "German (de)", value: "de" },
  { label: "French (fr)", value: "fr" },
] as const;

const TRANSLATION_ENGINE_OPTIONS = [
  { label: "Google GTX Free", value: "google-gtx" },
  { label: "OpenAI Codex · GPT-5.4 Mini", value: "codex-gpt-5.4-mini" },
  {
    label: "OpenAI Codex · GPT-5.3 Codex Spark",
    value: "codex-gpt-5.3-codex-spark",
  },
  {
    label: "Anthropic Claude · Haiku 4.5",
    value: "anthropic-claude-haiku-4-5",
  },
] as const;

const OPENROUTER_REASONING_TRANSLATION_ENGINE_ID =
  "openrouter-reasoning-translation";
const OPENROUTER_UI_TRANSLATION_ENGINE_ID = "openrouter-ui-translation";

const CATEGORY_FIELDS: readonly {
  description: string;
  key: LocalizationCategoryKey;
  label: string;
}[] = [
  {
    description:
      "Buttons, tabs, section names, step names, and short interface terms.",
    key: "uiInterface",
    label: "UI Labels",
  },
  {
    description:
      "Short interface explanations and helper copy that clarifies labels and settings.",
    key: "userGuidance",
    label: "UI Helper Text",
  },
  {
    description:
      "Warnings, errors, hints, status updates, and other messages addressed to the user.",
    key: "systemFeedback",
    label: "Messages for the User",
  },
  {
    description:
      "Forms and final user-facing artifacts. Agent instructions and templates stay in English.",
    key: "artifactsForTheUser",
    label: "Artifacts for the User",
  },
  {
    description:
      "Visible Thinking and Reasoning bubbles emitted by the provider during a turn. Hidden reasoning is never translated.",
    key: "reasoning",
    label: "Reasoning",
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
  const general = settings.general;
  const localization = general.localization;
  const uiTranslationEngineOptions = translationEngineOptionsWithOpenRouter(
    "UI",
    OPENROUTER_UI_TRANSLATION_ENGINE_ID,
    settings.providers.openRouter.translationProfiles.uiTranslation.model
  );
  const reasoningTranslationEngineOptions =
    translationEngineOptionsWithOpenRouter(
      "Reasoning",
      OPENROUTER_REASONING_TRANSLATION_ENGINE_ID,
      settings.providers.openRouter.translationProfiles.reasoningTranslation
        .model
    );

  return (
    <div className="settings-reference-stack">
      <SettingsCard title="Localization">
        <p className="settings-description">
          Configure which user-facing text should stay in English and which
          should be localized for the user.
        </p>
        <p className="settings-helper">
          `Workflow Terms` now follow `UI Labels`, and `Default Language
          (English)` is the reset state for every category.
        </p>
        <div className="settings-reference-stack tight">
          <SettingsSelect
            label="UI Translation Engine"
            onChange={(engineId) =>
              update((next) => {
                next.general.localization.engineId = engineId;
              })
            }
            options={uiTranslationEngineOptions}
            value={localization.engineId}
          />
          <SettingsSelect
            label="Reasoning Translation Engine"
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
            description="Keep protected terms, provider names, and product vocabulary stable during localization."
            label="Glossary protection"
            onChange={(glossaryEnabled) =>
              update((next) => {
                next.general.localization.glossaryEnabled = glossaryEnabled;
              })
            }
          />
          <GlossaryCard
            enabled={localization.glossaryEnabled}
            onOpen={onOpenGlossary}
          />
          {CATEGORY_FIELDS.map((category) => (
            <LocalizationCategory
              category={category}
              key={category.key}
              localization={localization}
              update={update}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Core Controls">
        <p className="settings-description">
          Restart the CodeAI Hub core to trigger a fresh CLI detection cycle.
          Use this option after resolving CLI authentication or quota issues.
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
                Restarting...
              </>
            ) : (
              "Restart Core"
            )}
          </SettingsButton>
          <span className="settings-core-status">{coreRestartStatus}</span>
        </div>
      </SettingsCard>
    </div>
  );
}

function translationEngineOptionsWithOpenRouter(
  profileLabel: string,
  value: string,
  model: string
): readonly { label: string; value: string }[] {
  const trimmedModel = model.trim();
  return [
    ...TRANSLATION_ENGINE_OPTIONS,
    {
      label: `OpenRouter ${profileLabel} · ${trimmedModel || "openrouter-default"}`,
      value,
    },
  ];
}

function GlossaryCard({
  enabled,
  onOpen,
}: {
  enabled: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="settings-control-row">
      <p className="settings-control-title">Do-not-translate terms</p>
      <p className="settings-control-description">
        Open the glossary file in VS Code and edit one English term per line.
        The file is created automatically on first open and starts with common
        product and workflow terms.
      </p>
      <div className="settings-callout">
        {enabled
          ? "Glossary protection is enabled. Terms from the glossary file remain protected during localization."
          : "Glossary protection is disabled. Terms may be translated."}
      </div>
      <SettingsButton onClick={onOpen} variant="primary">
        Open glossary file
      </SettingsButton>
      <p className="settings-control-description mono">
        File is prefilled with common terms such as: Project Manager,
        Description, CODEX_HOME, questionnaire.md.
      </p>
    </div>
  );
}

function LocalizationCategory({
  category,
  localization,
  update,
}: {
  category: (typeof CATEGORY_FIELDS)[number];
  localization: LocalizationSettings;
  update: (mutator: (next: HarnessSettings) => void) => void;
}) {
  return (
    <div className="settings-control-row">
      <p className="settings-control-title">{category.label}</p>
      <p className="settings-control-description">{category.description}</p>
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
        options={LANGUAGE_OPTIONS}
        value={resolveLanguageValue(localization.categories[category.key])}
      />
    </div>
  );
}

function resolveLanguageValue(value: string): string {
  return value === "source" ? "en" : value;
}
