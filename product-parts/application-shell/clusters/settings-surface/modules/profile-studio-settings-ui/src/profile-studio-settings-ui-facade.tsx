import { PROFILE_CREATOR_AGENT_OPTIONS } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import type { ProfileCreatorAgentId } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

interface ProfileStudioSettingsUiFacadeProps {
  onChange: (agentId: ProfileCreatorAgentId) => void;
  value: ProfileCreatorAgentId;
}

export function ProfileStudioSettingsUiFacade({
  onChange,
  value,
}: ProfileStudioSettingsUiFacadeProps) {
  const { t } = useBrowserLocalization();
  const selected =
    PROFILE_CREATOR_AGENT_OPTIONS.find((option) => option.id === value) ??
    PROFILE_CREATOR_AGENT_OPTIONS[0];
  const commitValue = (nextId: string) => {
    const option = PROFILE_CREATOR_AGENT_OPTIONS.find(
      (candidate) => candidate.id === nextId
    );
    if (option && option.id !== value) {
      onChange(option.id);
    }
  };

  return (
    <div className="settings-reference-stack">
      <section className="settings-card">
        <div className="settings-card-header">
          <h3>
            {t(
              "ui_labels",
              "settings.profileStudio.defaultCreatorAgent",
              "Default Profile Creator Agent"
            )}
          </h3>
        </div>
        <p className="settings-description">
          {t(
            "ui_helper_text",
            "settings.profileStudio.defaultCreatorAgent.description",
            "Choose the managed Creator Agent identity saved as the application-wide Profile Studio default."
          )}
        </p>
        <label className="settings-field">
          <span>
            {t(
              "ui_labels",
              "settings.profileStudio.creatorAgent",
              "Creator Agent"
            )}
          </span>
          <select
            onChange={(event) => commitValue(event.currentTarget.value)}
            onInput={(event) => commitValue(event.currentTarget.value)}
            value={value}
          >
            {PROFILE_CREATOR_AGENT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <p className="settings-helper">
            {`Provider: ${selected.providerId} · Model: ${selected.model} · Reasoning: ${selected.reasoningEffort}`}
          </p>
        ) : null}
      </section>
    </div>
  );
}
