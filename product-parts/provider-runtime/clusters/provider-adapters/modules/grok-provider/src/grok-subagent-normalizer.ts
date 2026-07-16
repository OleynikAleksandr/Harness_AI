import type {
  ProviderSubagentControlEvent,
  ProviderSubagentEvent,
  ProviderSubagentStatus,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { GrokAcpNotification } from "./grok-acp-contracts.js";
import { isRecord } from "./grok-acp-contracts.js";

interface GrokSubagentIdentity {
  readonly callId: string;
  readonly childProviderSessionId: string;
  readonly description?: string;
  readonly model?: string;
  readonly parentProviderSessionId: string;
  readonly subagentId: string;
}

export interface GrokRoutedSubagentEvent {
  readonly childProviderSessionId?: string;
  readonly event: ProviderSubagentEvent;
  readonly targetProviderSessionId: string;
}

export function readGrokNotificationSessionId(
  notification: GrokAcpNotification
): string | null {
  if (!isRecord(notification.params)) {
    return null;
  }
  const payload =
    typeof notification.params.method === "string" &&
    isRecord(notification.params.params)
      ? notification.params.params
      : notification.params;
  return readField(payload, "sessionId");
}

const GROK_SUBAGENT_NOTIFICATION_METHODS = new Set([
  "x.ai/session_notification",
  "_x.ai/session_notification",
]);

export class GrokSubagentNormalizer {
  readonly #identities = new Map<string, GrokSubagentIdentity>();

  normalizeNotification(
    notification: GrokAcpNotification
  ): readonly GrokRoutedSubagentEvent[] {
    if (!GROK_SUBAGENT_NOTIFICATION_METHODS.has(notification.method)) {
      return [];
    }
    const params = unwrapNotificationParams(notification.params);
    const update = isRecord(params?.update) ? params.update : null;
    if (!(params && update)) {
      return [];
    }
    const timestamp = readTimestamp(params) ?? new Date().toISOString();
    switch (update.sessionUpdate) {
      case "subagent_spawned":
        return this.#normalizeSpawn(update, timestamp);
      case "subagent_progress":
        return this.#normalizeProgress(update, timestamp);
      case "subagent_finished":
        return this.#normalizeFinished(update, timestamp);
      default:
        return [];
    }
  }

  normalizeRunningResponse(
    response: unknown,
    parentProviderSessionId: string
  ): readonly GrokRoutedSubagentEvent[] {
    const payload = unwrapExtensionResult(response);
    const snapshots = Array.isArray(payload?.subagents)
      ? payload.subagents
      : [];
    return snapshots.flatMap((snapshot) => {
      if (!isRecord(snapshot)) {
        return [];
      }
      const update = {
        ...snapshot,
        parent_session_id:
          readField(snapshot, "parent_session_id", "parentSessionId") ??
          parentProviderSessionId,
        sessionUpdate: "subagent_spawned",
      };
      const spawned = this.#normalizeSpawn(update, new Date().toISOString());
      const progress = this.#normalizeProgress(
        { ...snapshot, sessionUpdate: "subagent_progress" },
        new Date().toISOString()
      );
      return [...spawned, ...progress];
    });
  }

  #normalizeSpawn(
    update: Record<string, unknown>,
    timestamp: string
  ): readonly GrokRoutedSubagentEvent[] {
    const identity = readIdentity(update);
    if (!identity) {
      return [];
    }
    this.#remember(identity);
    const role =
      readField(update, "role") ?? readField(update, "subagent_type");
    const nickname = readField(update, "persona");
    const control = buildControl(identity, "running", "running", timestamp);
    return [
      route(identity.parentProviderSessionId, control, identity),
      route(
        identity.parentProviderSessionId,
        {
          ...(nickname ? { agentNickname: nickname } : {}),
          ...(role ? { agentRole: role } : {}),
          parentProviderSessionId: identity.parentProviderSessionId,
          providerSessionId: identity.childProviderSessionId,
          status: "running",
          ...(identity.description ? { task: identity.description } : {}),
          timestamp,
          type: "subagent_session",
        },
        identity
      ),
    ];
  }

  #normalizeProgress(
    update: Record<string, unknown>,
    timestamp: string
  ): readonly GrokRoutedSubagentEvent[] {
    const identity = this.#resolveIdentity(update);
    if (!identity) {
      return [];
    }
    return [
      route(
        identity.childProviderSessionId,
        {
          providerSessionId: identity.childProviderSessionId,
          status: "running",
          timestamp,
          type: "subagent_status",
        },
        identity
      ),
    ];
  }

  #normalizeFinished(
    update: Record<string, unknown>,
    timestamp: string
  ): readonly GrokRoutedSubagentEvent[] {
    const identity = this.#resolveIdentity(update);
    if (!identity) {
      return [];
    }
    const status = normalizeStatus(readField(update, "status"));
    const lifecycleStatus = status === "completed" ? "completed" : "failed";
    const message =
      readField(update, "error") ?? readField(update, "cancel_reason");
    const control = buildControl(
      identity,
      status,
      lifecycleStatus,
      timestamp,
      message ?? undefined
    );
    return [
      route(
        identity.childProviderSessionId,
        {
          providerSessionId: identity.childProviderSessionId,
          status,
          timestamp,
          type: "subagent_status",
        },
        identity
      ),
      route(identity.parentProviderSessionId, control, identity),
    ];
  }

  #resolveIdentity(
    update: Record<string, unknown>
  ): GrokSubagentIdentity | null {
    const subagentId = readField(update, "subagent_id", "subagentId");
    const childProviderSessionId = readField(
      update,
      "child_session_id",
      "childSessionId"
    );
    const known =
      (subagentId ? this.#identities.get(subagentId) : undefined) ??
      (childProviderSessionId
        ? this.#identities.get(childProviderSessionId)
        : undefined);
    if (known) {
      return known;
    }
    const identity = readIdentity(update);
    if (identity) {
      this.#remember(identity);
    }
    return identity;
  }

  #remember(identity: GrokSubagentIdentity): void {
    this.#identities.set(identity.subagentId, identity);
    this.#identities.set(identity.childProviderSessionId, identity);
  }
}

