import crypto from "node:crypto";
import type { ActiveSession } from "../session/types.js";
import type { ClaudeStreamMessage } from "../types.js";
import {
  buildTokenUsageSnapshot,
  type TokenUsageSnapshot,
} from "./claude-token-usage-snapshot.js";

const TEMP_SESSION_PREFIX = "temp_";

interface ClaudeLiveUsageEmitterOptions {
  readonly providerId?: string;
}

// Emits a `token_usage` stream event after every agent-loop API call (Codex
// parity): the SDK usage tracker refreshes `ActiveSession.sdkUsage` on each
// assistant message, and this emitter forwards changed snapshots so the
// status panel ticks during the turn instead of waiting for turn end.
export class ClaudeLiveUsageEmitter {
  private readonly lastEmitted = new Map<string, TokenUsageSnapshot>();
  private readonly providerId: string;

  constructor(options: ClaudeLiveUsageEmitterOptions = {}) {
    this.providerId = options.providerId ?? "claude";
  }

  emitIfChanged(session: ActiveSession, message: ClaudeStreamMessage): void {
    const claudeSessionId = message.session_id ?? session.sessionId;
    if (!claudeSessionId || claudeSessionId.startsWith(TEMP_SESSION_PREFIX)) {
      return;
    }
    const snapshot = buildTokenUsageSnapshot(session.sdkUsage);
    if (!snapshot) {
      return;
    }
    const previous = this.lastEmitted.get(claudeSessionId);
    if (
      previous &&
      previous.used === snapshot.used &&
      previous.limit === snapshot.limit &&
      previous.cached === snapshot.cached
    ) {
      return;
    }
    this.lastEmitted.set(claudeSessionId, snapshot);
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: this.providerId,
      sessionId: session.sessionId,
      claudeSessionId,
      tokenUsage: snapshot,
      data: {
        kind: "token_usage",
        used: snapshot.used,
        limit: snapshot.limit,
        cached: snapshot.cached,
      },
      uuid: `${crypto.randomUUID()}::token_usage`,
      timestamp: new Date().toISOString(),
    });
  }
}
