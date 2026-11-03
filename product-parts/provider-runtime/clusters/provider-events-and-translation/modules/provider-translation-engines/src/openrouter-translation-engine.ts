import type {
  ProviderTranslationEngine,
  ProviderTranslationReporter,
  ProviderTranslationRequest,
  ProviderTranslationResult,
} from "./provider-translation-engines-facade.js";

const OPENROUTER_CHAT_COMPLETIONS_PATH = "/chat/completions";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_ENDPOINT_TAG = "default";
const DEFAULT_TIMEOUT_MS = 20_000;
const TRAILING_SLASHES_PATTERN = /\/+$/u;
// A pinned endpoint can disappear from OpenRouter (404 "No endpoints found")
// or be rate-limited upstream (429); the request is retried once on
// OpenRouter default routing instead of failing the translation.
const DEFAULT_ROUTING_RETRY_STATUSES = new Set([404, 429]);

interface OpenRouterTranslationEngineOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly endpointTag?: string;
  readonly id: string;
  readonly model: string;
  readonly reporter?: ProviderTranslationReporter;
}

interface OpenRouterChatCompletionResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
}

export class OpenRouterTranslationEngine implements ProviderTranslationEngine {
  readonly id: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly endpointTag?: string;
  private readonly model: string;
  private readonly reporter?: ProviderTranslationReporter;

  constructor(options: OpenRouterTranslationEngineOptions) {
    this.id = options.id;
    this.apiKey = options.apiKey?.trim() || undefined;
    this.baseUrl = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(
      TRAILING_SLASHES_PATTERN,
      ""
    );
    this.endpointTag = options.endpointTag?.trim() || undefined;
    this.model = options.model;
    this.reporter = options.reporter;
  }

  async translate(
    request: ProviderTranslationRequest
  ): Promise<ProviderTranslationResult> {
    if (!this.apiKey) {
      this.warn("OpenRouter API key is not configured");
      return this.fallbackResult(request, "missing_api_key");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
    try {
      let response = await this.postCompletion(
        request,
        this.pinnedEndpointTag(),
        controller.signal
      );
      if (
        !response.ok &&
        this.pinnedEndpointTag() &&
        DEFAULT_ROUTING_RETRY_STATUSES.has(response.status)
      ) {
        this.warn(
          "OpenRouter pinned endpoint unavailable; using default routing",
          {
            endpointTag: this.endpointTag,
            status: response.status,
          }
        );
        response = await this.postCompletion(
          request,
          undefined,
          controller.signal
        );
      }

      if (!response.ok) {
        this.warn("OpenRouter translation returned non-OK", {
          status: response.status,
        });
        return this.fallbackResult(
          request,
          `non_ok_response_${response.status}`
        );
      }

      const payload =
        (await response.json()) as OpenRouterChatCompletionResponse;
      const translatedText = extractTranslatedText(payload);
      if (!translatedText) {
        this.warn("OpenRouter translation response was empty");
        return this.fallbackResult(request, "empty_translation");
      }

      return this.translatedResult(request, translatedText);
    } catch (error) {
      this.warn("OpenRouter translation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackResult(request, "request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  private pinnedEndpointTag(): string | undefined {
    return this.endpointTag && this.endpointTag !== DEFAULT_ENDPOINT_TAG
      ? this.endpointTag
      : undefined;
  }

  private postCompletion(
    request: ProviderTranslationRequest,
    endpointTag: string | undefined,
    signal: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${OPENROUTER_CHAT_COMPLETIONS_PATH}`, {
      body: JSON.stringify(this.buildRequestBody(request, endpointTag)),
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "x-title": "Harness AI",
      },
      method: "POST",
      signal,
    });
  }

  private buildRequestBody(
    request: ProviderTranslationRequest,
    endpointTag: string | undefined
  ): Record<string, unknown> {
    return {
      messages: [
        {
          content: buildTranslationSystemPrompt(
            request.sourceLanguage,
            request.targetLanguage
          ),
          role: "system",
        },
        { content: request.text, role: "user" },
      ],
      model: this.model,
      stream: false,
      temperature: 0,
      ...(endpointTag
        ? { provider: { allow_fallbacks: false, order: [endpointTag] } }
        : {}),
    };
  }

  private fallbackResult(
    request: ProviderTranslationRequest,
    errorCode: string
  ): ProviderTranslationResult {
    return {
      engine: this.id,
      errorCode,
      finalText: request.text,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "fallback",
      targetLanguage: request.targetLanguage,
      translatedText: null,
    };
  }

  private translatedResult(
    request: ProviderTranslationRequest,
    translatedText: string
  ): ProviderTranslationResult {
    return {
      engine: this.id,
      finalText: translatedText,
      originalText: request.text,
      sourceLanguage: request.sourceLanguage,
      status: "translated",
      targetLanguage: request.targetLanguage,
      translatedText,
    };
  }

  private warn(message: string, metadata: Record<string, unknown> = {}): void {
    this.reporter?.warn(message, { engine: this.id, ...metadata });
  }
}

function buildTranslationSystemPrompt(
  sourceLanguage: string,
  targetLanguage: string
): string {
  return [
    `You are a translation engine. Translate the user's text from ${sourceLanguage} to ${targetLanguage}.`,
    `If the user's text is already in ${targetLanguage}, return it unchanged.`,
    "Do not translate already-target-language text into any other language.",
    "Respond with only the translated text and no explanations, quotes, or additional commentary.",
    "Preserve placeholders, punctuation, formatting markers, and whitespace structure exactly.",
  ].join(" ");
}

function extractTranslatedText(
  payload: OpenRouterChatCompletionResponse
): string | null {
  const content = payload.choices?.[0]?.message?.content;
  const trimmed = typeof content === "string" ? content.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}
