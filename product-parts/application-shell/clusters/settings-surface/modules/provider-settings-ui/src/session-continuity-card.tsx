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
  return (
    <SettingsCard title={title}>
      <p className="settings-description">
        When the remaining context window drops to or below this percentage,
        CodeAI Hub can automatically wrap up the current session and start a new
        one. Default: 30%.
      </p>
      <ManualIntegerField
        label="Remaining context threshold (%)"
        max={80}
        min={5}
        onChange={onChange}
        value={value}
      />
    </SettingsCard>
  );
}
