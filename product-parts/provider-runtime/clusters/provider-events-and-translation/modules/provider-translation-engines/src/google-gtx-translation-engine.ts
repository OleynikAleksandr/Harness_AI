import type {
  ProviderTranslationEngine,
  ProviderTranslationReporter,
  ProviderTranslationRequest,
  ProviderTranslationResult,
} from "./provider-translation-engines-facade.js";
import { parseGoogleTranslateResponse } from "./translation-response-parser.js";

const GOOGLE_GTX_ENGINE_ID = "google-gtx";
const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t";
const GOOGLE_TRANSLATE_POST_HEADERS = {
  "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
} as const;
const GOOGLE_TRANSLATE_MAX_GET_URL_LENGTH = 1800;
const DEFAULT_TIMEOUT_MS = 15_000;

interface GoogleGtxTranslationEngineOptions {
  readonly reporter?: ProviderTranslationReporter;
}

export class GoogleGtxTranslationEngine implements ProviderTranslationEngine {
  readonly id = GOOGLE_GTX_ENGINE_ID;
  private readonly reporter?: ProviderTranslationReporter;

  constructor(options: GoogleGtxTranslationEngineOptions = {}) {
    this.reporter = options.reporter;
  }

  async translate(
    request: ProviderTranslationRequest
  ): Promise<ProviderTranslationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
    const query = new URLSearchParams({
      q: request.text,
      sl: request.sourceLanguage,
      tl: request.targetLanguage,
    }).toString();
    const usePost =
      GOOGLE_TRANSLATE_URL.length + 1 + query.length >
      GOOGLE_TRANSLATE_MAX_GET_URL_LENGTH;

    try {
      const response = await fetch(
        usePost ? GOOGLE_TRANSLATE_URL : `${GOOGLE_TRANSLATE_URL}&${query}`,
        usePost
          ? {
              body: query,
              headers: GOOGLE_TRANSLATE_POST_HEADERS,
              method: "POST",
              signal: controller.signal,
            }
          : { signal: controller.signal }
      );

      if (!response.ok) {
        this.warn("Google GTX translation returned non-OK", {
          status: response.status,
          transport: usePost ? "post" : "get",
        });
        return fallbackResult(request, "non_ok_response");
      }

      const translatedText = parseGoogleTranslateResponse(
        await response.json()
      );
      if (!translatedText) {
        this.warn("Google GTX translation response was empty");
        return fallbackResult(request, "empty_translation");
      }

      return translatedResult(request, translatedText);
    } catch (error) {
      this.warn("Google GTX translation failed", {
        error: error instanceof Error ? error.message : String(error),
        transport: usePost ? "post" : "get",
      });
      return fallbackResult(request, "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  private warn(message: string, metadata: Record<string, unknown> = {}): void {
    this.reporter?.warn(message, { engine: this.id, ...metadata });
  }
}

function fallbackResult(
  request: ProviderTranslationRequest,
  errorCode: string
): ProviderTranslationResult {
  return {
    engine: GOOGLE_GTX_ENGINE_ID,
    errorCode,
    finalText: request.text,
    originalText: request.text,
    sourceLanguage: request.sourceLanguage,
    status: "fallback",
    targetLanguage: request.targetLanguage,
    translatedText: null,
  };
}

function translatedResult(
  request: ProviderTranslationRequest,
  translatedText: string
): ProviderTranslationResult {
  return {
    engine: GOOGLE_GTX_ENGINE_ID,
    finalText: translatedText,
    originalText: request.text,
    sourceLanguage: request.sourceLanguage,
    status: "translated",
    targetLanguage: request.targetLanguage,
    translatedText,
  };
}
