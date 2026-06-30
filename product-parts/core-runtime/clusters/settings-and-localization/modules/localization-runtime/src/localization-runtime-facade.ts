import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
  type LocalizationSourceDictionaryEntries,
  SourceDictionaryRegistry,
} from "./source-dictionary-registry.js";

export type LocalizationWorkflowTermsPolicy = "keep_english" | "translate";

export type LocalizationCategoryLanguageSelectionMap = Readonly<
  Record<LocalizationCategoryId, string>
>;

export interface LocalizationEngineLanguageCatalog {
  readonly engineId: string;
  readonly languages: readonly {
    readonly code: string;
    readonly label: string;
  }[];
}

export interface LocalizationRuntimeSettingsSnapshot {
  readonly categories: Partial<Record<LocalizationCategoryId, string>>;
  readonly defaultLanguage: string;
  readonly uiEngineId: string;
  readonly workflowTermsPolicy: LocalizationWorkflowTermsPolicy;
}

export interface LocalizationResolvedRuntimeBundle {
  readonly entries: LocalizationSourceDictionaryEntries;
  readonly error?: string | null;
  readonly language: string;
  readonly source: "materialized" | "source_fallback";
}

export interface LocalizationRuntimePayload {
  readonly activeEngineId: string;
  readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  readonly resolvedBundlesByCategory: Readonly<
    Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>
  >;
}

interface LocalizationRuntimeFacadeOptions {
  readonly engineCatalogs?: readonly LocalizationEngineLanguageCatalog[];
  readonly sourceDictionaries?: readonly LocalizationSourceDictionary[];
}

export class LocalizationRuntimeFacade {
  private readonly engineCatalogs: readonly LocalizationEngineLanguageCatalog[];
  private readonly sourceRegistry: SourceDictionaryRegistry;

  constructor(options: LocalizationRuntimeFacadeOptions = {}) {
    this.engineCatalogs = options.engineCatalogs ?? [];
    this.sourceRegistry = new SourceDictionaryRegistry(
      options.sourceDictionaries
    );
  }

  getSourceText(
    category: LocalizationCategoryId,
    messageId: string
  ): string | null {
    return this.sourceRegistry.getMessage(category, messageId);
  }

  createRuntimePayload(
    settings: LocalizationRuntimeSettingsSnapshot
  ): LocalizationRuntimePayload {
    return {
      activeEngineId: settings.uiEngineId.trim() || "google-gtx",
      availableEngines: this.engineCatalogs,
      resolvedBundlesByCategory: Object.fromEntries(
        LOCALIZATION_CATEGORY_IDS.map((category) => [
          category,
          this.sourceFallbackBundle(category, settings),
        ])
      ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>,
    };
  }

  private sourceFallbackBundle(
    category: LocalizationCategoryId,
    settings: LocalizationRuntimeSettingsSnapshot
  ): LocalizationResolvedRuntimeBundle {
    const dictionary = this.sourceRegistry.resolve(category);
    return {
      entries: dictionary?.entries ?? {},
      language:
        settings.categories[category]?.trim() ||
        settings.defaultLanguage.trim() ||
        DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
      source: "source_fallback",
    };
  }
}

export { GlossaryProtector, type GlossaryRule } from "./glossary-protector.js";
export {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  type LocalizationCategoryId,
  type LocalizationSourceDictionary,
  type LocalizationSourceDictionaryEntries,
} from "./source-dictionary-registry.js";
export { UserGlossaryStore } from "./user-glossary-store.js";
