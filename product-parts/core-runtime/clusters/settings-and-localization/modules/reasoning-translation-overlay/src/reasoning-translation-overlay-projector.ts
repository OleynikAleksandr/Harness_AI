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
    const overlayByMessageId = latestValidOverlayByMessageId(overlays);
    return messages.map((message) => {
      const overlay = overlayByMessageId.get(message.id);
      if (
        !overlay ||
        overlay.sourceHash !== createReasoningSourceHash(message.text)
      ) {
        return message;
      }
      return { ...message, localizedContent: overlay.localizedContent };
    });
  }
}

function latestValidOverlayByMessageId(
  overlays: readonly ReasoningTranslationOverlayRecord[]
): Map<string, ReasoningTranslationOverlayRecord> {
  const overlayByMessageId = new Map<
    string,
    ReasoningTranslationOverlayRecord
  >();
  for (const overlay of overlays) {
    if (
      overlay.status === "translated" &&
      typeof overlay.localizedContent === "string" &&
      overlay.localizedContent.trim().length > 0
    ) {
      overlayByMessageId.set(overlay.messageId, overlay);
    }
  }
  return overlayByMessageId;
}
