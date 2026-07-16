import type {
  ProviderInteractionDecision,
  ProviderInteractionOption,
  ProviderInteractionQuestion,
  ProviderInteractionRequestEvent,
  ProviderInteractionResolvedEvent,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { GrokAcpRequest } from "./grok-acp-contracts.js";
import { isRecord } from "./grok-acp-contracts.js";

interface PendingInteraction {
  readonly event: ProviderInteractionRequestEvent;
  readonly method: SupportedInteractionMethod;
  readonly reject: (error: Error) => void;
  readonly request: GrokAcpRequest;
  readonly resolve: (response: unknown) => void;
  readonly timer: NodeJS.Timeout;
}

export interface GrokInteractionBridgeOptions {
  readonly emit: (
    event: ProviderInteractionRequestEvent | ProviderInteractionResolvedEvent
  ) => void;
  readonly timeoutMs?: number;
}

type SupportedInteractionMethod =
  | "session/request_permission"
  | "x.ai/ask_user_question"
  | "x.ai/exit_plan_mode";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export class GrokInteractionBridge {
  readonly #emit: GrokInteractionBridgeOptions["emit"];
  readonly #pending = new Map<string, PendingInteraction>();
  readonly #timeoutMs: number;

  constructor(options: GrokInteractionBridgeOptions) {
    this.#emit = options.emit;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  handle(request: GrokAcpRequest): Promise<unknown> {
    const method = normalizeMethod(request.method);
    if (!method) {
      return Promise.reject(
        new Error(`Unsupported Grok reverse request: ${request.method}`)
      );
    }
    const event = normalizeInteractionRequest(request, method, this.#timeoutMs);
    return new Promise((resolve, reject) => {
      const existing = this.#pending.get(event.interactionId);
      if (existing) {
        this.#settleCancelled(existing, "cancelled");
      }
      const timer = setTimeout(() => {
        const pending = this.#pending.get(event.interactionId);
        if (pending) {
          this.#settleCancelled(pending, "timed_out");
        }
      }, this.#timeoutMs);
      this.#pending.set(event.interactionId, {
        event,
        method,
        reject,
        request,
        resolve,
        timer,
      });
      this.#emit(event);
    });
  }

  respond(decision: ProviderInteractionDecision): void {
    const pending = this.#pending.get(decision.interactionId);
    if (!pending) {
      throw new Error("Grok interaction is no longer pending.");
    }
    const response = buildNativeResponse(pending, decision);
    clearTimeout(pending.timer);
    this.#pending.delete(decision.interactionId);
    pending.resolve(response);
    this.#emit(resolvedEvent(pending.event, "submitted"));
  }

  cancelAll(reason = "Grok session closed."): void {
    for (const pending of [...this.#pending.values()]) {
      clearTimeout(pending.timer);
      this.#pending.delete(pending.event.interactionId);
      pending.reject(new Error(reason));
      this.#emit(resolvedEvent(pending.event, "cancelled"));
    }
  }

  #settleCancelled(
    pending: PendingInteraction,
    reason: ProviderInteractionResolvedEvent["reason"]
  ): void {
    clearTimeout(pending.timer);
    this.#pending.delete(pending.event.interactionId);
    pending.resolve(cancelledNativeResponse(pending.method));
    this.#emit(resolvedEvent(pending.event, reason));
  }
}

function normalizeInteractionRequest(
  request: GrokAcpRequest,
  method: SupportedInteractionMethod,
  timeoutMs: number
): ProviderInteractionRequestEvent {
  const params = isRecord(request.params) ? request.params : {};
  const interactionId = `grok-interaction:${String(request.id)}`;
  const base = {
    expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    interactionId,
    options: [] as readonly ProviderInteractionOption[],
    provider: "grok",
    questions: [] as readonly ProviderInteractionQuestion[],
    timestamp: new Date().toISOString(),
    toolCallId:
      readString(params.toolCallId) ?? readToolCallId(params.toolCall),
    type: "provider_interaction_requested" as const,
  };
  if (method === "session/request_permission") {
    const toolCall = isRecord(params.toolCall) ? params.toolCall : null;
    return {
      ...base,
      kind: "permission",
      message:
        readString(toolCall?.title) ??
        readString(toolCall?.name) ??
        "Grok requests permission to use a tool.",
      options: normalizePermissionOptions(params.options),
      title: "Tool permission",
    };
  }
  if (method === "x.ai/ask_user_question") {
    return {
      ...base,
      kind: "ask_user",
      message: "Grok needs additional information to continue.",
      questions: normalizeQuestions(params.questions),
      title: "Question from Grok",
    };
  }
  return {
    ...base,
    kind: "plan_approval",
    message: "Review the proposed plan before Grok continues.",
    plan: readString(params.planContent) ?? undefined,
    title: "Plan approval",
  };
}

function normalizePermissionOptions(
  value: unknown
): readonly ProviderInteractionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const id = readString(item.optionId) ?? readString(item.id);
    if (!id) {
      return [];
    }
    return [
      {
        ...(readString(item.description)
          ? { description: readString(item.description) ?? undefined }
          : {}),
        id,
        ...(readString(item.kind)
          ? { kind: readString(item.kind) ?? undefined }
          : {}),
        label: readString(item.name) ?? readString(item.label) ?? id,
      },
    ];
  });
}

