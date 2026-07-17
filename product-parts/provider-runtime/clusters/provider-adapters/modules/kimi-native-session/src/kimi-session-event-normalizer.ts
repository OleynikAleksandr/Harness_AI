import { randomUUID } from "node:crypto";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import type { ProviderSubagentEvent } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  isKimiAcpRecord,
  type KimiAcpNotification,
} from "./kimi-acp-session-contracts.js";
import {
  type KimiLiveSwarmAgent,
  KimiSubagentNormalizer,
} from "./kimi-subagent-normalizer.js";

// Events one native Kimi session emits toward Core: dialog/stream/lifecycle
// events plus the synthesized provider-neutral subagent lifecycle.
export type KimiNativeSessionEvent =
  | NormalizedProviderEvent
  | ProviderSubagentEvent;

// Verified Kimi ACP stream discriminators (`session/update`): assistant and
// thought text arrive as chunks, tools as call/update pairs, token usage as
// `usage_update` with `used`/`size`. Chunk buffering reuses the
// sentence-boundary thresholds proven by the retired ACP provider so the
// dialog receives readable blocks instead of token spray.
const FLUSH_MIN_CHARS = 900;
const BOUNDARY_MIN_CHARS = 360;
const BOUNDARY_REGEX = /(?:\n\n|[.!?。！？]\s*)$/u;

type BufferedRole = "assistant" | "thinking";

export class KimiSessionEventNormalizer {
  private readonly buffers: Record<BufferedRole, string[]> = {
    assistant: [],
    thinking: [],
  };
  private readonly subagents = new KimiSubagentNormalizer();

  // The Core-visible provider session id (`kimi-native-<uuid>`) becomes the
  // parent of every synthesized subagent.
  bindParentSession(providerSessionId: string): void {
    this.subagents.bindParentSession(providerSessionId);
  }

  // Live-swarm entry points the runtime polls through (the subagent
  // normalizer is encapsulated here): swarm ids still running, and
  // registration of agents observed in the CLI session store.
  liveSwarmCallIds(): string[] {
    return this.subagents.liveSwarmCallIds();
  }

  registerLiveSwarmAgents(
    toolCallId: string,
    agents: readonly KimiLiveSwarmAgent[]
  ): KimiNativeSessionEvent[] {
    return this.subagents.registerLiveSwarmAgents(toolCallId, agents);
  }

  // Map one `session/update` notification onto Core events. Non-update
  // methods surface as diagnostic stream events so nothing is silently
  // dropped.
  normalizeNotification(
    notification: KimiAcpNotification
  ): KimiNativeSessionEvent[] {
    if (notification.method !== "session/update") {
      return [
        streamEvent("kimi_acp_notification", {
          method: notification.method,
          raw: notification.params ?? null,
        }),
      ];
    }
    const params = isKimiAcpRecord(notification.params)
      ? notification.params
      : null;
    const update = isKimiAcpRecord(params?.update) ? params.update : null;
    if (!update) {
      return [streamEvent("kimi_session_update", { raw: params })];
    }
    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        return [
          ...this.flush("thinking"),
          ...this.buffer("assistant", readChunkText(update)),
        ];
      case "agent_thought_chunk":
        return this.buffer("thinking", readChunkText(update));
      case "tool_call":
        return [
          ...this.flushAll(),
          ...this.subagents.normalizeToolUpdate(update),
          streamEvent("kimi_tool_call", readToolPayload(update)),
        ];
      case "tool_call_update":
        return [
          ...this.subagents.normalizeToolUpdate(update),
          streamEvent("kimi_tool_result", readToolPayload(update)),
        ];
      case "usage_update":
        return normalizeUsage(update);
      default:
        return [
          ...this.flushAll(),
          streamEvent("kimi_session_update", {
            raw: update,
            sessionUpdate: readString(update.sessionUpdate),
          }),
        ];
    }
  }

  // The turn boundary is the `session/prompt` response, not a notification:
  // the runtime calls this right before emitting turn_completed/turn_failed.
  flushTurnEnd(): NormalizedProviderEvent[] {
    return this.flushAll();
  }

  private buffer(role: BufferedRole, text: string): NormalizedProviderEvent[] {
    if (!text) {
      return [];
    }
    this.buffers[role].push(text);
    const pending = this.buffers[role].join("");
    if (
      pending.length >= FLUSH_MIN_CHARS ||
      (pending.length >= BOUNDARY_MIN_CHARS &&
        BOUNDARY_REGEX.test(pending.trimEnd()))
    ) {
      return this.flush(role);
    }
    return [];
  }

  private flushAll(): NormalizedProviderEvent[] {
    return [...this.flush("thinking"), ...this.flush("assistant")];
  }

  private flush(role: BufferedRole): NormalizedProviderEvent[] {
    const content = this.buffers[role].join("").trim();
    this.buffers[role].length = 0;
    if (!content) {
      return [];
    }
    return [
      {
        content,
        role: role === "thinking" ? "thinking" : "assistant",
        ...(role === "thinking" ? { tag: "thinking" } : {}),
        timestamp: nowIso(),
        type: "dialog_message",
        uuid: randomUUID(),
      },
    ];
  }
}

function normalizeUsage(
  update: Record<string, unknown>
): NormalizedProviderEvent[] {
  const used = readNumber(update.used);
  const limit = readNumber(update.size);
  if (used === null || limit === null || limit <= 0) {
    return [streamEvent("kimi_usage_update", { raw: update })];
  }
  return [streamEvent("token_usage", { tokenUsage: { limit, used } })];
}

function readChunkText(update: Record<string, unknown>): string {
  const content = isKimiAcpRecord(update.content) ? update.content : null;
  return typeof content?.text === "string" ? content.text : "";
}

function readToolPayload(
  update: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(readString(update.status) ? { status: readString(update.status) } : {}),
    ...(readString(update.title) ? { toolName: readString(update.title) } : {}),
    ...(readString(update.toolCallId)
      ? { toolCallId: readString(update.toolCallId) }
      : {}),
    raw: update,
  };
}

function streamEvent(
  kind: string,
  data: Record<string, unknown>
): NormalizedProviderEvent {
  return {
    data: { kind, ...data },
    timestamp: nowIso(),
    type: "stream_event",
    uuid: `${randomUUID()}::${kind}`,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nowIso(): string {
  return new Date().toISOString();
}
