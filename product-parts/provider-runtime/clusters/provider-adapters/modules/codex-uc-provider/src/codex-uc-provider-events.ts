import { randomUUID } from "node:crypto";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";

export function dialogMessage(
  content: string,
  role: "assistant" | "thinking" = "assistant",
  tag: string | null = "live"
): NormalizedProviderEvent {
  return {
    content,
    role,
    ...(tag === null ? {} : { tag }),
    timestamp: nowIso(),
    type: "dialog_message",
    uuid: randomUUID(),
  };
}

export function event(type: "turn_completed" | "turn_failed" | "turn_started") {
  return { timestamp: nowIso(), type, uuid: randomUUID() };
}

export function nowIso(): string {
  return new Date().toISOString();
}
