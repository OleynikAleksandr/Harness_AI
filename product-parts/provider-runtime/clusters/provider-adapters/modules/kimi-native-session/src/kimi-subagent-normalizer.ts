import type {
  ProviderSubagentEvent,
  ProviderSubagentStatus,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { isKimiAcpRecord } from "./kimi-acp-session-contracts.js";

// The Kimi CLI exposes no dedicated subagent discriminators on the ACP
// stream: subagents surface as `Agent`/`AgentSwarm` tool calls. The call's
// input is streamed only as partial-JSON `content` chunks (`rawInput` stays
// null for swarms — verified live against CLI 0.26.0), the stream is silent
// while agents execute, and the terminal update carries the results: an
// Agent result as `agent_id`/`actual_subagent_type`/`status` lines, a swarm
// result as `<subagent agent_id item outcome>text</subagent>` sections. This
// normalizer accumulates the streamed input until it parses, surfaces the
// parsed description as the task, and synthesizes the provider-neutral
// subagent lifecycle (`kimi-agent-<toolCallId>` for the call itself plus
// `kimi-agent-<toolCallId>:<agent_id>` per swarm agent) so the dialog shows
// the same launch divider as Claude/Codex.
const SUBAGENT_TOOL_TITLES = new Set(["Agent", "AgentSwarm"]);
const SUBAGENT_ROLE_PATTERN = /actual_subagent_type:\s*([\w-]+)/u;
const SUBAGENT_RESULT_STATUS_PATTERN = /(?:^|\n)status:\s*([\w-]+)/u;
const SWARM_AGENT_SECTION_PATTERN =
  /<subagent\s+([^>]*?)>([\s\S]*?)<\/subagent>/gu;
const SWARM_ATTRIBUTE_PATTERN = /([\w-]+)="([^"]*)"/gu;
const SWARM_SUMMARY_PATTERN = /<summary>([\s\S]*?)<\/summary>/u;
const AGENT_RESULT_BODY_MARKER = /\n\[summary\]\n/u;

interface ParsedSubagentInput {
  readonly description: string | null;
  readonly itemCount: number;
  readonly prompt: string | null;
  readonly subagentType: string | null;
}

// One live swarm agent observed in the CLI session store while the swarm
// still runs (`agents/agent-<n>/`, delegated prompt from its wire).
export interface KimiLiveSwarmAgent {
  readonly agentId: string;
  readonly prompt: string | null;
}

interface ParsedSwarmAgentResult {
  readonly agentId: string;
  readonly item: string | null;
  readonly outcome: string | null;
  readonly text: string;
}

interface TrackedSwarmAgent {
  readonly childId: string;
  terminal: boolean;
}

