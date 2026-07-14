import type {
  ProviderSubagentControlEvent,
  ProviderSubagentSessionEvent,
  ProviderSubagentStatus,
  ProviderSubagentStatusEvent,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type {
  ClaudeSubagentMeta,
  ClaudeSubagentToolUseResult,
} from "./claude-subagent-files.js";

// Child provider session ids reuse the native file base name
// (`agent-<agentId>`): the prefix separates subagent ids from the UUID ids of
// primary Claude sessions in resume/cleanup/alias code paths
// (docs/architecture/ClaudeSubagentSessions.md, section 4.3).
const CHILD_ID_PREFIX = "agent-";

export const toClaudeChildProviderSessionId = (agentId: string): string =>
  `${CHILD_ID_PREFIX}${agentId}`;

export const isClaudeChildProviderSessionId = (value: string): boolean =>
  value.startsWith(CHILD_ID_PREFIX);

export const mapClaudeSubagentTerminalStatus = (
  result: ClaudeSubagentToolUseResult
): ProviderSubagentStatus => {
  if (result.isError) {
    return "failed";
  }
  if (result.status === "completed") {
    return "completed";
  }
  if (result.status === "interrupted") {
    return "interrupted";
  }
  return "failed";
};

export interface ClaudeSubagentSpawnEvents {
  readonly control: ProviderSubagentControlEvent;
  readonly session: ProviderSubagentSessionEvent;
}

export const buildClaudeSubagentSpawnEvents = (options: {
  readonly meta: ClaudeSubagentMeta;
  readonly model?: string;
  readonly parentProviderSessionId: string;
  readonly status?: ProviderSubagentStatus;
  readonly timestamp: string;
}): ClaudeSubagentSpawnEvents => {
  const childId = toClaudeChildProviderSessionId(options.meta.agentId);
  const status = options.status ?? "running";
  const task =
    options.meta.description.trim().length > 0
      ? options.meta.description.trim()
      : options.meta.agentType;
  return {
    control: {
      action: "spawn",
      agentStates: [{ providerSessionId: childId, status }],
      callId: options.meta.toolUseId,
      lifecycleStatus: "running",
      ...(options.model ? { model: options.model } : {}),
      prompt: task,
      receiverProviderSessionIds: [childId],
      senderProviderSessionId: options.parentProviderSessionId,
      timestamp: options.timestamp,
      type: "subagent_control",
    },
    session: {
      agentRole: options.meta.agentType,
      parentProviderSessionId: options.parentProviderSessionId,
      providerSessionId: childId,
      status,
      task,
      timestamp: options.timestamp,
      title: task,
      type: "subagent_session",
    },
  };
};

export const buildClaudeSubagentTerminalStatusEvent = (
  result: ClaudeSubagentToolUseResult,
  fallbackTimestamp: string
): ProviderSubagentStatusEvent => ({
  providerSessionId: toClaudeChildProviderSessionId(result.agentId),
  status: mapClaudeSubagentTerminalStatus(result),
  timestamp: result.timestamp ?? fallbackTimestamp,
  type: "subagent_status",
});

// Transcript records project into the same provider message payloads the
// primary Claude stream emits, so Core's reasoning-display projection and
// message dedupe (stable uuid-based ids) apply unchanged.
export interface ClaudeSubagentTranscriptMessage {
  readonly content: string;
  readonly timestamp: string;
  readonly type: "assistant" | "thinking";
  readonly uuid: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const extractClaudeSubagentModel = (record: unknown): string | null => {
  if (!isRecord(record)) {
    return null;
  }
  const message = record.message;
  if (!isRecord(message)) {
    return null;
  }
  return typeof message.model === "string" && message.model.length > 0
    ? message.model
    : null;
};

// Subagent token usage projected into the same token_usage stream event the
// primary Claude channel emits (Codex subagent parity): `used` = last-call
// input + cache_read + cache_creation, `cached` = last-call cache read. The
// agent JSONL never reports a context window, so `limit` stays 0 downstream
// and the telemetry facade keeps its default.
export interface ClaudeSubagentTokenUsage {
  readonly cached: number;
  readonly used: number;
}

const readTokenCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const extractClaudeSubagentTokenUsage = (
  record: unknown
): ClaudeSubagentTokenUsage | null => {
  if (!isRecord(record) || record.type !== "assistant") {
    return null;
  }
  const message = record.message;
  if (!(isRecord(message) && isRecord(message.usage))) {
    return null;
  }
  const cached = readTokenCount(message.usage.cache_read_input_tokens);
  const used =
    readTokenCount(message.usage.input_tokens) +
    cached +
    readTokenCount(message.usage.cache_creation_input_tokens);
  return used > 0 ? { cached, used } : null;
};

export const normalizeClaudeSubagentTranscriptRecord = (
  record: unknown,
  fallbackTimestamp: string
): ClaudeSubagentTranscriptMessage[] => {
  if (!isRecord(record) || record.type !== "assistant") {
    return [];
  }
  const message = record.message;
  if (!(isRecord(message) && Array.isArray(message.content))) {
    return [];
  }
  const uuid =
    typeof record.uuid === "string" && record.uuid.length > 0
      ? record.uuid
      : null;
  if (!uuid) {
    return [];
  }
  const timestamp =
    typeof record.timestamp === "string" && record.timestamp.length > 0
      ? record.timestamp
      : fallbackTimestamp;
  const messages: ClaudeSubagentTranscriptMessage[] = [];
  let blockIndex = 0;
  for (const block of message.content) {
    if (!isRecord(block)) {
      continue;
    }
    if (block.type === "text" && typeof block.text === "string") {
      pushTranscriptMessage(messages, {
        content: block.text,
        timestamp,
        type: "assistant",
        uuid: `${uuid}::subagent::${blockIndex}`,
      });
    }
    if (block.type === "thinking" && typeof block.thinking === "string") {
      pushTranscriptMessage(messages, {
        content: block.thinking,
        timestamp,
        type: "thinking",
        uuid: `${uuid}::subagent::${blockIndex}`,
      });
    }
    blockIndex += 1;
  }
  return messages;
};

const pushTranscriptMessage = (
  messages: ClaudeSubagentTranscriptMessage[],
  message: ClaudeSubagentTranscriptMessage
): void => {
  if (message.content.trim().length === 0) {
    return;
  }
  messages.push(message);
};
