// Shared provider-tab card helpers, split from settings-tab-content.tsx for
// the 500-line implementation cap. Presentation only: every card edits the
// Core-owned settings snapshot through the caller's update mutator.

import type { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ModelRows, SettingsCard } from "./settings-reference-controls.js";

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
  rowControl,
  title,
  value,
}: {
  description: string;
  note?: string;
  onChange: (value: string) => void;
  options: Parameters<typeof ModelRows>[0]["options"];
  rowControl?: Parameters<typeof ModelRows>[0]["rowControl"];
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
        {...(rowControl ? { rowControl } : {})}
        value={value}
      />
    </SettingsCard>
  );
}
