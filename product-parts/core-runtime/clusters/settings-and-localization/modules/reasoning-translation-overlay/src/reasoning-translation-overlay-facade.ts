import {
  ProviderTranslationEnginesFacade,
  type ProviderTranslationResult,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-facade.js";
import {
  createProviderTranslationEngines,
  type OpenRouterTranslationEnginesConfig,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-translation-engines/src/provider-translation-engines-factory.js";
import { ReasoningTranslationOverlayStore } from "./reasoning-translation-overlay-store.js";
import { createReasoningSourceHash } from "./source-hash.js";

const SOURCE_LANGUAGE = "en";

export interface ReasoningTranslationSettingsSnapshot {
  readonly categories: {
    readonly reasoning?: string;
  };
  readonly defaultLanguage: string;
  readonly openRouter?: OpenRouterTranslationEnginesConfig;
  readonly reasoningEngineId: string;
}

export interface ReasoningTranslationCandidate {
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceText: string;
}

export interface ReasoningTranslationMessageCandidate
  extends ReasoningTranslationCandidate {
  readonly role?: string;
  readonly tag?: string;
}

export interface ReasoningTranslationDisplayMessage {
  readonly id: string;
  readonly role: "assistant" | "thinking";
  readonly tag?: string;
  readonly text: string;
  readonly timestamp: string;
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
  readonly sourceText?: string;
  readonly status: "fallback" | "translated";
  readonly targetLanguage: string;
}

export interface ReasoningTranslationPatchPayload {
  readonly localizedContent: string;
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
}

export interface ReasoningTranslationPublishedMessage {
  readonly id: string;
  readonly role: string;
  readonly sessionId: string;
  readonly tag?: string;
  readonly text: string;
}

export interface ReasoningTranslationPublishableMessage
  extends ReasoningTranslationPublishedMessage {
  readonly role: "assistant" | "thinking";
  readonly timestamp: string;
  readonly translationState?: "pending";
}

export interface ReasoningTranslationPolicy {
  readonly enabled: boolean;
  readonly engineId: string;
  readonly skipReason?: "empty_source" | "missing_target_language";
  readonly sourceLanguage: "en";
  readonly targetLanguage: string | null;
}

interface ReasoningTranslationOverlayOptions {
  readonly overlayStore?: Pick<
    ReasoningTranslationOverlayStore,
    "appendOverlay"
  >;
  readonly translationFacade?: Pick<
    ProviderTranslationEnginesFacade,
    "translate"
  >;
}

export class ReasoningTranslationOverlayFacade {
  private readonly explicitTranslationFacade?: Pick<
    ProviderTranslationEnginesFacade,
    "translate"
  >;
  private readonly overlayStore: Pick<
    ReasoningTranslationOverlayStore,
    "appendOverlay"
  >;

  constructor(options: ReasoningTranslationOverlayOptions = {}) {
    this.overlayStore =
      options.overlayStore ?? new ReasoningTranslationOverlayStore();
    this.explicitTranslationFacade = options.translationFacade;
  }

  private resolveTranslationFacade(
    settings: ReasoningTranslationSettingsSnapshot
  ): Pick<ProviderTranslationEnginesFacade, "translate"> {
    if (this.explicitTranslationFacade) {
      return this.explicitTranslationFacade;
    }
    return new ProviderTranslationEnginesFacade({
      engines: settings.openRouter
        ? createProviderTranslationEngines(settings.openRouter)
        : undefined,
    });
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

  resolvePendingStateForMessage(
    request: ReasoningTranslationMessageCandidate & {
      readonly settings: ReasoningTranslationSettingsSnapshot;
    }
  ): ReasoningTranslationPendingState | null {
    return isReasoningMessage(request)
      ? this.resolvePendingState(request)
      : null;
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
    const translationFacade = this.resolveTranslationFacade(request.settings);
    const result = await translationFacade.translate({
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
      sourceText: request.sourceText,
    });
  }

  async translateVisibleReasoningMessage(
    request: ReasoningTranslationMessageCandidate & {
      readonly settings: ReasoningTranslationSettingsSnapshot;
      readonly workspacePath?: string;
    }
  ): Promise<ReasoningTranslationPatchPayload | null> {
    if (!isReasoningMessage(request)) {
      return null;
    }
    const overlay = await this.translateVisibleReasoning(request);
    if (!overlay) {
      return null;
    }
    if (request.workspacePath) {
      this.overlayStore.appendOverlay(request.workspacePath, overlay);
    }
    if (!(overlay.status === "translated" && overlay.localizedContent)) {
      return null;
    }
    return {
      localizedContent: overlay.localizedContent,
      messageId: overlay.messageId,
      sessionId: overlay.sessionId,
      sourceHash: overlay.sourceHash,
      targetLanguage: overlay.targetLanguage,
    };
  }

  publishDisplayMessages(options: {
    readonly displayMessages: readonly ReasoningTranslationDisplayMessage[];
    readonly publishMessage: (
      message: ReasoningTranslationPublishableMessage
    ) => ReasoningTranslationPublishedMessage | null;
    readonly publishPatch: (payload: ReasoningTranslationPatchPayload) => void;
    readonly sessionId: string;
    readonly settings: ReasoningTranslationSettingsSnapshot | null;
    readonly workspacePath?: string;
  }): void {
    for (const message of options.displayMessages) {
      const sourceMessage = createSourceMessage(message, options.sessionId);
      const pendingState = options.settings
        ? this.resolvePendingStateForMessage({
            ...sourceMessage,
            settings: options.settings,
            sourceText: sourceMessage.text,
          })
        : null;
      const publishedMessage = options.publishMessage({
        ...sourceMessage,
        ...(pendingState
          ? { translationState: pendingState.translationState }
          : {}),
      });
      if (!(options.settings && publishedMessage)) {
        continue;
      }
      this.translateVisibleReasoningMessage({
        messageId: publishedMessage.id,
        ...publishedMessage,
        settings: options.settings,
        sourceText: publishedMessage.text,
        workspacePath: options.workspacePath,
      })
        .then((payload) => {
          if (payload) {
            options.publishPatch(payload);
          }
        })
        .catch(() => undefined);
    }
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
  readonly sourceText: string;
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
    sourceText: options.sourceText,
    status: localizedContent ? "translated" : "fallback",
    targetLanguage: options.result.targetLanguage,
  };
}

function isReasoningMessage(
  message: Pick<ReasoningTranslationMessageCandidate, "role" | "tag">
): boolean {
  return message.role === "thinking" || message.tag === "thinking";
}

function createSourceMessage(
  message: ReasoningTranslationDisplayMessage,
  sessionId: string
): ReasoningTranslationPublishableMessage & {
  readonly messageId: string;
} {
  return {
    id: message.id,
    messageId: message.id,
    role: message.role,
    sessionId,
    ...(message.tag ? { tag: message.tag } : {}),
    text: message.text,
    timestamp: message.timestamp,
  };
}
