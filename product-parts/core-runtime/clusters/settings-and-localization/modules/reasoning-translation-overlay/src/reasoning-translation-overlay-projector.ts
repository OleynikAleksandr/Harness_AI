import type { ReasoningTranslationOverlayRecord } from "./reasoning-translation-overlay-store.js";
import { createReasoningSourceHash } from "./source-hash.js";

export interface ReasoningTranslationProjectableMessage {
  readonly id: string;
  readonly localizedContent?: string;
  readonly text: string;
}

export class ReasoningTranslationOverlayProjector {
  projectMessages<T extends ReasoningTranslationProjectableMessage>(
    messages: readonly T[],
    overlays: readonly ReasoningTranslationOverlayRecord[]
  ): T[] {
    return messages.map((message) => {
      const overlay = latestApplicableOverlay(message, overlays);
      if (!overlay) {
        return message;
      }
      return { ...message, localizedContent: overlay.localizedContent };
    });
  }
}

function latestApplicableOverlay(
  message: ReasoningTranslationProjectableMessage,
  overlays: readonly ReasoningTranslationOverlayRecord[]
): ReasoningTranslationOverlayRecord | null {
  for (let index = overlays.length - 1; index >= 0; index -= 1) {
    const overlay = overlays[index];
    if (overlay && isApplicableOverlay(message, overlay)) {
      return overlay;
    }
  }
  return null;
}

function isApplicableOverlay(
  message: ReasoningTranslationProjectableMessage,
  overlay: ReasoningTranslationOverlayRecord
): boolean {
  return (
    overlay.messageId === message.id &&
    overlay.status === "translated" &&
    typeof overlay.localizedContent === "string" &&
    overlay.localizedContent.trim().length > 0 &&
    (overlay.sourceHash === createReasoningSourceHash(message.text) ||
      isPrefixSourceMatch(message.text, overlay.sourceText))
  );
}

function isPrefixSourceMatch(
  currentText: string,
  overlaySourceText: string | undefined
): boolean {
  return Boolean(
    overlaySourceText?.trim() && currentText.startsWith(overlaySourceText)
  );
}
