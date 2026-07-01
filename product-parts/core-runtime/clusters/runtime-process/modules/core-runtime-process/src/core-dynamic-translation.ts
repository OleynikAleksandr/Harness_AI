import { ProviderTranslationEnginesFacade } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.js";
import { createProviderTranslationEngines } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-factory.js";
import type { HarnessSettings } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { resolveOpenRouterTranslationEnginesConfig } from "./core-localization-runtime.js";

export async function translateDynamicCoreText(params: {
  readonly category?: string;
  readonly settings: HarnessSettings;
  readonly text: string;
}): Promise<{
  readonly error?: string;
  readonly ok: boolean;
  readonly status?: string;
  readonly text: string;
}> {
  const text = params.text.trim();
  if (!text) {
    return { ok: true, status: "skipped", text: params.text };
  }
  const localization = params.settings.general.localization;
  const targetLanguage = localization.categories.reasoning.trim() || "en";
  if (targetLanguage === "en") {
    return { ok: true, status: "skipped", text: params.text };
  }
  try {
    const result = await new ProviderTranslationEnginesFacade({
      engines: createProviderTranslationEngines(
        resolveOpenRouterTranslationEnginesConfig(params.settings)
      ),
    }).translate({
      category: params.category?.trim() || "reasoning",
      engineId: localization.reasoningEngineId,
      sourceLanguage: "en",
      targetLanguage,
      text,
    });
    return { ok: true, status: result.status, text: result.finalText };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      text: params.text,
    };
  }
}
