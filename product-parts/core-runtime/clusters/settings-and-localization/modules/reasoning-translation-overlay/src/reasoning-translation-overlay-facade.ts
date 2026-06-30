import {
  ProviderTranslationEnginesFacade,
  type ProviderTranslationResult,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.js";
import { createReasoningSourceHash } from "./source-hash.js";

const SOURCE_LANGUAGE = "en";

export interface ReasoningTranslationSettingsSnapshot {
  readonly categories: {
    readonly reasoning?: string;
  };
  readonly defaultLanguage: string;
  readonly reasoningEngineId: string;
}

export interface ReasoningTranslationCandidate {
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceText: string;
}

export interface ReasoningTranslationPendingState {
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly translationState: "pending";
}

export interface ReasoningTranslationOverlay {
  readonly engineId: string;
  readonly errorCode?: string;
  readonly localizedContent?: string;
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly status: "fallback" | "translated";
  readonly targetLanguage: string;
}

export interface ReasoningTranslationPolicy {
  readonly enabled: boolean;
  readonly engineId: string;
  readonly skipReason?: "empty_source" | "missing_target_language";
  readonly sourceLanguage: "en";
  readonly targetLanguage: string | null;
}

interface ReasoningTranslationOverlayOptions {
  readonly translationFacade?: Pick<
    ProviderTranslationEnginesFacade,
    "translate"
  >;
}

export class ReasoningTranslationOverlayFacade {
  private readonly translationFacade: Pick<
    ProviderTranslationEnginesFacade,
    "translate"
  >;

  constructor(options: ReasoningTranslationOverlayOptions = {}) {
    this.translationFacade =
      options.translationFacade ?? new ProviderTranslationEnginesFacade();
  }

  resolvePolicy(
    settings: ReasoningTranslationSettingsSnapshot,
    sourceText = "x"
  ): ReasoningTranslationPolicy {
    const engineId = settings.reasoningEngineId.trim() || "google-gtx";
    const targetLanguage = resolveTargetLanguage(settings);
    if (sourceText.trim().length === 0) {
      return {
        enabled: false,
        engineId,
        skipReason: "empty_source",
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage,
      };
    }
    if (!targetLanguage || targetLanguage === SOURCE_LANGUAGE) {
      return {
        enabled: false,
        engineId,
        skipReason: "missing_target_language",
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: null,
      };
    }
    return {
      enabled: true,
      engineId,
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage,
    };
  }

  resolvePendingState(
    request: ReasoningTranslationCandidate & {
      readonly settings: ReasoningTranslationSettingsSnapshot;
    }
  ): ReasoningTranslationPendingState | null {
    const policy = this.resolvePolicy(request.settings, request.sourceText);
    if (!(policy.enabled && policy.targetLanguage)) {
      return null;
    }
    return {
      messageId: request.messageId,
      sessionId: request.sessionId,
      sourceHash: createReasoningSourceHash(request.sourceText),
      translationState: "pending",
    };
  }

  async translateVisibleReasoning(
    request: ReasoningTranslationCandidate & {
      readonly settings: ReasoningTranslationSettingsSnapshot;
    }
  ): Promise<ReasoningTranslationOverlay | null> {
    const policy = this.resolvePolicy(request.settings, request.sourceText);
    if (!(policy.enabled && policy.targetLanguage)) {
      return null;
    }

    const sourceHash = createReasoningSourceHash(request.sourceText);
    const result = await this.translationFacade.translate({
      category: "reasoning",
      chunkingMode: "disabled",
      engineId: policy.engineId,
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage: policy.targetLanguage,
      text: request.sourceText,
    });
    return createOverlay({
      messageId: request.messageId,
      result,
      sessionId: request.sessionId,
      sourceHash,
    });
  }
}

export const reasoningTranslationOverlayFacade =
  new ReasoningTranslationOverlayFacade();

export { ReasoningTranslationOverlayProjector } from "./reasoning-translation-overlay-projector.js";
export {
  type ReasoningTranslationOverlayRecord,
  ReasoningTranslationOverlayStore,
} from "./reasoning-translation-overlay-store.js";

function resolveTargetLanguage(
  settings: ReasoningTranslationSettingsSnapshot
): string | null {
  const language =
    settings.categories.reasoning?.trim() || settings.defaultLanguage.trim();
  return language ? language.toLowerCase() : null;
}

function createOverlay(options: {
  readonly messageId: string;
  readonly result: ProviderTranslationResult;
  readonly sessionId: string;
  readonly sourceHash: string;
}): ReasoningTranslationOverlay {
  const localizedContent =
    options.result.status === "translated" && options.result.finalText.trim()
      ? options.result.finalText
      : undefined;
  return {
    engineId: options.result.engine,
    ...(options.result.errorCode
      ? { errorCode: options.result.errorCode }
      : {}),
    ...(localizedContent ? { localizedContent } : {}),
    messageId: options.messageId,
    sessionId: options.sessionId,
    sourceHash: options.sourceHash,
    status: localizedContent ? "translated" : "fallback",
    targetLanguage: options.result.targetLanguage,
  };
}
