import type {
  ProviderInteractionDecision,
  ProviderInteractionOption,
  ProviderInteractionRequestEvent,
  ProviderInteractionResolvedEvent,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  isKimiAcpRecord,
  KIMI_ACP_ERROR_CODES,
  KimiAcpProtocolError,
  type KimiAcpReverseRequest,
} from "./kimi-acp-session-contracts.js";

interface PendingKimiInteraction {
  readonly event: ProviderInteractionRequestEvent;
  readonly resolve: (response: unknown) => void;
  readonly timer: NodeJS.Timeout;
}

export interface KimiInteractionBridgeOptions {
  readonly emit: (
    event: ProviderInteractionRequestEvent | ProviderInteractionResolvedEvent
  ) => void;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const PERMISSION_METHOD = "session/request_permission";

// The Kimi ACP surface initiates exactly one interaction shape: the standard
// tool-permission request. It maps onto a sanitized Core `permission`
// interaction; every other reverse method is refused with `methodNotFound`
// (fail-closed — nothing is silently auto-approved). Cancel/timeout answer
// the CLI with a cancelled outcome so the native turn can settle.
export class KimiInteractionBridge {
  private readonly options: KimiInteractionBridgeOptions;
  private readonly pending = new Map<string, PendingKimiInteraction>();

  constructor(options: KimiInteractionBridgeOptions) {
    this.options = options;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  handle(request: KimiAcpReverseRequest): Promise<unknown> {
    if (request.method !== PERMISSION_METHOD) {
      return Promise.reject(
        new KimiAcpProtocolError({
          code: KIMI_ACP_ERROR_CODES.methodNotFound,
          message: `Unsupported Kimi ACP reverse request: ${request.method}`,
        })
      );
    }
    const event = permissionEvent(request, this.timeoutMs());
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.settle(event.interactionId, "timed_out");
      }, this.timeoutMs());
      this.pending.set(event.interactionId, { event, resolve, timer });
      this.options.emit(event);
    });
  }

  respond(decision: ProviderInteractionDecision): void {
    const pending = this.pending.get(decision.interactionId);
    if (!pending) {
      throw new Error("Kimi interaction is no longer pending.");
    }
    const selected =
      decision.outcome === "cancelled"
        ? null
        : (pending.event.options.find(
            (option) => option.id === decision.optionId
          ) ?? null);
    clearTimeout(pending.timer);
    this.pending.delete(decision.interactionId);
    pending.resolve(
      selected
        ? { outcome: { optionId: selected.id, outcome: "selected" } }
        : CANCELLED_RESPONSE
    );
    this.options.emit(resolvedEvent(pending.event, "submitted"));
  }

  cancelAll(): void {
    for (const interactionId of [...this.pending.keys()]) {
      this.settle(interactionId, "cancelled");
    }
  }

  private settle(
    interactionId: string,
    reason: ProviderInteractionResolvedEvent["reason"]
  ): void {
    const pending = this.pending.get(interactionId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(interactionId);
    pending.resolve(CANCELLED_RESPONSE);
    this.options.emit(resolvedEvent(pending.event, reason));
  }

  private timeoutMs(): number {
    return this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }
}

const CANCELLED_RESPONSE = { outcome: { outcome: "cancelled" } } as const;

function permissionEvent(
  request: KimiAcpReverseRequest,
  timeoutMs: number
): ProviderInteractionRequestEvent {
  const params = isKimiAcpRecord(request.params) ? request.params : {};
  const toolCall = isKimiAcpRecord(params.toolCall) ? params.toolCall : null;
  const toolCallId =
    readString(toolCall?.toolCallId) ?? readString(params.toolCallId);
  return {
    expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    interactionId: `kimi-interaction:${String(request.id)}`,
    kind: "permission",
    message:
      readString(toolCall?.title) ??
      readString(toolCall?.name) ??
      "Kimi requests permission to use a tool.",
    options: permissionOptions(params.options),
    provider: "kimi",
    questions: [],
    timestamp: new Date().toISOString(),
    title: "Tool permission",
    ...(toolCallId ? { toolCallId } : {}),
    type: "provider_interaction_requested",
  };
}

function permissionOptions(
  value: unknown
): readonly ProviderInteractionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isKimiAcpRecord(item)) {
      return [];
    }
    const id = readString(item.optionId) ?? readString(item.id);
    if (!id) {
      return [];
    }
    const kind = readString(item.kind);
    return [
      {
        id,
        ...(kind ? { kind } : {}),
        label: readString(item.name) ?? readString(item.label) ?? id,
      },
    ];
  });
}

function resolvedEvent(
  event: ProviderInteractionRequestEvent,
  reason: ProviderInteractionResolvedEvent["reason"]
): ProviderInteractionResolvedEvent {
  return {
    interactionId: event.interactionId,
    provider: "kimi",
    reason,
    timestamp: new Date().toISOString(),
    type: "provider_interaction_resolved",
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
