import type {
  ProviderSubagentControlEvent,
  ProviderSubagentSessionEvent,
  ProviderSubagentState,
  ProviderSubagentStatus,
  ProviderSubagentStatusEvent,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

interface CodexSubagentRouteDependencies {
  readonly emit: (threadId: string, payload: unknown) => void;
  readonly ensureSessionState: (threadId: string) => { workspacePath: string };
}

const CODEX_AGENT_STATUS: Readonly<Record<string, ProviderSubagentStatus>> = {
  pendingInit: "pending",
  running: "running",
  interrupted: "interrupted",
  completed: "completed",
  errored: "failed",
  shutdown: "shutdown",
  notFound: "not_found",
};

const CODEX_COLLAB_ACTION = {
  spawnAgent: "spawn",
  sendInput: "send_input",
  resumeAgent: "resume",
  wait: "wait",
  closeAgent: "close",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(asString).filter((entry): entry is string => entry !== null)
    : [];

const optionalString = (value: unknown): string | undefined =>
  asString(value) ?? undefined;

const timestampFrom = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = new Date(value);
    if (!Number.isNaN(timestamp.valueOf())) {
      return timestamp.toISOString();
    }
  }
  return new Date().toISOString();
};

const timestampFromSeconds = (value: unknown): string =>
  typeof value === "number" && Number.isFinite(value)
    ? timestampFrom(value * 1000)
    : new Date().toISOString();

const titleFromAgentPath = (value: unknown): string | undefined => {
  const agentPath = asString(value);
  const segment = agentPath?.split("/").filter(Boolean).at(-1);
  if (!segment) {
    return undefined;
  }
  const title = segment.replaceAll(/[_-]+/gu, " ").trim();
  return title.length > 0
    ? `${title.slice(0, 1).toUpperCase()}${title.slice(1)}`
    : undefined;
};

const normalizeAgentStatus = (
  value: unknown
): ProviderSubagentStatus | null => {
  const status = asString(value);
  return status ? (CODEX_AGENT_STATUS[status] ?? null) : null;
};

const normalizeThreadStatus = (value: unknown): ProviderSubagentStatus => {
  const type = isRecord(value) ? asString(value.type) : null;
  if (type === "active") {
    return "running";
  }
  if (type === "systemError") {
    return "failed";
  }
  return "completed";
};

const normalizeCallStatus = (
  value: unknown
): ProviderSubagentControlEvent["lifecycleStatus"] => {
  const status = asString(value);
  if (status === "failed") {
    return "failed";
  }
  return status === "completed" ? "completed" : "running";
};

const normalizeAgentStates = (value: unknown): ProviderSubagentState[] => {
  if (!isRecord(value)) {
    return [];
  }
  const states: ProviderSubagentState[] = [];
  for (const [providerSessionId, candidate] of Object.entries(value)) {
    if (!isRecord(candidate)) {
      continue;
    }
    const status = normalizeAgentStatus(candidate.status);
    if (!status) {
      continue;
    }
    const message = optionalString(candidate.message);
    states.push({
      ...(message ? { message } : {}),
      providerSessionId,
      status,
    });
  }
  return states;
};