function buildControl(
  identity: GrokSubagentIdentity,
  status: ProviderSubagentStatus,
  lifecycleStatus: ProviderSubagentControlEvent["lifecycleStatus"],
  timestamp: string,
  message?: string
): ProviderSubagentControlEvent {
  return {
    action: "spawn",
    agentStates: [
      {
        ...(message ? { message } : {}),
        providerSessionId: identity.childProviderSessionId,
        status,
      },
    ],
    callId: identity.callId,
    lifecycleStatus,
    ...(identity.model ? { model: identity.model } : {}),
    ...(identity.description ? { prompt: identity.description } : {}),
    receiverProviderSessionIds: [identity.childProviderSessionId],
    senderProviderSessionId: identity.parentProviderSessionId,
    timestamp,
    type: "subagent_control",
  };
}

function route(
  targetProviderSessionId: string,
  event: ProviderSubagentEvent,
  identity: GrokSubagentIdentity
): GrokRoutedSubagentEvent {
  return {
    childProviderSessionId: identity.childProviderSessionId,
    event,
    targetProviderSessionId,
  };
}

function readIdentity(
  update: Record<string, unknown>
): GrokSubagentIdentity | null {
  const subagentId = readField(update, "subagent_id", "subagentId");
  const childProviderSessionId = readField(
    update,
    "child_session_id",
    "childSessionId"
  );
  const parentProviderSessionId = readField(
    update,
    "parent_session_id",
    "parentSessionId"
  );
  if (!(subagentId && childProviderSessionId && parentProviderSessionId)) {
    return null;
  }
  return {
    callId:
      readField(update, "parent_prompt_id", "parentPromptId") ?? subagentId,
    childProviderSessionId,
    description: readField(update, "description") ?? undefined,
    model: readField(update, "model") ?? undefined,
    parentProviderSessionId,
    subagentId,
  };
}

function normalizeStatus(value: string | null): ProviderSubagentStatus {
  switch (value?.toLowerCase()) {
    case "completed":
    case "success":
      return "completed";
    case "cancelled":
    case "canceled":
    case "interrupted":
      return "interrupted";
    case "shutdown":
      return "shutdown";
    case "not_found":
      return "not_found";
    default:
      return "failed";
  }
}

function unwrapNotificationParams(
  value: unknown
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.method === "string" && isRecord(value.params)
    ? value.params
    : value;
}

function unwrapExtensionResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return isRecord(value.result) ? value.result : value;
}

function readTimestamp(params: Record<string, unknown>): string | null {
  const meta = isRecord(params._meta) ? params._meta : null;
  return readField(meta ?? {}, "timestamp");
}

function readField(
  value: Record<string, unknown>,
  snakeCase: string,
  camelCase = snakeCase
): string | null {
  const candidate = value[snakeCase] ?? value[camelCase];
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}
