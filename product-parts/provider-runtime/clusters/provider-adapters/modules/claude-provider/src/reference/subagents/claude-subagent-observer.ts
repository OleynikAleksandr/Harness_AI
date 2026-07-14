import crypto from "node:crypto";
import type { ProviderSubagentEvent } from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildClaudeSubagentSpawnEvents,
  buildClaudeSubagentTerminalStatusEvent,
  type ClaudeSubagentTokenUsage,
  extractClaudeSubagentModel,
  extractClaudeSubagentTokenUsage,
  normalizeClaudeSubagentTranscriptRecord,
  toClaudeChildProviderSessionId,
} from "./claude-subagent-event-normalizer.js";
import {
  type ClaudeSubagentMeta,
  type ClaudeSubagentToolUseResult,
  createJsonlTailCursor,
  extractSubagentToolUseResult,
  findParentTranscriptPath,
  type JsonlTailCursor,
  readJsonlRecordsFrom,
  resolveSubagentsDir,
  scanSubagentsDirectory,
} from "./claude-subagent-files.js";

const DEFAULT_POLL_INTERVAL_MS = 1500;

export interface ClaudeSubagentObserverEmitter {
  readonly emitToChild: (
    childProviderSessionId: string,
    payload: unknown
  ) => void;
  readonly emitToParent: (event: ProviderSubagentEvent) => void;
}

export interface ClaudeSubagentObserverOptions {
  readonly emitter: ClaudeSubagentObserverEmitter;
  readonly now?: () => string;
  readonly onScanError?: (error: unknown) => void;
  readonly parentProviderSessionId: string;
  readonly pollIntervalMs?: number;
  readonly projectsDir: string;
}

interface TrackedSubagent {
  readonly cursor: JsonlTailCursor;
  lastTokenUsage: ClaudeSubagentTokenUsage | null;
  readonly meta: ClaudeSubagentMeta;
  model: string | null;
  spawnEmitted: boolean;
  terminalEmitted: boolean;
  readonly transcriptPath: string;
}

// Watches the native Claude subagent files of one parent session and replays
// them as provider-neutral events: live polling while a turn runs plus a
// hydration scan on (re)subscribe. All scans run through one serialized
// chain, and spawn/terminal replay happens at most once per agent per
// process — Core's persisted history and monotonic terminal guard absorb
// replays across restarts (docs/architecture/ClaudeSubagentSessions.md).
export class ClaudeSubagentObserver {
  private readonly agents = new Map<string, TrackedSubagent>();
  private chain: Promise<void> = Promise.resolve();
  private readonly emitter: ClaudeSubagentObserverEmitter;
  private readonly now: () => string;
  private readonly onScanError?: (error: unknown) => void;
  private readonly parentCursor = createJsonlTailCursor();
  private parentProviderSessionId: string;
  // Located lazily: the CLI derives the slug directory from its cwd, and the
  // transcript only exists once the first turn streams.
  private parentTranscriptPath: string | null = null;
  // Terminal results read from the parent transcript stay pended until their
  // emit succeeds: the parent cursor has already advanced past them, so a
  // throwing listener must not lose them.
  private readonly pendingTerminals = new Map<
    string,
    ClaudeSubagentToolUseResult
  >();
  private readonly pollIntervalMs: number;
  private pollTimer: NodeJS.Timeout | null = null;
  private polling = false;
  private readonly projectsDir: string;

  constructor(options: ClaudeSubagentObserverOptions) {
    this.emitter = options.emitter;
    this.now = options.now ?? (() => new Date().toISOString());
    this.onScanError = options.onScanError;
    this.parentProviderSessionId = options.parentProviderSessionId;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.projectsDir = options.projectsDir;
  }

  // A resumed Claude CLI session keeps appending to a new transcript file;
  // retarget paths but keep replay state so agents are not re-announced.
  updateParentSession(parentProviderSessionId: string): void {
    if (this.parentProviderSessionId === parentProviderSessionId) {
      return;
    }
    this.parentProviderSessionId = parentProviderSessionId;
    this.parentTranscriptPath = null;
    this.parentCursor.offset = 0;
  }

