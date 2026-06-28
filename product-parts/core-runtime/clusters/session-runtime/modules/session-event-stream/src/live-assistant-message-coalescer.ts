import type {
  CoreSessionMessage,
  CoreSessionRole,
} from "./session-event-stream-facade.js";

export function coalesceLiveAssistantMessages<
  TMessage extends {
    readonly id: string;
    readonly role: CoreSessionRole;
    readonly tag?: string;
    readonly text: string;
    readonly timestamp: string;
  },
>(messages: readonly TMessage[]): TMessage[] {
  const coalesced: TMessage[] = [];
  for (const message of messages) {
    const previous = coalesced.at(-1);
    if (!(previous && isLiveAssistantMessage(previous, message))) {
      coalesced.push(message);
      continue;
    }
    const nextText =
      previous.id === message.id
        ? message.text
        : `${previous.text}${message.text}`;
    coalesced[coalesced.length - 1] = {
      ...previous,
      text: nextText,
      timestamp: message.timestamp,
    };
  }
  return coalesced;
}

function isLiveAssistantMessage(
  previous: Pick<CoreSessionMessage, "role" | "tag">,
  next: Pick<CoreSessionMessage, "role" | "tag">
): boolean {
  return (
    previous.role === "assistant" &&
    previous.tag === "live" &&
    next.role === "assistant" &&
    next.tag === "live"
  );
}
