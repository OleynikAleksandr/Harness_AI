import { GoogleGtxTranslationEngine } from "./google-gtx-translation-engine.js";
import { OpenRouterTranslationEngine } from "./openrouter-translation-engine.js";
import type {
  ProviderTranslationEngine,
  ProviderTranslationReporter,
} from "./provider-translation-engines-facade.js";

const OPENROUTER_UI_TRANSLATION_ENGINE_ID = "openrouter-ui-translation";
const OPENROUTER_REASONING_TRANSLATION_ENGINE_ID =
  "openrouter-reasoning-translation";
const UNSET_OPENROUTER_MODEL = "openrouter-default";

export interface OpenRouterTranslationProfileConfig {
  readonly endpointTag: string;
  readonly model: string;
}

export interface OpenRouterTranslationConnectionConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

export interface OpenRouterTranslationEnginesConfig
  extends OpenRouterTranslationConnectionConfig {
  readonly reasoningTranslation: OpenRouterTranslationProfileConfig;
  readonly uiTranslation: OpenRouterTranslationProfileConfig;
}

function isOpenRouterTranslationModelConfigured(model: string): boolean {
  const trimmed = model.trim();
  return trimmed.length > 0 && trimmed !== UNSET_OPENROUTER_MODEL;
}

function createGoogleGtxTranslationEngine(
  reporter?: ProviderTranslationReporter
): ProviderTranslationEngine {
  return new GoogleGtxTranslationEngine({ reporter });
}

function createOpenRouterTranslationEngineIfConfigured(
  id: string,
  profile: OpenRouterTranslationProfileConfig,
  connection: OpenRouterTranslationConnectionConfig,
  reporter?: ProviderTranslationReporter
): ProviderTranslationEngine | null {
  if (!isOpenRouterTranslationModelConfigured(profile.model)) {
    return null;
  }
  return new OpenRouterTranslationEngine({
    apiKey: connection.apiKey,
    baseUrl: connection.baseUrl,
    endpointTag: profile.endpointTag,
    id,
    model: profile.model,
    reporter,
  });
}

export function createProviderTranslationEngines(
  config: OpenRouterTranslationEnginesConfig,
  reporter?: ProviderTranslationReporter
): ProviderTranslationEngine[] {
  const engines = [
    createGoogleGtxTranslationEngine(reporter),
    createOpenRouterTranslationEngineIfConfigured(
      OPENROUTER_UI_TRANSLATION_ENGINE_ID,
      config.uiTranslation,
      config,
      reporter
    ),
    createOpenRouterTranslationEngineIfConfigured(
      OPENROUTER_REASONING_TRANSLATION_ENGINE_ID,
      config.reasoningTranslation,
      config,
      reporter
    ),
  ];
  return engines.filter(
    (engine): engine is ProviderTranslationEngine => engine !== null
  );
}