interface TrackedKimiSubagent {
  readonly agents: Map<string, TrackedSwarmAgent>;
  readonly childId: string;
  inputText: string;
  parsedInput: ParsedSubagentInput | null;
  readonly swarm: boolean;
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
    const status = readString(update.status);
    const isTerminalUpdate =
      update.sessionUpdate === "tool_call_update" &&
      (status === "completed" || status === "failed");
    const events: ProviderSubagentEvent[] = [];
    if (!isTerminalUpdate) {
      this.accumulateInput(entry, update);
    }
    const task = readTask(update) ?? taskFromParsedInput(entry);
    if (task && task !== entry.task) {
      entry.task = task;
      events.push(sessionEvent(parent, entry.childId, "running", task, null));
    }
    if (isTerminalUpdate) {
      entry.terminal = true;
      events.push(
        ...(entry.swarm
          ? this.swarmTerminalEvents(parent, toolCallId, entry, update, status)
          : this.agentTerminalEvents(parent, entry, update, status))
      );
    }
    return events;
  }

  // Tool call ids of swarms that are still running — the runtime polls the
  // session store only while this is non-empty.
  liveSwarmCallIds(): string[] {
    return [...this.tracked.entries()]
      .filter(([, entry]) => entry.swarm && !entry.terminal)
      .map(([toolCallId]) => toolCallId);
  }

  // Register agents the session-store poller observed for a running swarm:
  // every unseen agent spawns as a running child so the launch divider grows
  // live. Terminal statuses stay with the swarm result.
  registerLiveSwarmAgents(
    toolCallId: string,
    agents: readonly KimiLiveSwarmAgent[]
  ): ProviderSubagentEvent[] {
    const parent = this.parentProviderSessionId;
    const entry = this.tracked.get(toolCallId);
    if (!(parent && entry?.swarm) || entry.terminal) {
      return [];
    }
    const events: ProviderSubagentEvent[] = [];
    const role = entry.parsedInput?.subagentType ?? null;
    for (const agent of agents) {
      if (entry.agents.has(agent.agentId)) {
        continue;
      }
      const childId = `${entry.childId}:${agent.agentId}`;
      entry.agents.set(agent.agentId, { childId, terminal: false });
      events.push(
        spawnControl(parent, toolCallId, childId, entry.task),
        sessionEvent(parent, childId, "running", agent.prompt, role)
      );
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
    this.tracked.set(toolCallId, {
      agents: new Map(),
      childId,
      inputText: "",
      parsedInput: null,
      swarm: title === "AgentSwarm",
      task: null,
      terminal: false,
    });
    return [
      spawnControl(parent, toolCallId, childId, null),
      sessionEvent(parent, childId, "running", null, null),
    ];
  }

  // The input JSON streams token-by-token through non-terminal `content`
  // chunks; parse it as soon as the accumulated text becomes valid JSON.
  private accumulateInput(
    entry: TrackedKimiSubagent,
    update: Record<string, unknown>
  ): void {
    const chunk = readResultText(update);
    if (!chunk || entry.parsedInput) {
      return;
    }
    entry.inputText += chunk;
    try {
      const parsed: unknown = JSON.parse(entry.inputText);
      if (!isKimiAcpRecord(parsed)) {
        return;
      }
      entry.parsedInput = {
        description: readString(parsed.description),
        itemCount: Array.isArray(parsed.items) ? parsed.items.length : 0,
        prompt: readString(parsed.prompt),
        subagentType: readString(parsed.subagent_type),
      };
    } catch {
      // Still a partial JSON prefix; keep accumulating.
    }
  }

  private agentTerminalEvents(
    parent: string,
    entry: TrackedKimiSubagent,
    update: Record<string, unknown>,
    updateStatus: string | null
  ): ProviderSubagentEvent[] {
    const resultText = readResultText(update);
    const role =
      resultText.match(SUBAGENT_ROLE_PATTERN)?.[1] ??
      entry.parsedInput?.subagentType ??
      null;
    const reportedStatus =
      resultText.match(SUBAGENT_RESULT_STATUS_PATTERN)?.[1] ?? null;
    const status: ProviderSubagentStatus =
      updateStatus === "failed" || reportedStatus === "failed"
        ? "failed"
        : "completed";
    return [
      sessionEvent(
        parent,
        entry.childId,
        status,
        entry.task,
        role,
        agentResultBody(resultText)
      ),
      statusEvent(entry.childId, status),
    ];
  }

  // A terminal swarm update materializes every reported agent as its own
  // child (spawning the ones live polling never saw) and closes the swarm's
  // root child; `aborted` agents surface as `interrupted`, not `failed`.
  private swarmTerminalEvents(
    parent: string,
    toolCallId: string,
    entry: TrackedKimiSubagent,
    update: Record<string, unknown>,
    updateStatus: string | null
  ): ProviderSubagentEvent[] {
    const events: ProviderSubagentEvent[] = [];
    const role = entry.parsedInput?.subagentType ?? null;
    const resultText = readResultText(update);
    for (const agent of parseSwarmAgentResults(resultText)) {
      const existing = entry.agents.get(agent.agentId);
      const childId = existing?.childId ?? `${entry.childId}:${agent.agentId}`;
      if (!existing) {
        entry.agents.set(agent.agentId, { childId, terminal: false });
        events.push(
          spawnControl(parent, toolCallId, childId, entry.task),
          sessionEvent(parent, childId, "running", agent.item, role)
        );
      }
      const trackedAgent = entry.agents.get(agent.agentId);
      if (trackedAgent && !trackedAgent.terminal) {
        trackedAgent.terminal = true;
        const status = swarmOutcomeStatus(agent.outcome);
        events.push(
          sessionEvent(parent, childId, status, agent.item, role, agent.text),
          statusEvent(childId, status)
        );
      }
    }
    const rootStatus: ProviderSubagentStatus =
      updateStatus === "failed" ? "failed" : "completed";
    events.push(
      sessionEvent(
        parent,
        entry.childId,
        rootStatus,
        entry.task,
        role,
        resultText.match(SWARM_SUMMARY_PATTERN)?.[1]?.trim() ?? null
      ),
      statusEvent(entry.childId, rootStatus)
    );
    return events;
  }
}

