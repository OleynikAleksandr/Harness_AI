import type { CoreSessionMessage } from "../../session-event-stream/src/session-event-stream-facade.js";

// Project an incoming provider message for display: pass non-assistant/live
// messages through, otherwise reduce a final assistant message to its unseen
// live tail (or drop it when fully covered by already-streamed live chunks).
export function resolveDisplayMessage(
  existingMessages: readonly CoreSessionMessage[],
  message: CoreSessionMessage
): CoreSessionMessage | null {
  if (message.role !== "assistant" || message.tag === "live") {
    return message;
  }
  const deduped = resolveLiveAssistantTail(existingMessages, message.text);
  if (!deduped) {
    return null;
  }
  return {
    ...message,
    text: deduped.text,
    ...(deduped.tag ? { tag: deduped.tag } : {}),
  };
}

export function resolveLiveAssistantTail(
  messages: readonly CoreSessionMessage[],
  finalText: string
): { tag?: string; text: string } | null {
  const liveText = collectTrailingLiveAssistantText(messages);
  if (liveText.length === 0) {
    return { text: finalText };
  }
  const normalizedFinal = finalText.trim();
  if (normalizedFinal.length === 0) {
    return null;
  }
  if (finalText.startsWith(liveText)) {
    const tail = finalText.slice(liveText.length);
    return tail.trim().length > 0 ? { tag: "live", text: tail } : null;
  }
  if (liveText.includes(normalizedFinal)) {
    return null;
  }
  return { text: finalText };
}

function collectTrailingLiveAssistantText(
  messages: readonly CoreSessionMessage[]
): string {
  const chunks: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant" || message.tag !== "live") {
      break;
    }
    chunks.push(message.text);
  }
  return chunks.reverse().join("");
}
