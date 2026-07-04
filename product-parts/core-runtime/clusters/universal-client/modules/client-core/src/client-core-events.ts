// Map the client's internal ClientTurnEvent onto the Core NormalizedProviderEvent
// contract for display. This is a mechanical output->event mapping, NOT any
// normalization of the user's input prompt. Streamed content/thinking become
// live/thinking dialog_message events; turn_started/completed/failed pass
// through. Contract: docs/architecture/UniversalClient.md section 3.9.

import { randomUUID } from "node:crypto";
import type { NormalizedProviderEvent } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import type { ClientTurnEvent } from "../../client-contract/src/client-contract-facade.js";

const dialogMessage = (
  content: string,
  tag: string
): NormalizedProviderEvent => ({
  content,
  role: "assistant",
  tag,
  timestamp: new Date().toISOString(),
  type: "dialog_message",
  uuid: randomUUID(),
});

// Returns null for empty streamed deltas (nothing to render).
export const mapClientTurnEvent = (
  event: ClientTurnEvent
): NormalizedProviderEvent | null => {
  const base = { timestamp: new Date().toISOString(), uuid: randomUUID() };
  switch (event.kind) {
    case "turn_started":
      return { ...base, type: "turn_started" };
    case "assistant_delta":
      return event.text ? dialogMessage(event.text, "live") : null;
    case "thinking_delta":
      return event.text ? dialogMessage(event.text, "thinking") : null;
    case "turn_completed":
      return { ...base, type: "turn_completed" };
    case "turn_failed":
      return {
        ...base,
        type: "turn_failed",
        ...(event.text ? { message: event.text } : {}),
      };
    default:
      return null;
  }
};
