export interface LocalizationLanguageCatalogEntry {
  readonly code: string;
  readonly label: string;
}

export interface LocalizationEngineLanguageCatalog {
  readonly engineId: string;
  readonly languages: readonly LocalizationLanguageCatalogEntry[];
}

export interface NormalizedTranslationRequest {
  readonly category?: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly text: string;
  readonly timeoutMs?: number;
}

export interface TranslationResult {
  readonly engine: string;
  readonly errorCode?: string;
  readonly finalText: string;
  readonly originalText: string;
  readonly sourceLanguage: string;
  readonly status: "fallback" | "translated";
  readonly targetLanguage: string;
  readonly translatedText: string | null;
}

export interface TranslationReporter {
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface TranslationEngine {
  readonly engineId?: string;
  translate(request: NormalizedTranslationRequest): Promise<TranslationResult>;
}

export const DEFAULT_ENGINE_LANGUAGE_CATALOGS: readonly LocalizationEngineLanguageCatalog[] =
  [
    {
      engineId: "google-gtx",
      languages: [
        { code: "en", label: "English" },
        { code: "es", label: "Spanish" },
        { code: "ru", label: "Russian" },
        { code: "uk", label: "Ukrainian" },
      ],
    },
  ];
