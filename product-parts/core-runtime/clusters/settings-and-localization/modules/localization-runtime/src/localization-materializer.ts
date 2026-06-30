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
    const sourceFingerprint = this.sourceRegistry.fingerprint();
    const cacheKey = JSON.stringify({ settings, sourceFingerprint });
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
            await this.materializeBundle(category, settings, sourceFingerprint),
          ])
        )
      ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>,
    };
    await this.writeCachedPayload(cacheKey, payload);
    return payload;
  }

  private async materializeBundle(
    category: LocalizationCategoryId,
    settings: LocalizationRuntimeSettingsSnapshot,
    sourceFingerprint: string
  ): Promise<LocalizationResolvedRuntimeBundle> {
    const language = resolveLanguage(category, settings);
    const dictionary = this.sourceRegistry.resolve(category);
    const cached = await this.readCachedBundle(
      category,
      language,
      sourceFingerprint
    );
    if (cached) {
      return cached;
    }
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

    const bundle = {
      entries,
      error,
      language,
      source: error ? "source_fallback" : "materialized",
    } satisfies LocalizationResolvedRuntimeBundle;
    await this.writeCachedBundle(category, bundle, sourceFingerprint);
    return bundle;
  }

  private async readCachedBundle(
    category: LocalizationCategoryId,
    language: string,
    sourceFingerprint: string
  ): Promise<LocalizationResolvedRuntimeBundle | null> {
    if (!this.localizationRootDirectory || language === "en") {
      return null;
    }
    try {
      const cached = JSON.parse(
        await fs.readFile(this.bundlePath(category, language), "utf8")
      ) as {
        entries?: Record<string, string>;
        language?: string;
        sourceFingerprint?: string;
        source?: string;
      };
      if (
        cached.language === language &&
        cached.sourceFingerprint === sourceFingerprint &&
        cached.source === "materialized" &&
        cached.entries
      ) {
        return {
          entries: cached.entries,
          language,
          source: "materialized",
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  private async writeCachedBundle(
    category: LocalizationCategoryId,
    bundle: LocalizationResolvedRuntimeBundle,
    sourceFingerprint: string
  ): Promise<void> {
    if (
      !this.localizationRootDirectory ||
      bundle.language === "en" ||
      bundle.source !== "materialized"
    ) {
      return;
    }
    const bundlePath = this.bundlePath(category, bundle.language);
    await fs.mkdir(path.dirname(bundlePath), { recursive: true });
    await fs.writeFile(
      bundlePath,
      `${JSON.stringify({ category, sourceFingerprint, ...bundle }, null, 2)}\n`,
      "utf8"
    );
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
    await fs.mkdir(path.dirname(this.bootstrapPath), { recursive: true });
    await fs.writeFile(
      this.bootstrapPath,
      `${JSON.stringify({ cacheKey, payload }, null, 2)}\n`,
      "utf8"
    );
  }

  private get bootstrapPath(): string {
    return path.join(
      this.localizationRootDirectory ?? "",
      "cache",
      BOOTSTRAP_FILE_NAME
    );
  }

  private bundlePath(
    category: LocalizationCategoryId,
    language: string
  ): string {
    return path.join(
      this.localizationRootDirectory ?? "",
      "catalogs",
      category,
      `${normalizeLanguage(language)}.json`
    );
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

function normalizeLanguage(language: string): string {
  return language.trim().toLowerCase() || DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
}
