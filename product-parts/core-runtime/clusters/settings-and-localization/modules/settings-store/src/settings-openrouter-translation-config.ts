import type { OpenRouterTranslationEnginesConfig } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-factory.js";
import type { HarnessSettings } from "./settings-store-facade.js";

export function resolveOpenRouterTranslationEnginesConfig(
  settings: HarnessSettings
): OpenRouterTranslationEnginesConfig {
  const openRouter = settings.providers.openRouter;
  return {
    apiKey: openRouter.apiKey,
    baseUrl: openRouter.baseUrl,
    reasoningTranslation: openRouter.translationProfiles.reasoningTranslation,
    uiTranslation: openRouter.translationProfiles.uiTranslation,
  };
}
