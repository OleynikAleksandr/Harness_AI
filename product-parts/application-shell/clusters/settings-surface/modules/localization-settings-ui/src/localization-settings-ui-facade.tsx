import type {
  HarnessSettings,
  LocalizationWorkflowTermsPolicy,
} from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { LANGUAGE_OPTIONS } from "../../provider-settings-ui/src/settings-model-options.js";

type LocalizationSettings = HarnessSettings["general"]["localization"];
type LocalizationCategoryKey = keyof LocalizationSettings["categories"];

interface LocalizationSettingsUiFacadeProps {
  localization: LocalizationSettings;
  onChange: (localization: LocalizationSettings) => void;
}

const CATEGORY_LABELS: ReadonlyArray<{
  key: LocalizationCategoryKey;
  label: string;
}> = [
  { key: "uiInterface", label: "UI Interface" },
  { key: "uiHelperText", label: "UI Helper Text" },
  { key: "workflowTerms", label: "Workflow Terms" },
  { key: "systemFeedback", label: "System Feedback" },
  { key: "userGuidance", label: "User Guidance" },
  { key: "reasoning", label: "Reasoning" },
  { key: "artifactsForTheUser", label: "Artifacts" },
  { key: "interactiveTemplates", label: "Interactive Templates" },
];

export function LocalizationSettingsUiFacade({
  localization,
  onChange,
}: LocalizationSettingsUiFacadeProps) {
  const update = (patch: Partial<LocalizationSettings>) => {
    onChange({ ...localization, ...patch });
  };
  const updateCategory = (key: LocalizationCategoryKey, value: string) => {
    update({
      categories: {
        ...localization.categories,
        [key]: value,
      },
    });
  };

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>Localization</h3>
      </div>
      <div className="settings-grid two">
        <label
          className="settings-field"
          htmlFor="localization-default-language"
        >
          <span>Default Language</span>
          <LanguageSelect
            id="localization-default-language"
            onChange={(value) => update({ defaultLanguage: value })}
            value={localization.defaultLanguage}
          />
        </label>
        <label className="settings-field" htmlFor="localization-ui-engine">
          <span>UI Engine</span>
          <input
            id="localization-ui-engine"
            onChange={(event) => update({ engineId: event.target.value })}
            value={localization.engineId}
          />
        </label>
        <label
          className="settings-field"
          htmlFor="localization-reasoning-engine"
        >
          <span>Reasoning Engine</span>
          <input
            id="localization-reasoning-engine"
            onChange={(event) =>
              update({ reasoningEngineId: event.target.value })
            }
            value={localization.reasoningEngineId}
          />
        </label>
        <label className="settings-field" htmlFor="localization-workflow-terms">
          <span>Workflow Terms</span>
          <select
            id="localization-workflow-terms"
            onChange={(event) =>
              update({
                workflowTermsPolicy: event.target
                  .value as LocalizationWorkflowTermsPolicy,
              })
            }
            value={localization.workflowTermsPolicy}
          >
            <option value="keep_english">Keep English</option>
            <option value="translate">Translate</option>
          </select>
        </label>
      </div>
      <label className="settings-check">
        <input
          checked={localization.glossaryEnabled}
          onChange={(event) =>
            update({ glossaryEnabled: event.target.checked })
          }
          type="checkbox"
        />
        <span>Glossary Enabled</span>
      </label>
      <div className="settings-grid two">
        {CATEGORY_LABELS.map((category) => {
          const id = `localization-category-${category.key}`;
          return (
            <label className="settings-field" htmlFor={id} key={category.key}>
              <span>{category.label}</span>
              <LanguageSelect
                id={id}
                onChange={(value) => updateCategory(category.key, value)}
                value={localization.categories[category.key]}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

function LanguageSelect({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {LANGUAGE_OPTIONS.map((language) => (
        <option key={language} value={language}>
          {language.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
