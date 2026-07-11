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
  if (type === "notLoaded") {
    return "pending";
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

function normalizeSessionEvent(
  params: Record<string, unknown>
): ProviderSubagentSessionEvent | null {
  const thread = isRecord(params.thread) ? params.thread : null;
  const providerSessionId = asString(thread?.id);
  const parentProviderSessionId = asString(thread?.parentThreadId);
  if (!(providerSessionId && parentProviderSessionId)) {
    return null;
  }
  const agentNickname = optionalString(thread?.agentNickname);
  const agentRole = optionalString(thread?.agentRole);
  const task = optionalString(thread?.preview);
  const title = optionalString(thread?.name);
  return {
    ...(agentNickname ? { agentNickname } : {}),
    ...(agentRole ? { agentRole } : {}),
    parentProviderSessionId,
    providerSessionId,
    status: normalizeThreadStatus(thread?.status),
    ...(task ? { task } : {}),
    timestamp: new Date().toISOString(),
    ...(title ? { title } : {}),
    type: "subagent_session",
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

export function routeCodexSubagentNotification(
  deps: CodexSubagentRouteDependencies,
  method: string,
  params: unknown
): boolean {
  if (!isRecord(params)) {
    return false;
  }
  if (method === "item/started" || method === "item/completed") {
    const event = normalizeControlEvent(
      params,
      method === "item/started" ? "startedAtMs" : "completedAtMs"
    );
    if (event) {
      deps.emit(event.senderProviderSessionId, event);
    }
    return Boolean(event);
  }
  if (method === "thread/started") {
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
  if (method === "thread/status/changed") {
    const event = normalizeStatusEvent(params);
    if (event) {
      deps.emit(event.providerSessionId, event);
    }
    return Boolean(event);
  }
  return false;
}
