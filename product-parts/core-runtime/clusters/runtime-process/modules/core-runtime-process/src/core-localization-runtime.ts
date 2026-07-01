import { homedir } from "node:os";
import path from "node:path";
import { ProviderTranslationEnginesFacade } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.js";
import {
  createProviderTranslationEngines,
  type OpenRouterTranslationEnginesConfig,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-factory.js";
import {
  LocalizationRuntimeFacade,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  UserGlossaryStore,
} from "../../../../settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js";
import type { HarnessSettings } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export async function materializeCoreLocalizationRuntimePayload(
  settings: HarnessSettings
): Promise<LocalizationRuntimePayload> {
  const localizationRootDirectory = resolveCoreLocalizationRootDirectory();
  const glossary = settings.general.localization.glossaryEnabled
    ? await new UserGlossaryStore({
        glossaryDirectory: path.join(localizationRootDirectory, "glossary"),
      }).load()
    : { preserve: [] };
  return new LocalizationRuntimeFacade({
    glossaryRules: glossary.preserve.map((sourceTerm) => ({
      kind: "preserve",
      sourceTerm,
    })),
    localizationRootDirectory,
    translationFacade: new ProviderTranslationEnginesFacade({
      engines: createProviderTranslationEngines(
        resolveOpenRouterTranslationEnginesConfig(settings)
      ),
    }),
  }).materializeRuntimePayload(
    resolveCoreLocalizationRuntimeSettings(settings)
  );
}

export function resolveCoreLocalizationRuntimeSettings(
  settings: HarnessSettings
): LocalizationRuntimeSettingsSnapshot {
  const localization = settings.general.localization;
  const categories = localization.categories;
  return {
    categories: {
      artifacts_for_the_user: firstText(
        categories.artifactsForTheUser,
        categories.interactiveTemplates
      ),
      interactive_templates: firstText(
        categories.interactiveTemplates,
        categories.artifactsForTheUser
      ),
      messages_for_the_user: firstText(
        categories.systemFeedback,
        categories.messagesForTheUser
      ),
      reasoning: firstText(categories.reasoning),
      system_feedback: firstText(
        categories.systemFeedback,
        categories.messagesForTheUser
      ),
      ui_helper_text: firstText(
        categories.userGuidance,
        categories.uiHelperText
      ),
      ui_interface: firstText(categories.uiInterface, categories.uiLabels),
      ui_labels: firstText(
        categories.uiInterface,
        categories.uiLabels,
        categories.workflowTerms
      ),
      user_guidance: firstText(
        categories.userGuidance,
        categories.uiHelperText
      ),
      workflow_terms: firstText(categories.workflowTerms, categories.uiLabels),
    },
    defaultLanguage: firstText(localization.defaultLanguage) || "en",
    uiEngineId: firstText(localization.uiEngineId, localization.engineId),
    workflowTermsPolicy: localization.workflowTermsPolicy,
  };
}

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

export function resolveCoreLocalizationRootDirectory(): string {
  return path.join(harnessHome(), "Localization");
}

function harnessHome(): string {
  return (
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai")
  );
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}
