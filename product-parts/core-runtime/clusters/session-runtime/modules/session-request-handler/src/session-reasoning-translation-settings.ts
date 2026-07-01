import type { ReasoningTranslationSettingsSnapshot } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import { resolveOpenRouterTranslationEnginesConfig } from "../../../../settings-and-localization/modules/settings-store/src/settings-openrouter-translation-config.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export function resolveReasoningTranslationSettingsSnapshot(
  workspacePath: string | undefined
): ReasoningTranslationSettingsSnapshot | null {
  if (!workspacePath) {
    return null;
  }
  const settings = settingsStoreFacade.getSettings(workspacePath);
  return {
    ...settings.general.localization,
    openRouter: resolveOpenRouterTranslationEnginesConfig(settings),
  };
}
