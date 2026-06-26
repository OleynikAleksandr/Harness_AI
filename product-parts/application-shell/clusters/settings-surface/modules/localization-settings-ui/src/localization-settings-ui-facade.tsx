import type {
  HarnessSettings,
  LocalizationWorkflowTermsPolicy
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
  { key: "interactiveTemplates", label: "Interactive Templates" }
];

export function LocalizationSettingsUiFacade({
  localization,
  onChange
}: LocalizationSettingsUiFacadeProps) {
  const update = (patch: Partial<LocalizationSettings>) => {
    onChange({ ...localization, ...patch });
  };
  const updateCategory = (key: LocalizationCategoryKey, value: string) => {
    update({
      categories: {
        ...localization.categories,
        [key]: value
      }
    });
  };

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>Localization</h3>
      </div>
      <div className="settings-grid two">
        <label className="settings-field">
          <span>Default Language</span>
          <LanguageSelect
            value={localization.defaultLanguage}
            onChange={(value) => update({ defaultLanguage: value })}
          />
        </label>
        <label className="settings-field">
          <span>UI Engine</span>
          <input
            value={localization.engineId}
            onChange={(event) => update({ engineId: event.target.value })}
          />
        </label>
        <label className="settings-field">
          <span>Reasoning Engine</span>
          <input
            value={localization.reasoningEngineId}
            onChange={(event) =>
              update({ reasoningEngineId: event.target.value })
            }
          />
        </label>
        <label className="settings-field">
          <span>Workflow Terms</span>
          <select
            value={localization.workflowTermsPolicy}
            onChange={(event) =>
              update({
                workflowTermsPolicy: event.target
                  .value as LocalizationWorkflowTermsPolicy
              })
            }
          >
            <option value="keep_english">Keep English</option>
            <option value="translate">Translate</option>
          </select>
        </label>
      </div>
      <label className="settings-check">
        <input
          checked={localization.glossaryEnabled}
          type="checkbox"
          onChange={(event) => update({ glossaryEnabled: event.target.checked })}
        />
        <span>Glossary Enabled</span>
      </label>
      <div className="settings-grid two">
        {CATEGORY_LABELS.map((category) => (
          <label className="settings-field" key={category.key}>
            <span>{category.label}</span>
            <LanguageSelect
              value={localization.categories[category.key]}
              onChange={(value) => updateCategory(category.key, value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function LanguageSelect({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {LANGUAGE_OPTIONS.map((language) => (
        <option key={language} value={language}>
          {language.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
