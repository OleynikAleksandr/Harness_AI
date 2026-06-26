import type {
  GeneralResponseMode,
  HarnessSettings,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  SettingsButton,
  SettingsCard,
  SettingsSelect,
  SettingsTextarea,
  SettingsToggle,
} from "./settings-reference-controls.js";

type GeneralSettings = HarnessSettings["general"];
type LocalizationSettings = GeneralSettings["localization"];
type LocalizationCategoryKey = keyof LocalizationSettings["categories"];

const RESPONSE_MODE_OPTIONS: readonly {
  description: string;
  label: string;
  value: GeneralResponseMode;
}[] = [
  {
    description:
      "Force a JSON-shaped final answer using the editable strict schema.",
    label: "Strict",
    value: "strict",
  },
  {
    description:
      "Allow free commentary during the turn and keep structure only for terminal output.",
    label: "Hybrid",
    value: "hybrid",
  },
  {
    description:
      "Diagnostic mode for new models: avoid hard schema pressure on live turns.",
    label: "Debug/Raw",
    value: "debug_raw",
  },
];

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

  return (
    <div className="settings-reference-stack">
      <SettingsCard title="Response Mode">
        <p className="settings-description">
          Control how Codex turns are shaped before they reach the provider. Use
          `Hybrid` as the safe default for workflow sessions and switch to
          `Debug/Raw` when investigating new model behavior.
        </p>
        <div className="settings-list">
          {RESPONSE_MODE_OPTIONS.map((option) => (
            <button
              className={
                general.responsePolicy.mode === option.value
                  ? "active settings-option-row"
                  : "settings-option-row"
              }
              key={option.value}
              onClick={() =>
                update((next) => {
                  next.general.responsePolicy.mode = option.value;
                })
              }
              type="button"
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
        {general.responsePolicy.mode === "strict" ? (
          <div className="settings-reference-stack tight">
            <SettingsTextarea
              label="Strict Schema JSON"
              onChange={(schemaText) =>
                update((next) => {
                  next.general.responsePolicy.strictOutput.schemaText =
                    schemaText;
                })
              }
              value={general.responsePolicy.strictOutput.schemaText}
            />
            <SettingsTextarea
              label="Strict Instruction Text"
              onChange={(instructionText) =>
                update((next) => {
                  next.general.responsePolicy.strictOutput.instructionText =
                    instructionText;
                })
              }
              value={general.responsePolicy.strictOutput.instructionText}
            />
          </div>
        ) : null}
      </SettingsCard>

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
            options={TRANSLATION_ENGINE_OPTIONS}
            value={localization.engineId}
          />
          <SettingsSelect
            label="Reasoning Translation Engine"
            onChange={(reasoningEngineId) =>
              update((next) => {
                next.general.localization.reasoningEngineId = reasoningEngineId;
              })
            }
            options={TRANSLATION_ENGINE_OPTIONS}
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
            {coreRestartBusy ? "Restarting..." : "Restart Core"}
          </SettingsButton>
          <span className="settings-core-status">{coreRestartStatus}</span>
        </div>
      </SettingsCard>
    </div>
  );
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
