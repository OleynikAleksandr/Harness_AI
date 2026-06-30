import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  ManualIntegerField,
  SettingsCard,
} from "./settings-reference-controls.js";

export function SessionContinuityCard({
  onChange,
  title,
  value,
}: {
  onChange: (value: number) => void;
  title: string;
  value: number;
}) {
  const { t } = useBrowserLocalization();
  return (
    <SettingsCard title={title}>
      <p className="settings-description">
        {t(
          "ui_helper_text",
          "settings.provider.sessionContinuity.description",
          "When the remaining context window drops to or below this percentage, Harness AI can automatically wrap up the current session and start a new one. Default: 30%."
        )}
      </p>
      <ManualIntegerField
        label={t(
          "ui_labels",
          "settings.provider.sessionContinuity.threshold",
          "Remaining context threshold (%)"
        )}
        max={80}
        min={5}
        onChange={onChange}
        value={value}
      />
    </SettingsCard>
  );
}