function normalizeQuestions(
  value: unknown
): readonly ProviderInteractionQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item, questionIndex) => {
    if (!isRecord(item)) {
      return [];
    }
    const prompt = readString(item.question);
    if (!prompt) {
      return [];
    }
    const id = readString(item.id) ?? prompt;
    const options = Array.isArray(item.options)
      ? item.options.flatMap((option, optionIndex) =>
          normalizeQuestionOption(option, optionIndex)
        )
      : [];
    return [
      {
        allowFreeform: true,
        allowMultiple: item.multiSelect === true || item.multi_select === true,
        header: `Question ${questionIndex + 1}`,
        id,
        options,
        prompt,
      },
    ];
  });
}

function normalizeQuestionOption(
  value: unknown,
  index: number
): ProviderInteractionOption[] {
  if (!isRecord(value)) {
    return [];
  }
  const label = readString(value.label);
  if (!label) {
    return [];
  }
  return [
    {
      ...(readString(value.description)
        ? { description: readString(value.description) ?? undefined }
        : {}),
      id: readString(value.id) ?? `option-${index + 1}`,
      label,
    },
  ];
}

function buildNativeResponse(
  pending: PendingInteraction,
  decision: ProviderInteractionDecision
): unknown {
  if (decision.outcome === "cancelled") {
    return cancelledNativeResponse(pending.method, decision.feedback);
  }
  if (pending.method === "session/request_permission") {
    const selected = pending.event.options.find(
      (option) => option.id === decision.optionId
    );
    if (!selected) {
      return cancelledNativeResponse(pending.method);
    }
    return { outcome: { optionId: selected.id, outcome: "selected" } };
  }
  if (pending.method === "x.ai/ask_user_question") {
    return {
      answers: decision.answers ?? {},
      outcome: "accepted",
    };
  }
  return {
    outcome: decision.outcome === "approved" ? "approved" : "cancelled",
    ...(decision.feedback ? { feedback: decision.feedback } : {}),
  };
}

function cancelledNativeResponse(
  method: SupportedInteractionMethod,
  feedback?: string
): unknown {
  if (method === "session/request_permission") {
    return { outcome: { outcome: "cancelled" } };
  }
  if (method === "x.ai/ask_user_question") {
    return { outcome: "cancelled" };
  }
  return {
    outcome: "cancelled",
    ...(feedback ? { feedback } : {}),
  };
}

function resolvedEvent(
  event: ProviderInteractionRequestEvent,
  reason: ProviderInteractionResolvedEvent["reason"]
): ProviderInteractionResolvedEvent {
  return {
    interactionId: event.interactionId,
    provider: "grok",
    reason,
    timestamp: new Date().toISOString(),
    type: "provider_interaction_resolved",
  };
}

function normalizeMethod(value: string): SupportedInteractionMethod | null {
  const method = value.startsWith("_") ? value.slice(1) : value;
  return method === "session/request_permission" ||
    method === "x.ai/ask_user_question" ||
    method === "x.ai/exit_plan_mode"
    ? method
    : null;
}

function readToolCallId(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return;
  }
  return readString(value.toolCallId) ?? readString(value.id) ?? undefined;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
