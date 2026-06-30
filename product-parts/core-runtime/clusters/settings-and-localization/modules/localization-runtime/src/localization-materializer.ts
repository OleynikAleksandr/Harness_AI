import { promises as fs } from "node:fs";
import path from "node:path";
import { GlossaryProtector, type GlossaryRule } from "./glossary-protector.js";
import type {
  LocalizationResolvedRuntimeBundle,
  LocalizationRuntimePayload,
  LocalizationRuntimeSettingsSnapshot,
} from "./localization-runtime-facade.js";
import {
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  type LocalizationCategoryId,
  type SourceDictionaryRegistry,
} from "./source-dictionary-registry.js";

export interface LocalizationTranslationFacadeContract {
  translate(request: {
    readonly category?: string;
    readonly chunkingMode?: "auto" | "disabled";
    readonly engineId?: string;
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    readonly text: string;
  }): Promise<{
    readonly errorCode?: string;
    readonly finalText: string;
    readonly status: "fallback" | "skipped" | "translated";
  }>;
}

interface LocalizationMaterializerOptions {
  readonly activeEngineCatalogs: LocalizationRuntimePayload["availableEngines"];
  readonly glossaryRules?: readonly GlossaryRule[];
  readonly localizationRootDirectory?: string;
  readonly sourceRegistry: SourceDictionaryRegistry;
  readonly translationFacade?: LocalizationTranslationFacadeContract;
}

const BOOTSTRAP_FILE_NAME = "browser-runtime-bootstrap.json";

export class LocalizationMaterializer {
  private readonly activeEngineCatalogs: LocalizationRuntimePayload["availableEngines"];
  private readonly glossaryProtector = new GlossaryProtector();
  private readonly glossaryRules: readonly GlossaryRule[];
  private readonly localizationRootDirectory?: string;
  private readonly sourceRegistry: SourceDictionaryRegistry;
  private readonly translationFacade?: LocalizationTranslationFacadeContract;

  constructor(options: LocalizationMaterializerOptions) {
    this.activeEngineCatalogs = options.activeEngineCatalogs;
    this.glossaryRules = options.glossaryRules ?? [];
    this.localizationRootDirectory = options.localizationRootDirectory;
    this.sourceRegistry = options.sourceRegistry;
    this.translationFacade = options.translationFacade;
  }

  async materializeRuntimePayload(
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationRuntimePayload> {
    const cacheKey = JSON.stringify(settings);
    const cached = await this.readCachedPayload(cacheKey);
    if (cached) {
      return cached;
    }

    const payload: LocalizationRuntimePayload = {
      activeEngineId: settings.uiEngineId.trim() || "google-gtx",
      availableEngines: this.activeEngineCatalogs,
      resolvedBundlesByCategory: Object.fromEntries(
        await Promise.all(
          LOCALIZATION_CATEGORY_IDS.map(async (category) => [
            category,
            await this.materializeBundle(category, settings),
          ])
        )
      ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>,
    };
    await this.writeCachedPayload(cacheKey, payload);
    return payload;
  }

  private async materializeBundle(
    category: LocalizationCategoryId,
    settings: LocalizationRuntimeSettingsSnapshot
  ): Promise<LocalizationResolvedRuntimeBundle> {
    const language = resolveLanguage(category, settings);
    const dictionary = this.sourceRegistry.resolve(category);
    if (!(dictionary && this.translationFacade) || language === "en") {
      return {
        entries: dictionary?.entries ?? {},
        language,
        source: "source_fallback",
      };
    }

    const entries: Record<string, string> = {};
    let error: string | null = null;
    for (const [messageId, sourceText] of Object.entries(dictionary.entries)) {
      const protectedText = this.glossaryProtector.protect(sourceText, {
        category,
        rules: this.glossaryRules,
        targetLanguage: language,
      });
      const result = await this.translationFacade.translate({
        category,
        chunkingMode: "disabled",
        engineId: settings.uiEngineId,
        sourceLanguage: DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
        targetLanguage: language,
        text: protectedText.protectedText,
      });
      if (result.status === "translated") {
        entries[messageId] = this.glossaryProtector.restore(
          result.finalText,
          language,
          protectedText.tokens
        );
      } else {
        entries[messageId] = sourceText;
        error = result.errorCode ?? "translation_fallback";
      }
    }

    return {
      entries,
      error,
      language,
      source: error ? "source_fallback" : "materialized",
    };
  }

  private async readCachedPayload(
    cacheKey: string
  ): Promise<LocalizationRuntimePayload | null> {
    if (!this.localizationRootDirectory) {
      return null;
    }
    try {
      const cached = JSON.parse(
        await fs.readFile(this.bootstrapPath, "utf8")
      ) as { cacheKey?: string; payload?: LocalizationRuntimePayload };
      return cached.cacheKey === cacheKey && cached.payload
        ? cached.payload
        : null;
    } catch {
      return null;
    }
  }

  private async writeCachedPayload(
    cacheKey: string,
    payload: LocalizationRuntimePayload
  ): Promise<void> {
    if (!this.localizationRootDirectory) {
      return;
    }
    await fs.mkdir(this.localizationRootDirectory, { recursive: true });
    await fs.writeFile(
      this.bootstrapPath,
      `${JSON.stringify({ cacheKey, payload }, null, 2)}\n`,
      "utf8"
    );
  }

  private get bootstrapPath(): string {
    return path.join(this.localizationRootDirectory ?? "", BOOTSTRAP_FILE_NAME);
  }
}

function resolveLanguage(
  category: LocalizationCategoryId,
  settings: LocalizationRuntimeSettingsSnapshot
): string {
  return (
    settings.categories[category]?.trim() ||
    settings.defaultLanguage.trim() ||
    DEFAULT_LOCALIZATION_SOURCE_LANGUAGE
  );
}
