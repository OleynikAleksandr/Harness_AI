import {
  isRecord,
  readString,
} from "./session-request-handler-runtime-utils.js";

export function readPromotedProviderSessionId(event: unknown): string | null {
  if (!isRecord(event) || typeof event.type !== "string") {
    return null;
  }
  if (event.type === "realSessionId") {
    return readString(event.payload);
  }
  if (event.type !== "sessionIdChanged" || !isRecord(event.payload)) {
    return null;
  }
  return readString(event.payload.newId);
}
