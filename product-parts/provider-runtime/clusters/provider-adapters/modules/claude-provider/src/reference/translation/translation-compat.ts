export interface TranslationRequest {
  category: "generic" | "localization_bundle" | "reasoning";
  engineId: string;
  providerId: string;
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
  timeoutMs?: number;
}

export interface TranslationReporter {
  warn?: (message: string) => void;
}

export class TranslationFacade {
  private readonly reporter?: TranslationReporter;

  constructor(options: { reporter?: TranslationReporter } = {}) {
    this.reporter = options.reporter;
  }

  translate(request: TranslationRequest): Promise<{
    finalText: string;
    status: "fallback" | "skipped" | "translated";
  }> {
    this.reporter?.warn?.(
      `Claude translation engine ${request.engineId} is not migrated yet; using source text.`
    );
    return Promise.resolve({ finalText: request.text, status: "fallback" });
  }
}
