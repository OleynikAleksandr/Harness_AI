import path from "node:path";
import type { ProviderSubagentEvent } from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildClaudeSubagentSpawnEvents,
  buildClaudeSubagentTerminalStatusEvent,
  extractClaudeSubagentModel,
  normalizeClaudeSubagentTranscriptRecord,
  toClaudeChildProviderSessionId,
} from "./claude-subagent-event-normalizer.js";
import {
  type ClaudeSubagentMeta,
  createJsonlTailCursor,
  extractSubagentToolUseResult,
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
  readonly parentProviderSessionId: string;
  readonly parentTranscriptPath: string;
  readonly pollIntervalMs?: number;
}

interface TrackedSubagent {
  readonly cursor: JsonlTailCursor;
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
  private readonly parentCursor = createJsonlTailCursor();
  private parentProviderSessionId: string;
  private parentTranscriptPath: string;
  private readonly pollIntervalMs: number;
  private pollTimer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(options: ClaudeSubagentObserverOptions) {
    this.emitter = options.emitter;
    this.now = options.now ?? (() => new Date().toISOString());
    this.parentProviderSessionId = options.parentProviderSessionId;
    this.parentTranscriptPath = options.parentTranscriptPath;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  // A resumed Claude CLI session keeps appending to a new transcript file;
  // retarget paths but keep replay state so agents are not re-announced.
  updateParentSession(
    parentProviderSessionId: string,
    parentTranscriptPath: string
  ): void {
    if (this.parentProviderSessionId === parentProviderSessionId) {
      return;
    }
    this.parentProviderSessionId = parentProviderSessionId;
    this.parentTranscriptPath = parentTranscriptPath;
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
      this.enqueue(() => this.scanOnce("running")).finally(() => {
        this.scheduleNextPoll();
      });
    }, this.pollIntervalMs);
  }

  private async scanOnce(
    statusWithoutTerminal: "interrupted" | "running"
  ): Promise<void> {
    const subagentsDir = resolveSubagentsDir(this.parentTranscriptPath);
    const discoveries = await scanSubagentsDirectory(subagentsDir);
    for (const discovery of discoveries) {
      if (!this.agents.has(discovery.meta.agentId)) {
        this.agents.set(discovery.meta.agentId, {
          cursor: createJsonlTailCursor(),
          meta: discovery.meta,
          model: null,
          spawnEmitted: false,
          terminalEmitted: false,
          transcriptPath: discovery.transcriptPath,
        });
      }
    }
    const terminalResults = await this.readParentTerminalResults();
    for (const agent of this.agents.values()) {
      await this.replayAgent(
        agent,
        terminalResults.has(agent.meta.agentId),
        statusWithoutTerminal
      );
    }
    for (const [agentId, result] of terminalResults) {
      const agent = this.agents.get(agentId);
      if (!agent || agent.terminalEmitted) {
        continue;
      }
      agent.terminalEmitted = true;
      this.emitter.emitToParent(
        buildClaudeSubagentTerminalStatusEvent(result, this.now())
      );
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
    for (const record of records) {
      for (const message of normalizeClaudeSubagentTranscriptRecord(
        record,
        fallbackTimestamp
      )) {
        this.emitter.emitToChild(childId, message);
      }
    }
  }

  private async readParentTerminalResults() {
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

export const resolveParentTranscriptPath = (
  projectDir: string,
  parentProviderSessionId: string
): string => path.join(projectDir, `${parentProviderSessionId}.jsonl`);

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
