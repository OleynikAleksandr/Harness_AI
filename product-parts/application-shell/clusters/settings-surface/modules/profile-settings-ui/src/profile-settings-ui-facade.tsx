import { useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ProfileCreateFlow } from "./profile-create-flow.js";
import { ProfileList } from "./profile-list.js";

export function ProfileSettingsUiFacade() {
  const { t } = useBrowserLocalization();
  const [refreshToken, setRefreshToken] = useState(0);
  return (
    <div className="settings-reference-stack">
      <section className="settings-card">
        <div className="settings-card-header">
          <h3>
            {t(
              "ui_labels",
              "settings.profileCreator.title",
              "Session Profiles"
            )}
          </h3>
        </div>
        <p className="settings-description">
          {t(
            "ui_helper_text",
            "settings.profileCreator.description",
            "Session profiles define the workflow instructions and tooling categories a new session starts with. Profile documents live in ~/.harness-ai/Profiles and are plain files owned by you."
          )}
        </p>
      </section>
      <ProfileCreateFlow
        onCreated={() => setRefreshToken((current) => current + 1)}
      />
      <ProfileList key={refreshToken} />
    </div>
  );
}
