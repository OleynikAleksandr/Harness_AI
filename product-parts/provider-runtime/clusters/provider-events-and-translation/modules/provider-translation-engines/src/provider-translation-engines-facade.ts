import { GoogleGtxTranslationEngine } from "./google-gtx-translation-engine.js";
import { normalizeTranslationTextFormatting } from "./translation-text-format-normalizer.js";

const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";

export type ProviderTranslationStatus = "translated" | "fallback" | "skipped";
export type ProviderTranslationCategory = "document" | "generic" | "reasoning";
export type ProviderTranslationChunkingMode = "auto" | "disabled";

export interface ProviderTranslationRequest {
  readonly category?: ProviderTranslationCategory | string;
  readonly chunkingMode?: ProviderTranslationChunkingMode;
  readonly engineId?: string;
  readonly providerId?: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly text: string;
  readonly timeoutMs?: number;
}

export interface ProviderTranslationResult {
  readonly engine: string;
  readonly errorCode?: string;
  readonly finalText: string;
  readonly originalText: string;
  readonly sourceLanguage: string;
  readonly status: ProviderTranslationStatus;
  readonly targetLanguage: string;
  readonly translatedText: string | null;
}

export interface ProviderTranslationEngine {
  readonly id: string;
  translate(
    request: ProviderTranslationRequest
  ): Promise<ProviderTranslationResult>;
}

export interface ProviderTranslationReporter {
  warn(message: string, metadata?: Record<string, unknown>): void;
}

interface ProviderTranslationEnginesOptions {
  readonly defaultEngineId?: string;
  readonly engines?: readonly ProviderTranslationEngine[];
  readonly reporter?: ProviderTranslationReporter;
}

export class ProviderTranslationEnginesFacade {
  private readonly defaultEngineId?: string;
  private readonly engines = new Map<string, ProviderTranslationEngine>();
  private readonly reporter?: ProviderTranslationReporter;

  constructor(options: ProviderTranslationEnginesOptions = {}) {
    this.defaultEngineId =
      options.defaultEngineId ?? DEFAULT_TRANSLATION_ENGINE_ID;
    this.reporter = options.reporter;
    for (const engine of options.engines ?? [
      new GoogleGtxTranslationEngine({ reporter: this.reporter }),
    ]) {
      this.registerEngine(engine);
    }
  }

  registerEngine(engine: ProviderTranslationEngine): void {
    this.engines.set(engine.id, engine);
  }

  async translate(
    request: ProviderTranslationRequest
  ): Promise<ProviderTranslationResult> {
    const normalized = normalizeRequest(request);
    if (!normalized) {
      return createSkippedResult(request);
    }

    const explicitEngineRequested = hasText(request.engineId);
    const engine = this.resolveEngine(normalized.engineId, {
      allowDefaultFallback: !explicitEngineRequested,
    });
    if (!engine) {
      this.reporter?.warn("Translation engine unavailable", {
        engineId: normalized.engineId,
        explicitEngineRequested,
      });
      return createFallbackResult(normalized, normalized.engineId, "no_engine");
    }

    return normalizeTranslatedResult(await engine.translate(normalized));
  }

  private resolveEngine(
    engineId: string | undefined,
    options: { readonly allowDefaultFallback: boolean }
  ): ProviderTranslationEngine | null {
    if (engineId) {
      const explicit = this.engines.get(engineId);
      if (explicit) {
        return explicit;
      }
      if (!options.allowDefaultFallback) {
        return null;
      }
    }

    if (this.defaultEngineId) {
      return this.engines.get(this.defaultEngineId) ?? null;
    }

    return this.engines.values().next().value ?? null;
  }
}

function normalizeRequest(
  request: ProviderTranslationRequest
): ProviderTranslationRequest | null {
  const text = request.text.trim();
  const sourceLanguage = request.sourceLanguage.trim();
  const targetLanguage = request.targetLanguage.trim();
  if (!(text && sourceLanguage && targetLanguage)) {
    return null;
  }
  if (sourceLanguage === targetLanguage) {
    return null;
  }
  return {
    ...request,
    engineId: request.engineId?.trim() || undefined,
    sourceLanguage,
    targetLanguage,
    text,
  };
}

function createSkippedResult(
  request: ProviderTranslationRequest
): ProviderTranslationResult {
  return {
    engine: request.engineId?.trim() || "unresolved",
    finalText: request.text,
    originalText: request.text,
    sourceLanguage: request.sourceLanguage,
    status: "skipped",
    targetLanguage: request.targetLanguage,
    translatedText: null,
  };
}

function createFallbackResult(
  request: ProviderTranslationRequest,
  engine: string | undefined,
  errorCode: string
): ProviderTranslationResult {
  return {
    engine: engine || "unresolved",
    errorCode,
    finalText: request.text,
    originalText: request.text,
    sourceLanguage: request.sourceLanguage,
    status: "fallback",
    targetLanguage: request.targetLanguage,
    translatedText: null,
  };
}

function normalizeTranslatedResult(
  result: ProviderTranslationResult
): ProviderTranslationResult {
  if (result.status !== "translated") {
    return result;
  }
  const finalText = normalizeTranslationTextFormatting(result.finalText);
  const translatedText =
    result.translatedText === null
      ? null
      : normalizeTranslationTextFormatting(result.translatedText);
  return finalText === result.finalText &&
    translatedText === result.translatedText
    ? result
    : { ...result, finalText, translatedText };
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