function normalizeControlEvent(
  params: Record<string, unknown>,
  timestampKey: "startedAtMs" | "completedAtMs"
): ProviderSubagentControlEvent | null {
  const item = isRecord(params.item) ? params.item : null;
  if (asString(item?.type) !== "collabAgentToolCall") {
    return null;
  }
  const tool = asString(item?.tool);
  const action = tool
    ? CODEX_COLLAB_ACTION[tool as keyof typeof CODEX_COLLAB_ACTION]
    : undefined;
  const callId = asString(item?.id);
  const senderProviderSessionId =
    asString(item?.senderThreadId) ?? asString(params.threadId);
  if (!(action && callId && senderProviderSessionId)) {
    return null;
  }
  const model = optionalString(item?.model);
  const prompt = optionalString(item?.prompt);
  const reasoningEffort = optionalString(item?.reasoningEffort);
  return {
    action,
    agentStates: normalizeAgentStates(item?.agentsStates),
    callId,
    lifecycleStatus: normalizeCallStatus(item?.status),
    ...(model ? { model } : {}),
    ...(prompt ? { prompt } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    receiverProviderSessionIds: asStringArray(item?.receiverThreadIds),
    senderProviderSessionId,
    timestamp: timestampFrom(params[timestampKey]),
    type: "subagent_control",
  };
}

function normalizeActivityEvent(
  params: Record<string, unknown>,
  timestampKey: "startedAtMs" | "completedAtMs"
): {
  readonly emitToProviderSessionId: string;
  readonly event: ProviderSubagentControlEvent | ProviderSubagentStatusEvent;
} | null {
  const item = isRecord(params.item) ? params.item : null;
  if (asString(item?.type) !== "subAgentActivity") {
    return null;
  }
  const callId = asString(item?.id);
  const kind = asString(item?.kind);
  const parentProviderSessionId = asString(params.threadId);
  const providerSessionId = asString(item?.agentThreadId);
  if (!(callId && kind && parentProviderSessionId && providerSessionId)) {
    return null;
  }
  const timestamp = timestampFrom(params[timestampKey]);
  if (kind === "started") {
    const prompt = titleFromAgentPath(item?.agentPath);
    return {
      emitToProviderSessionId: parentProviderSessionId,
      event: {
        action: "spawn",
        agentStates: [{ providerSessionId, status: "running" }],
        callId,
        lifecycleStatus:
          timestampKey === "completedAtMs" ? "completed" : "running",
        ...(prompt ? { prompt } : {}),
        receiverProviderSessionIds: [providerSessionId],
        senderProviderSessionId: parentProviderSessionId,
        timestamp,
        type: "subagent_control",
      },
    };
  }
  let status: ProviderSubagentStatus | null = null;
  if (kind === "interrupted") {
    status = "interrupted";
  } else if (kind === "interacted") {
    status = "running";
  }
  return status
    ? {
        emitToProviderSessionId: providerSessionId,
        event: {
          providerSessionId,
          status,
          timestamp,
          type: "subagent_status",
        },
      }
    : null;
}

function resolveThreadSpawnMetadata(thread: Record<string, unknown>): {
  readonly agentNickname?: string;
  readonly agentPath?: string;
  readonly agentRole?: string;
  readonly parentProviderSessionId?: string;
} {
  const source = isRecord(thread.source) ? thread.source : null;
  const subAgentValue = source?.subAgent ?? source?.subagent;
  const subAgent = isRecord(subAgentValue) ? subAgentValue : null;
  const spawn = isRecord(subAgent?.thread_spawn) ? subAgent.thread_spawn : null;
  return {
    ...(optionalString(spawn?.agent_nickname)
      ? { agentNickname: optionalString(spawn?.agent_nickname) }
      : {}),
    ...(optionalString(spawn?.agent_path)
      ? { agentPath: optionalString(spawn?.agent_path) }
      : {}),
    ...(optionalString(spawn?.agent_role)
      ? { agentRole: optionalString(spawn?.agent_role) }
      : {}),
    ...(optionalString(spawn?.parent_thread_id)
      ? { parentProviderSessionId: optionalString(spawn?.parent_thread_id) }
      : {}),
  };
}

function normalizeSessionEvent(
  params: Record<string, unknown>
): ProviderSubagentSessionEvent | null {
  const thread = isRecord(params.thread) ? params.thread : null;
  if (!thread) {
    return null;
  }
  const spawn = resolveThreadSpawnMetadata(thread);
  const providerSessionId = asString(thread?.id);
  const parentProviderSessionId =
    asString(thread?.parentThreadId) ?? spawn.parentProviderSessionId ?? null;
  if (!(providerSessionId && parentProviderSessionId)) {
    return null;
  }
  const agentNickname =
    optionalString(thread?.agentNickname) ?? spawn.agentNickname;
  const agentRole = optionalString(thread?.agentRole) ?? spawn.agentRole;
  const task = optionalString(thread?.preview);
  const title =
    optionalString(thread?.name) ?? titleFromAgentPath(spawn.agentPath);
  return {
    ...(agentNickname ? { agentNickname } : {}),
    ...(agentRole ? { agentRole } : {}),
    parentProviderSessionId,
    providerSessionId,
    status: normalizeThreadStatus(thread?.status),
    ...(task ? { task } : {}),
    timestamp: timestampFromSeconds(thread?.createdAt),
    ...(title ? { title } : {}),
    type: "subagent_session",
  };
}

function normalizeTurnStatusEvent(
  method: string,
  params: Record<string, unknown>
): ProviderSubagentStatusEvent | null {
  const providerSessionId = asString(params.threadId);
  if (!providerSessionId) {
    return null;
  }
  const turn = isRecord(params.turn) ? params.turn : null;
  if (method === "turn/started") {
    return {
      providerSessionId,
      status: "running",
      timestamp: timestampFromSeconds(turn?.startedAt),
      type: "subagent_status",
    };
  }
  const failed = asString(turn?.status) === "failed" || isRecord(turn?.error);
  return {
    providerSessionId,
    status: failed ? "failed" : "completed",
    timestamp: timestampFromSeconds(turn?.completedAt),
    type: "subagent_status",
  };
}

function normalizeStatusEvent(
  params: Record<string, unknown>
): ProviderSubagentStatusEvent | null {
  const providerSessionId = asString(params.threadId);
  if (!providerSessionId) {
    return null;
  }
  return {
    providerSessionId,
    status: normalizeThreadStatus(params.status),
    timestamp: new Date().toISOString(),
    type: "subagent_status",
  };
}

function copyParentWorkspaceToReceivers(
  deps: CodexSubagentRouteDependencies,
  event: ProviderSubagentControlEvent
): void {
  const parentState = deps.ensureSessionState(event.senderProviderSessionId);
  for (const childId of event.receiverProviderSessionIds) {
    deps.ensureSessionState(childId).workspacePath = parentState.workspacePath;
  }
}

function routeItemNotification(
  deps: CodexSubagentRouteDependencies,
  method: "item/started" | "item/completed",
  params: Record<string, unknown>
): boolean {
  const timestampKey =
    method === "item/started" ? "startedAtMs" : "completedAtMs";
  const activity = normalizeActivityEvent(params, timestampKey);
  if (activity) {
    if (activity.event.type === "subagent_control") {
      copyParentWorkspaceToReceivers(deps, activity.event);
    }
    deps.emit(activity.emitToProviderSessionId, activity.event);
    return true;
  }
  const event = normalizeControlEvent(params, timestampKey);
  if (!event) {
    return false;
  }
  copyParentWorkspaceToReceivers(deps, event);
  deps.emit(event.senderProviderSessionId, event);
  return true;
}

function routeThreadStarted(
  deps: CodexSubagentRouteDependencies,
  params: Record<string, unknown>
): boolean {
  const event = normalizeSessionEvent(params);
  if (!event) {
    return false;
  }
  const parentState = deps.ensureSessionState(event.parentProviderSessionId);
  const childState = deps.ensureSessionState(event.providerSessionId);
  childState.workspacePath = parentState.workspacePath;
  deps.emit(event.parentProviderSessionId, event);
  return true;
}

function routeThreadStatus(
  deps: CodexSubagentRouteDependencies,
  params: Record<string, unknown>
): boolean {
  const event = normalizeStatusEvent(params);
  if (event) {
    deps.emit(event.providerSessionId, event);
  }
  return Boolean(event);
}

function routeTurnStatus(
  deps: CodexSubagentRouteDependencies,
  method: "turn/started" | "turn/completed",
  params: Record<string, unknown>
): void {
  const event = normalizeTurnStatusEvent(method, params);
  if (event) {
    deps.emit(event.providerSessionId, event);
  }
}

function routeTerminalError(
  deps: CodexSubagentRouteDependencies,
  params: Record<string, unknown>
): void {
  if (params.willRetry === true) {
    return;
  }
  const providerSessionId = asString(params.threadId);
  if (!providerSessionId) {
    return;
  }
  deps.emit(providerSessionId, {
    providerSessionId,
    status: "failed",
    timestamp: new Date().toISOString(),
    type: "subagent_status",
  } satisfies ProviderSubagentStatusEvent);
}

export function routeCodexSubagentNotification(
  deps: CodexSubagentRouteDependencies,
  method: string,
  params: unknown
): boolean {
  if (!isRecord(params)) {
    return false;
  }
  if (method === "item/started" || method === "item/completed") {
    return routeItemNotification(deps, method, params);
  }
  if (method === "turn/started" || method === "turn/completed") {
    routeTurnStatus(deps, method, params);
    return false;
  }
  if (method === "error") {
    routeTerminalError(deps, params);
    return false;
  }
  if (method === "thread/started") {
    return routeThreadStarted(deps, params);
  }
  if (method === "thread/status/changed") {
    return routeThreadStatus(deps, params);
  }
  return false;
}
