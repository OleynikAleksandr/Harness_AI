import type {
  ProviderInteractionDecision,
  ProviderInteractionRequestEvent,
  ProviderInteractionResolvedEvent,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { sessionEventStreamFacade } from "../../session-event-stream/src/session-event-stream-facade.js";
import type { ProviderRuntimeBinding } from "./session-request-handler-types.js";

interface PendingProviderInteraction {
  readonly binding: ProviderRuntimeBinding;
  readonly event: ProviderInteractionRequestEvent;
  readonly sessionId: string;
  readonly timer: NodeJS.Timeout;
}

export type ProviderInteractionActionResult =
  | { ok: true }
  | { error: string; ok: false };

const DEFAULT_INTERACTION_TIMEOUT_MS = 5 * 60 * 1000;

export class SessionProviderInteractionLifecycle {
  readonly #pending = new Map<string, PendingProviderInteraction>();

  capture(
    sessionId: string,
    event: ProviderInteractionRequestEvent,
    binding: ProviderRuntimeBinding
  ): void {
    const key = interactionKey(sessionId, event.interactionId);
    this.#cancelPending(key, "cancelled");
    const timeoutMs = resolveTimeoutMs(event.expiresAt);
    const timer = setTimeout(() => {
      this.#expire(key).catch(() => undefined);
    }, timeoutMs);
    timer.unref?.();
    this.#pending.set(key, { binding, event, sessionId, timer });
    sessionEventStreamFacade.publish({
      payload: { ...event, sessionId },
      timestamp: event.timestamp,
      type: "session:provider-interaction",
    });
  }

  resolveFromProvider(
    sessionId: string,
    event: ProviderInteractionResolvedEvent
  ): void {
    const key = interactionKey(sessionId, event.interactionId);
    const pending = this.#pending.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      this.#pending.delete(key);
    }
    this.#publishResolved(sessionId, event);
  }

  async respond(payload: unknown): Promise<ProviderInteractionActionResult> {
    const parsed = parseResponsePayload(payload);
    if (!parsed) {
      return { error: "Invalid provider interaction response.", ok: false };
    }
    const key = interactionKey(parsed.sessionId, parsed.decision.interactionId);
    const pending = this.#pending.get(key);
    if (!pending) {
      return { error: "Provider interaction is no longer pending.", ok: false };
    }
    const respond = pending.binding.adapter.respondToInteraction;
    if (!respond) {
      return {
        error: "Provider does not support interactive responses.",
        ok: false,
      };
    }
    clearTimeout(pending.timer);
    this.#pending.delete(key);
    try {
      await respond.call(
        pending.binding.adapter,
        pending.binding.providerSessionId,
        parsed.decision
      );
      this.#publishResolved(parsed.sessionId, {
        interactionId: parsed.decision.interactionId,
        provider: pending.event.provider,
        reason: "submitted",
        timestamp: new Date().toISOString(),
        type: "provider_interaction_resolved",
      });
      return { ok: true };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  async #expire(key: string): Promise<void> {
    const pending = this.#pending.get(key);
    if (!pending) {
      return;
    }
    this.#pending.delete(key);
    await pending.binding.adapter
      .respondToInteraction?.(pending.binding.providerSessionId, {
        interactionId: pending.event.interactionId,
        outcome: "cancelled",
      })
      .catch(() => undefined);
    this.#publishResolved(pending.sessionId, {
      interactionId: pending.event.interactionId,
      provider: pending.event.provider,
      reason: "timed_out",
      timestamp: new Date().toISOString(),
      type: "provider_interaction_resolved",
    });
  }

  #cancelPending(
    key: string,
    reason: ProviderInteractionResolvedEvent["reason"]
  ): void {
    const pending = this.#pending.get(key);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    this.#pending.delete(key);
    pending.binding.adapter
      .respondToInteraction?.(pending.binding.providerSessionId, {
        interactionId: pending.event.interactionId,
        outcome: "cancelled",
      })
      .catch(() => undefined);
    this.#publishResolved(pending.sessionId, {
      interactionId: pending.event.interactionId,
      provider: pending.event.provider,
      reason,
      timestamp: new Date().toISOString(),
      type: "provider_interaction_resolved",
    });
  }

  #publishResolved(
    sessionId: string,
    event: ProviderInteractionResolvedEvent
  ): void {
    sessionEventStreamFacade.publish({
      payload: { ...event, sessionId },
      timestamp: event.timestamp,
      type: "session:provider-interaction-resolved",
    });
  }
}

function parseResponsePayload(payload: unknown): {
  decision: ProviderInteractionDecision;
  sessionId: string;
} | null {
  if (!(isRecord(payload) && isRecord(payload.decision))) {
    return null;
  }
  const sessionId = readString(payload.sessionId);
  const interactionId = readString(payload.decision.interactionId);
  const outcome = payload.decision.outcome;
  if (
    !(sessionId && interactionId) ||
    (outcome !== "answered" &&
      outcome !== "approved" &&
      outcome !== "cancelled" &&
      outcome !== "selected")
  ) {
    return null;
  }
  return {
    decision: {
      ...(isAnswers(payload.decision.answers)
        ? { answers: payload.decision.answers }
        : {}),
      ...(readString(payload.decision.feedback)
        ? { feedback: readString(payload.decision.feedback) ?? undefined }
        : {}),
      interactionId,
      ...(readString(payload.decision.optionId)
        ? { optionId: readString(payload.decision.optionId) ?? undefined }
        : {}),
      outcome,
    },
    sessionId,
  };
}

function resolveTimeoutMs(expiresAt: string | undefined): number {
  if (!expiresAt) {
    return DEFAULT_INTERACTION_TIMEOUT_MS;
  }
  const remaining = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(remaining) && remaining > 0
    ? Math.min(remaining, DEFAULT_INTERACTION_TIMEOUT_MS)
    : 1;
}

function interactionKey(sessionId: string, interactionId: string): string {
  return `${sessionId}:${interactionId}`;
}

function isAnswers(
  value: unknown
): value is Readonly<Record<string, string | readonly string[]>> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (answer) =>
        typeof answer === "string" ||
        (Array.isArray(answer) &&
          answer.every((item) => typeof item === "string"))
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const sessionProviderInteractionLifecycle =
  new SessionProviderInteractionLifecycle();