  // Full replay of already-existing subagent files. Runs with no active
  // turn, so agents without a recorded terminal status are interrupted.
  hydrate(): Promise<void> {
    return this.enqueue(() => this.scanOnce("interrupted"));
  }

  startTurnPolling(): void {
    this.polling = true;
    if (this.pollTimer) {
      return;
    }
    this.scheduleNextPoll();
  }

  // Final scan so a turn's last file writes are never dropped.
  stopTurnPolling(): Promise<void> {
    this.polling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    return this.enqueue(() => this.scanOnce("running"));
  }

  private enqueue(step: () => Promise<void>): Promise<void> {
    const next = this.chain.then(step, step);
    this.chain = next.catch(() => undefined);
    return next;
  }

  private scheduleNextPoll(): void {
    if (!this.polling) {
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      this.enqueue(() => this.scanOnce("running"))
        .catch((error: unknown) => {
          this.onScanError?.(error);
        })
        .finally(() => {
          this.scheduleNextPoll();
        });
    }, this.pollIntervalMs);
  }

  private async scanOnce(
    statusWithoutTerminal: "interrupted" | "running"
  ): Promise<void> {
    const parentTranscriptPath = await this.locateParentTranscript();
    if (!parentTranscriptPath) {
      return;
    }
    const subagentsDir = resolveSubagentsDir(parentTranscriptPath);
    const discoveries = await scanSubagentsDirectory(subagentsDir);
    for (const discovery of discoveries) {
      if (!this.agents.has(discovery.meta.agentId)) {
        this.agents.set(discovery.meta.agentId, {
          cursor: createJsonlTailCursor(),
          lastTokenUsage: null,
          meta: discovery.meta,
          model: null,
          spawnEmitted: false,
          terminalEmitted: false,
          transcriptPath: discovery.transcriptPath,
        });
      }
    }
    for (const [agentId, result] of await this.readParentTerminalResults()) {
      this.pendingTerminals.set(agentId, result);
    }
    for (const agent of this.agents.values()) {
      try {
        await this.replayAgent(
          agent,
          this.pendingTerminals.has(agent.meta.agentId) ||
            agent.terminalEmitted,
          statusWithoutTerminal
        );
      } catch (error) {
        this.onScanError?.(error);
      }
    }
    for (const [agentId, result] of this.pendingTerminals) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        continue;
      }
      if (agent.terminalEmitted) {
        this.pendingTerminals.delete(agentId);
        continue;
      }
      try {
        // Core accepts subagent_status only on the CHILD session channel
        // (the parent channel silently drops it), matching how Codex thread
        // statuses arrive through the child subscription.
        this.emitter.emitToChild(
          toClaudeChildProviderSessionId(agentId),
          buildClaudeSubagentTerminalStatusEvent(result, this.now())
        );
        agent.terminalEmitted = true;
        this.pendingTerminals.delete(agentId);
      } catch (error) {
        this.onScanError?.(error);
      }
    }
  }

  private async replayAgent(
    agent: TrackedSubagent,
    hasTerminal: boolean,
    statusWithoutTerminal: "interrupted" | "running"
  ): Promise<void> {
    if (agent.terminalEmitted && agent.spawnEmitted) {
      return;
    }
    const records = await readJsonlRecordsFrom(
      agent.transcriptPath,
      agent.cursor
    );
    const model = agent.model ?? findFirstModel(records);
    const firstTimestamp = findFirstTimestamp(records);
    if (!agent.spawnEmitted) {
      agent.spawnEmitted = true;
      agent.model = model;
      const spawn = buildClaudeSubagentSpawnEvents({
        meta: agent.meta,
        ...(model ? { model } : {}),
        parentProviderSessionId: this.parentProviderSessionId,
        status: hasTerminal ? "running" : statusWithoutTerminal,
        timestamp: firstTimestamp ?? this.now(),
      });
      this.emitter.emitToParent(spawn.control);
      this.emitter.emitToParent(spawn.session);
    } else if (model && !agent.model) {
      // The model becomes known from the first transcript record; re-announce
      // the idempotent spawn so the Core call card picks it up.
      agent.model = model;
      const spawn = buildClaudeSubagentSpawnEvents({
        meta: agent.meta,
        model,
        parentProviderSessionId: this.parentProviderSessionId,
        status: hasTerminal ? "running" : statusWithoutTerminal,
        timestamp: firstTimestamp ?? this.now(),
      });
      this.emitter.emitToParent(spawn.control);
    }
    const childId = toClaudeChildProviderSessionId(agent.meta.agentId);
    const fallbackTimestamp = this.now();
    let latestTokenUsage: ClaudeSubagentTokenUsage | null = null;
    for (const record of records) {
      for (const message of normalizeClaudeSubagentTranscriptRecord(
        record,
        fallbackTimestamp
      )) {
        this.emitter.emitToChild(childId, message);
      }
      const tokenUsage = extractClaudeSubagentTokenUsage(record);
      if (tokenUsage) {
        latestTokenUsage = tokenUsage;
      }
    }
    this.emitTokenUsage(agent, childId, latestTokenUsage, fallbackTimestamp);
  }

  // Codex subagent parity: each new last-call usage read from the agent
  // JSONL reaches the child session as the same token_usage stream event the
  // primary channel emits; limit stays 0 (the JSONL never reports a context
  // window), so the telemetry facade keeps its default.
  private emitTokenUsage(
    agent: TrackedSubagent,
    childId: string,
    latestTokenUsage: ClaudeSubagentTokenUsage | null,
    timestamp: string
  ): void {
    if (
      !latestTokenUsage ||
      (agent.lastTokenUsage &&
        agent.lastTokenUsage.used === latestTokenUsage.used &&
        agent.lastTokenUsage.cached === latestTokenUsage.cached)
    ) {
      return;
    }
    agent.lastTokenUsage = latestTokenUsage;
    this.emitter.emitToChild(childId, {
      type: "stream_event",
      claudeSessionId: childId,
      tokenUsage: {
        cached: latestTokenUsage.cached,
        limit: 0,
        used: latestTokenUsage.used,
      },
      data: {
        kind: "token_usage",
        used: latestTokenUsage.used,
        limit: 0,
        cached: latestTokenUsage.cached,
      },
      uuid: `${crypto.randomUUID()}::token_usage`,
      timestamp,
    });
  }

  private async locateParentTranscript(): Promise<string | null> {
    if (!this.parentTranscriptPath) {
      this.parentTranscriptPath = await findParentTranscriptPath(
        this.projectsDir,
        this.parentProviderSessionId
      );
    }
    return this.parentTranscriptPath;
  }

  private async readParentTerminalResults() {
    if (!this.parentTranscriptPath) {
      return new Map<
        string,
        NonNullable<ReturnType<typeof extractSubagentToolUseResult>>
      >();
    }
    const records = await readJsonlRecordsFrom(
      this.parentTranscriptPath,
      this.parentCursor
    );
    const results = new Map<
      string,
      NonNullable<ReturnType<typeof extractSubagentToolUseResult>>
    >();
    for (const record of records) {
      const result = extractSubagentToolUseResult(record);
      if (result) {
        results.set(result.agentId, result);
      }
    }
    return results;
  }
}

const findFirstModel = (records: readonly unknown[]): string | null => {
  for (const record of records) {
    const model = extractClaudeSubagentModel(record);
    if (model) {
      return model;
    }
  }
  return null;
};

const findFirstTimestamp = (records: readonly unknown[]): string | null => {
  for (const record of records) {
    if (
      typeof record === "object" &&
      record !== null &&
      typeof (record as { timestamp?: unknown }).timestamp === "string"
    ) {
      return (record as { timestamp: string }).timestamp;
    }
  }
  return null;
};