function swarmOutcomeStatus(outcome: string | null): ProviderSubagentStatus {
  if (outcome === "completed") {
    return "completed";
  }
  return outcome === "aborted" ? "interrupted" : "failed";
}

function parseSwarmAgentResults(text: string): ParsedSwarmAgentResult[] {
  const results: ParsedSwarmAgentResult[] = [];
  for (const section of text.matchAll(SWARM_AGENT_SECTION_PATTERN)) {
    const attributes = new Map<string, string>();
    for (const attribute of section[1].matchAll(SWARM_ATTRIBUTE_PATTERN)) {
      attributes.set(attribute[1], attribute[2]);
    }
    const agentId = attributes.get("agent_id");
    if (!agentId) {
      continue;
    }
    results.push({
      agentId,
      item: attributes.get("item") ?? null,
      outcome: attributes.get("outcome") ?? null,
      text: section[2].trim(),
    });
  }
  return results;
}

function spawnControl(
  parent: string,
  callId: string,
  childId: string,
  prompt: string | null
): ProviderSubagentEvent {
  return {
    action: "spawn",
    agentStates: [{ providerSessionId: childId, status: "running" }],
    callId,
    lifecycleStatus: "running",
    ...(prompt ? { prompt } : {}),
    receiverProviderSessionIds: [childId],
    senderProviderSessionId: parent,
    timestamp: nowIso(),
    type: "subagent_control",
  };
}

function sessionEvent(
  parent: string,
  childId: string,
  status: ProviderSubagentStatus,
  task: string | null,
  role: string | null,
  result: string | null = null
): ProviderSubagentEvent {
  return {
    ...(role ? { agentRole: role } : {}),
    parentProviderSessionId: parent,
    providerSessionId: childId,
    ...(result ? { result } : {}),
    status,
    ...(task ? { task } : {}),
    timestamp: nowIso(),
    type: "subagent_session",
  };
}

// A single-Agent result prefixes machine lines (`agent_id`, `status`, ...)
// before a `[summary]` marker; the child's assistant message is the body.
function agentResultBody(resultText: string): string | null {
  const parts = resultText.split(AGENT_RESULT_BODY_MARKER);
  const body = (parts.length > 1 ? parts.at(-1) : resultText)?.trim();
  return body ? body : null;
}

function statusEvent(
  childId: string,
  status: ProviderSubagentStatus
): ProviderSubagentEvent {
  return {
    providerSessionId: childId,
    status,
    timestamp: nowIso(),
    type: "subagent_status",
  };
}

// The streamed tool input settles as `rawInput` on a later update for single
// Agent calls; swarms never deliver it, so the accumulated input parse is
// the fallback task source.
function readTask(update: Record<string, unknown>): string | null {
  const rawInput = isKimiAcpRecord(update.rawInput) ? update.rawInput : null;
  return readString(rawInput?.description) ?? readString(rawInput?.prompt);
}

function taskFromParsedInput(entry: TrackedKimiSubagent): string | null {
  const parsed = entry.parsedInput;
  if (!parsed) {
    return null;
  }
  const base = parsed.description ?? parsed.prompt;
  if (!base) {
    return null;
  }
  return entry.swarm && parsed.itemCount > 0
    ? `${base} (${parsed.itemCount} agents)`
    : base;
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
