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

/** On-disk shape of `Localization/catalogs/<category>/<language>.json`. */
interface CachedBundleFile {
  readonly engineId: string;
  readonly entries: Record<string, string>;
  readonly language: string;
  readonly source: LocalizationResolvedRuntimeBundle["source"];
  /** Source text of each entry whose translation in `entries` is valid. */
  readonly sourceEntries: Record<string, string>;
  readonly sourceFingerprint: string;
}

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
    settings: LocalizationRuntimeSettingsSnapshot,
    force = false
  ): Promise<LocalizationRuntimePayload> {
    const sourceFingerprint = this.sourceRegistry.fingerprint();
    const cacheKey = JSON.stringify({ settings, sourceFingerprint });
    const cached = force ? null : await this.readCachedPayload(cacheKey);
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
            await this.materializeBundle(
              category,
              settings,
              sourceFingerprint,
              force
            ),
          ])
        )
      ) as Record<LocalizationCategoryId, LocalizationResolvedRuntimeBundle>,
    };
    // A payload with untranslated fallbacks is not reused: the next pass
    // retries the failed entries instead of keeping English text.
    const complete = Object.values(payload.resolvedBundlesByCategory).every(
      (bundle) => !bundle.error
    );
    if (complete) {
      await this.writeCachedPayload(cacheKey, payload);
    }
    return payload;
  }

  private async materializeBundle(
    category: LocalizationCategoryId,
    settings: LocalizationRuntimeSettingsSnapshot,
    sourceFingerprint: string,
    force: boolean
  ): Promise<LocalizationResolvedRuntimeBundle> {
    const language = resolveLanguage(category, settings);
    const engineId = settings.uiEngineId.trim() || "google-gtx";
    const dictionary = this.sourceRegistry.resolve(category);
    const cached =
      force || language === "en"
        ? null
        : await this.readCachedBundle(category, language, engineId);
    if (
      cached?.sourceFingerprint === sourceFingerprint &&
      cached.source === "materialized"
    ) {
      return { entries: cached.entries, language, source: "materialized" };
    }
    if (!(dictionary && this.translationFacade) || language === "en") {
      return {
        entries: dictionary?.entries ?? {},
        language,
        source: "source_fallback",
      };
    }

    // Incremental refresh: an entry whose source text is unchanged since the
    // cached translation keeps it; only new, changed or failed entries are
    // sent to the translation engine.
    const entries: Record<string, string> = {};
    const sourceEntries: Record<string, string> = {};
    let error: string | null = null;
    for (const [messageId, sourceText] of Object.entries(dictionary.entries)) {
      const reused = reusableTranslation(cached, messageId, sourceText);
      if (reused !== null) {
        entries[messageId] = reused;
        sourceEntries[messageId] = sourceText;
        continue;
      }
      const translated = await this.translateEntry(
        category,
        language,
        engineId,
        sourceText
      );
      if ("text" in translated) {
        entries[messageId] = translated.text;
        sourceEntries[messageId] = sourceText;
      } else {
        entries[messageId] = sourceText;
        error = translated.error;
      }
    }

    const bundle = {
      entries,
      error,
      language,
      source: error ? "source_fallback" : "materialized",
    } satisfies LocalizationResolvedRuntimeBundle;
    await this.writeCachedBundle(category, bundle, {
      engineId,
      sourceEntries,
      sourceFingerprint,
    });
    return bundle;
  }

  private async translateEntry(
    category: LocalizationCategoryId,
    language: string,
    engineId: string,
    sourceText: string
  ): Promise<{ readonly error: string } | { readonly text: string }> {
    const protectedText = this.glossaryProtector.protect(sourceText, {
      category,
      rules: this.glossaryRules,
      targetLanguage: language,
    });
    const result = await this.translationFacade?.translate({
      category,
      chunkingMode: "disabled",
      engineId,
      sourceLanguage: DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
      targetLanguage: language,
      text: protectedText.protectedText,
    });
    if (result?.status !== "translated") {
      return { error: result?.errorCode ?? "translation_fallback" };
    }
    return {
      text: this.glossaryProtector.restore(
        result.finalText,
        language,
        protectedText.tokens
      ),
    };
  }

  /** Reads the cached bundle of the same target language and engine. */
  private async readCachedBundle(
    category: LocalizationCategoryId,
    language: string,
    engineId: string
  ): Promise<CachedBundleFile | null> {
    if (!this.localizationRootDirectory) {
      return null;
    }
    try {
      const cached = JSON.parse(
        await fs.readFile(this.bundlePath(category, language), "utf8")
      ) as Partial<CachedBundleFile>;
      return cached.language === language &&
        cached.engineId === engineId &&
        cached.entries
        ? {
            engineId,
            entries: cached.entries,
            language,
            source: cached.source ?? "source_fallback",
            sourceEntries: cached.sourceEntries ?? {},
            sourceFingerprint: cached.sourceFingerprint ?? "",
          }
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Writes the bundle with the source text of every successfully translated
   * entry, so a later pass can reuse them. A bundle with failed entries is
   * stored too; its `source_fallback` state makes the next pass retry them.
   */
  private async writeCachedBundle(
    category: LocalizationCategoryId,
    bundle: LocalizationResolvedRuntimeBundle,
    provenance: Pick<
      CachedBundleFile,
      "engineId" | "sourceEntries" | "sourceFingerprint"
    >
  ): Promise<void> {
    if (!this.localizationRootDirectory || bundle.language === "en") {
      return;
    }
    const bundlePath = this.bundlePath(category, bundle.language);
    await fs.mkdir(path.dirname(bundlePath), { recursive: true });
    await fs.writeFile(
      bundlePath,
      `${JSON.stringify({ category, ...provenance, ...bundle }, null, 2)}\n`,
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

function reusableTranslation(
  cached: CachedBundleFile | null,
  messageId: string,
  sourceText: string
): string | null {
  const translated = cached?.entries[messageId];
  return cached?.sourceEntries[messageId] === sourceText &&
    typeof translated === "string"
    ? translated
    : null;
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
