import type {
  ProviderSubagentEvent,
  ProviderSubagentStatus,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { isKimiAcpRecord } from "./kimi-acp-session-contracts.js";

// The Kimi CLI exposes no dedicated subagent discriminators on the ACP
// stream: subagents surface as `Agent`/`AgentSwarm` tool calls whose result
// text carries `agent_id`/`actual_subagent_type`/`status` lines (verified
// live against CLI 0.26.0). This normalizer synthesizes the
// provider-neutral subagent lifecycle from those tool updates so the dialog
// shows the same launch divider as Claude/Codex. The CLI reveals no child
// ACP session, so child ids are synthetic (`kimi-agent-<toolCallId>`) and
// one tool call maps to one launched child (an AgentSwarm call is surfaced
// as a single launch).
const SUBAGENT_TOOL_TITLES = new Set(["Agent", "AgentSwarm"]);
const SUBAGENT_ROLE_PATTERN = /actual_subagent_type:\s*([\w-]+)/u;
const SUBAGENT_RESULT_STATUS_PATTERN = /(?:^|\n)status:\s*([\w-]+)/u;

interface TrackedKimiSubagent {
  readonly childId: string;
  task: string | null;
  terminal: boolean;
}

export class KimiSubagentNormalizer {
  private parentProviderSessionId: string | null = null;
  private readonly tracked = new Map<string, TrackedKimiSubagent>();

  bindParentSession(providerSessionId: string): void {
    this.parentProviderSessionId = providerSessionId;
  }

  normalizeToolUpdate(
    update: Record<string, unknown>
  ): ProviderSubagentEvent[] {
    const parent = this.parentProviderSessionId;
    const toolCallId = readString(update.toolCallId);
    if (!(parent && toolCallId)) {
      return [];
    }
    const entry = this.tracked.get(toolCallId);
    if (!entry) {
      return this.trackSpawn(parent, toolCallId, update);
    }
    if (entry.terminal) {
      return [];
    }
    const events: ProviderSubagentEvent[] = [];
    const task = readTask(update);
    if (task && task !== entry.task) {
      entry.task = task;
      events.push(sessionEvent(parent, entry.childId, "running", task, null));
    }
    const status = readString(update.status);
    if (
      update.sessionUpdate === "tool_call_update" &&
      (status === "completed" || status === "failed")
    ) {
      entry.terminal = true;
      events.push(...this.terminalEvents(parent, entry, update, status));
    }
    return events;
  }

  private trackSpawn(
    parent: string,
    toolCallId: string,
    update: Record<string, unknown>
  ): ProviderSubagentEvent[] {
    const title = readString(update.title);
    if (
      update.sessionUpdate !== "tool_call" ||
      !title ||
      !SUBAGENT_TOOL_TITLES.has(title)
    ) {
      return [];
    }
    const childId = `kimi-agent-${toolCallId}`;
    this.tracked.set(toolCallId, { childId, task: null, terminal: false });
    return [
      {
        action: "spawn",
        agentStates: [{ providerSessionId: childId, status: "running" }],
        callId: toolCallId,
        lifecycleStatus: "running",
        receiverProviderSessionIds: [childId],
        senderProviderSessionId: parent,
        timestamp: nowIso(),
        type: "subagent_control",
      },
      sessionEvent(parent, childId, "running", null, null),
    ];
  }

  private terminalEvents(
    parent: string,
    entry: TrackedKimiSubagent,
    update: Record<string, unknown>,
    updateStatus: string
  ): ProviderSubagentEvent[] {
    const resultText = readResultText(update);
    const role = resultText.match(SUBAGENT_ROLE_PATTERN)?.[1] ?? null;
    const reportedStatus =
      resultText.match(SUBAGENT_RESULT_STATUS_PATTERN)?.[1] ?? null;
    const status: ProviderSubagentStatus =
      updateStatus === "failed" || reportedStatus === "failed"
        ? "failed"
        : "completed";
    return [
      sessionEvent(parent, entry.childId, status, entry.task, role),
      {
        providerSessionId: entry.childId,
        status,
        timestamp: nowIso(),
        type: "subagent_status",
      },
    ];
  }
}

function sessionEvent(
  parent: string,
  childId: string,
  status: ProviderSubagentStatus,
  task: string | null,
  role: string | null
): ProviderSubagentEvent {
  return {
    ...(role ? { agentRole: role } : {}),
    parentProviderSessionId: parent,
    providerSessionId: childId,
    status,
    ...(task ? { task } : {}),
    timestamp: nowIso(),
    type: "subagent_session",
  };
}

// The streamed tool input settles as `rawInput` on a later update; the
// subagent task is its `description` (falling back to the full prompt).
function readTask(update: Record<string, unknown>): string | null {
  const rawInput = isKimiAcpRecord(update.rawInput) ? update.rawInput : null;
  return readString(rawInput?.description) ?? readString(rawInput?.prompt);
}

function readResultText(update: Record<string, unknown>): string {
  if (!Array.isArray(update.content)) {
    return "";
  }
  return update.content
    .map((item) => {
      const content =
        isKimiAcpRecord(item) && isKimiAcpRecord(item.content)
          ? item.content
          : null;
      return typeof content?.text === "string" ? content.text : "";
    })
    .join("\n");
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nowIso(): string {
  return new Date().toISOString();
}
