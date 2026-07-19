import { randomUUID } from "node:crypto";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import {
  isKimiAcpRecord,
  type KimiAcpNotification,
  type KimiAcpReverseRequestHandler,
} from "./kimi-acp-session-contracts.js";
import {
  KimiAcpSessionProcess,
  type KimiAcpSessionProcessExit,
  type KimiAcpSessionProcessOptions,
} from "./kimi-acp-session-process.js";
import {
  type KimiNativeSessionEvent,
  KimiSessionEventNormalizer,
} from "./kimi-session-event-normalizer.js";
import {
  type KimiSessionTokenUsage,
  readKimiSessionTokenUsage,
} from "./kimi-session-usage-reader.js";
import type { KimiLiveSwarmAgent } from "./kimi-subagent-normalizer.js";
import { KimiSubagentWireChannelHub } from "./kimi-subagent-wire-channel.js";
import { readKimiSwarmAgents } from "./kimi-swarm-progress-reader.js";
import {
  type KimiWorkspaceHome,
  prepareKimiWorkspaceHome,
  readKimiThinkingEffort,
  recordKimiSessionMapping,
  writeKimiThinkingEffort,
} from "./kimi-workspace-home.js";

export interface KimiNativeSessionRuntimeOptions {
  // Test/DI override for the workspace provider-home bootstrap.
  readonly homePreparer?: (
    workspacePath: string,
    overrides?: {
      readonly modelContexts?: Readonly<Record<string, number>>;
    }
  ) => KimiWorkspaceHome;
  readonly model?: string;
  // Per-model native context windows (merged Core + live Coding Plan
  // catalog): the workspace-home bootstrap writes them into config truth
  // and the per-turn usage limit resolves through them.
  readonly modelContexts?: Readonly<Record<string, number>>;
  readonly onEvent: (event: KimiNativeSessionEvent) => void;
  readonly onReverseRequest?: KimiAcpReverseRequestHandler;
  // Test/DI overrides for the supervised child (command, args, timeouts).
  readonly processOverrides?: Partial<KimiAcpSessionProcessOptions>;
  // The Core-visible provider session id; parents synthesized subagents.
  readonly providerSessionId?: string;
  // Test/DI override for the session-store swarm-agent reader.
  readonly swarmAgentReader?: (
    acpSessionId: string
  ) => readonly KimiLiveSwarmAgent[];
  // Test/DI override for the live-swarm poll cadence.
  readonly swarmPollIntervalMs?: number;
  // Test/DI override for the session-store usage reader.
  readonly usageReader?: (acpSessionId: string) => KimiSessionTokenUsage | null;
  readonly workspacePath: string;
}

const HANDSHAKE_TIMEOUT_MS = 30_000;
// A native turn can legitimately run for many minutes of agentic work; the
// prompt request must not fall into the default wire timeout.
const PROMPT_TIMEOUT_MS = 30 * 60_000;
// The ACP stream is silent while a swarm executes; live progress comes from
// polling the CLI session store at this cadence.
const SWARM_POLL_INTERVAL_MS = 2000;

// One immutable binding: one runtime = one `kimi acp` child = one native CLI
// session with the default agent and the user's real provider home. The
// model is selected once at open (`session/set_config_option`); the native
// system prompt and tool inventory stay untouched — that is the point of the
// native profile path.
export class KimiNativeSessionRuntime {
  private acpSessionId: string | null = null;
  private appliedModel: string | null = null;
  private appliedThinkingEffort: string | null = null;
  private everPrompted = false;
  private reportedThinkingEffort: string | null = null;
  private readonly channel: KimiAcpSessionProcess;
  private readonly normalizer = new KimiSessionEventNormalizer();
  private readonly options: KimiNativeSessionRuntimeOptions;
  private readonly subagentChannels: KimiSubagentWireChannelHub;
  private swarmPollTimer: NodeJS.Timeout | null = null;
  private turnActive = false;
  private readonly workspaceHome: KimiWorkspaceHome;

  constructor(options: KimiNativeSessionRuntimeOptions) {
    this.options = options;
    if (options.providerSessionId) {
      this.normalizer.bindParentSession(options.providerSessionId);
    }
    // Claude/Codex parity: the child runs with HOME inside the workspace so
    // the native session store lands there; auth links to the real home.
    this.workspaceHome = (options.homePreparer ?? prepareKimiWorkspaceHome)(
      options.workspacePath,
      options.modelContexts ? { modelContexts: options.modelContexts } : {}
    );
    this.appliedThinkingEffort = readKimiThinkingEffort(this.workspaceHome);
    this.subagentChannels = new KimiSubagentWireChannelHub({
      readAcpSessionId: () => this.acpSessionId,
      sessionsRoot: this.workspaceHome.sessionsRoot,
    });
    this.channel = new KimiAcpSessionProcess({
      cwd: options.workspacePath,
      environment: { HOME: this.workspaceHome.homePath },
      onExit: (exit) => this.handleExit(exit),
      onNotification: (notification) => this.handleNotification(notification),
      onProtocolError: (error) =>
        this.emit(streamDiagnostic("kimi_protocol_error", error.message)),
      ...(options.onReverseRequest
        ? { onReverseRequest: options.onReverseRequest }
        : {}),
      ...options.processOverrides,
    });
  }

  get isOpen(): boolean {
    return this.acpSessionId !== null && this.channel.isRunning;
  }

  async open(): Promise<string> {
    if (this.acpSessionId) {
      return this.acpSessionId;
    }
    await this.channel.request(
      "initialize",
      {
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
        },
        clientInfo: { name: "harness-ai", version: "0.0.1" },
        protocolVersion: 1,
      },
      { timeoutMs: HANDSHAKE_TIMEOUT_MS }
    );
    const created = await this.channel.request<Record<string, unknown>>(
      "session/new",
      { cwd: this.options.workspacePath, mcpServers: [] },
      { timeoutMs: HANDSHAKE_TIMEOUT_MS }
    );
    const sessionId =
      isKimiAcpRecord(created) && typeof created.sessionId === "string"
        ? created.sessionId
        : null;
    if (!sessionId) {
      throw new Error("Kimi ACP session/new returned no sessionId");
    }
    this.acpSessionId = sessionId;
    if (this.options.providerSessionId) {
      // Deletion after a Core restart resolves the CLI store id from this
      // persisted pair (the ids are minted by different owners).
      recordKimiSessionMapping(
        this.workspaceHome,
        this.options.providerSessionId,
        sessionId
      );
    }
    if (this.options.model) {
      await this.applyModel(this.options.model);
    }
    await this.requestFullAccess(sessionId);
    await this.requestThinking(sessionId);
    return sessionId;
  }

  // The thinking LEVEL is read by the CLI once at process start
  // (`[thinking].effort` in the workspace-home config) and the driver opens
  // the CLI eagerly at createSession — so before the FIRST prompt a
  // differing level relaunches the still-empty child (no history yet) with
  // the level written; after the first real turn the level is fixed for the
  // session lifetime and a differing (or unsupported) level surfaces one
  // honest diagnostic per distinct value.
  private async applyThinkingEffort(reasoningEffort?: string): Promise<void> {
    if (!reasoningEffort || reasoningEffort === this.appliedThinkingEffort) {
      return;
    }
    if (this.everPrompted) {
      if (this.reportedThinkingEffort !== reasoningEffort) {
        this.reportedThinkingEffort = reasoningEffort;
        this.emit(
          streamDiagnostic(
            "kimi_thinking_effort_locked",
            `The thinking effort is fixed at CLI start; "${reasoningEffort}" applies to the next new session.`
          )
        );
      }
      return;
    }
    if (this.acpSessionId) {
      // Eagerly opened at create: the config was already read. The session
      // has no history yet, so a clean relaunch applies the level.
      await this.close();
    }
    if (writeKimiThinkingEffort(this.workspaceHome, reasoningEffort)) {
      this.appliedThinkingEffort = reasoningEffort;
      return;
    }
    if (this.reportedThinkingEffort !== reasoningEffort) {
      this.reportedThinkingEffort = reasoningEffort;
      this.emit(
        streamDiagnostic(
          "kimi_thinking_effort_unsupported",
          `Thinking effort "${reasoningEffort}" is not supported; keeping the configured level.`
        )
      );
    }
  }

  // Full access (user order 2026-07-17): native sessions run without
  // tool-permission cards. CLI 0.26.0 accepts
  // `{configId: "mode", value: "yolo"}` (verified live — a Bash-using turn
  // then triggers zero `session/request_permission`). A future CLI refusing
  // the option keeps the session alive with one honest diagnostic, and the
  // fail-closed interaction bridge still answers whatever the CLI asks.
  private async requestFullAccess(sessionId: string): Promise<void> {
    await this.channel
      .request("session/set_config_option", {
        configId: "mode",
        sessionId,
        value: "yolo",
      })
      .catch((error: Error) => {
        this.emit(
          streamDiagnostic("kimi_full_access_unavailable", error.message)
        );
      });
  }

  // Thinking activation. When the workspace-home config owns thinking (the
  // bootstrap wrote a `[thinking]` section — `appliedThinkingEffort` seeded
  // from it), the session already starts ON at the configured level and the
  // ACP `thinking=on` option must NOT be sent: it would override the level
  // with the CLI's default `high` (verified live 2026-07-18: config `max` +
  // `set_config_option {thinking,"on"}` => wire `thinkingEffort: high`).
  // Only a home without a config section falls back to the best-effort
  // request; a refusal surfaces one honest diagnostic and keeps the session.
  private async requestThinking(sessionId: string): Promise<void> {
    if (this.appliedThinkingEffort) {
      return;
    }
    await this.channel
      .request("session/set_config_option", {
        configId: "thinking",
        sessionId,
        value: "on",
      })
      .catch((error: Error) => {
        this.emit(streamDiagnostic("kimi_thinking_unavailable", error.message));
      });
  }

  async prompt(
    text: string,
    model?: string,
    reasoningEffort?: string
  ): Promise<void> {
    await this.applyThinkingEffort(reasoningEffort);
    const sessionId = await this.open();
    this.everPrompted = true;
    if (model) {
      // The Core session model arrives with the turn; select it before the
      // prompt when it differs from what the CLI session already applied.
      await this.applyModel(model);
    }
    this.turnActive = true;
    this.emit(lifecycleEvent("turn_started"));
    this.startSwarmPolling(sessionId);
    try {
      const result = await this.channel.request<Record<string, unknown>>(
        "session/prompt",
        { prompt: [{ text, type: "text" }], sessionId },
        { timeoutMs: PROMPT_TIMEOUT_MS }
      );
      for (const event of this.normalizer.flushTurnEnd()) {
        this.emit(event);
      }
      this.emitTurnTokenUsage(sessionId);
      const stopReason =
        isKimiAcpRecord(result) && typeof result.stopReason === "string"
          ? result.stopReason
          : null;
      this.emit(lifecycleEvent("turn_completed", stopReason ?? undefined));
    } catch (error) {
      for (const event of this.normalizer.flushTurnEnd()) {
        this.emit(event);
      }
      this.emitTurnTokenUsage(sessionId);
      this.emit(
        lifecycleEvent(
          "turn_failed",
          error instanceof Error ? error.message : String(error)
        )
      );
    } finally {
      this.stopSwarmPolling();
      this.turnActive = false;
    }
  }

  // Synthesized-child wire channel entry points the driver routes to.
  ownsSubagent(providerSessionId: string): boolean {
    return this.normalizer.ownsSubagent(providerSessionId);
  }
  subscribeSubagent(
    providerSessionId: string,
    listener: (event: unknown) => void
  ): () => void {
    return this.subagentChannels.subscribe(providerSessionId, listener);
  }

  // Live swarm progress: while a turn runs, poll the CLI session store for
  // spawned swarm agents (the ACP stream is silent during swarm execution).
  // Attribution needs exactly one running swarm — the store's agent homes
  // carry no tool-call linkage, so parallel swarms fall back to the terminal
  // swarm result.
  private startSwarmPolling(acpSessionId: string): void {
    if (this.swarmPollTimer) {
      return;
    }
    this.swarmPollTimer = setInterval(
      () => this.pollSwarmAgents(acpSessionId),
      this.options.swarmPollIntervalMs ?? SWARM_POLL_INTERVAL_MS
    );
    this.swarmPollTimer.unref?.();
  }

  private stopSwarmPolling(): void {
    if (this.swarmPollTimer) {
      clearInterval(this.swarmPollTimer);
      this.swarmPollTimer = null;
    }
    this.subagentChannels.finishTurn();
  }

  private pollSwarmAgents(acpSessionId: string): void {
    this.subagentChannels.pump();
    const callIds = this.normalizer.liveSwarmCallIds();
    if (callIds.length !== 1) {
      return;
    }
    const agents = this.options.swarmAgentReader
      ? this.options.swarmAgentReader(acpSessionId)
      : readKimiSwarmAgents(acpSessionId, {
          sessionsRoot: this.workspaceHome.sessionsRoot,
        });
    for (const event of this.normalizer.registerLiveSwarmAgents(
      callIds[0],
      agents
    )) {
      this.emit(event);
    }
  }

  // The session model's native window from the merged catalog: the applied
  // model wins, the start model covers the pre-apply window, unknown ids
  // fall back to the reader's verified K2.7 default.
  private resolveContextLimit(): number | null {
    const model = this.appliedModel ?? this.options.model ?? null;
    const limit = model ? this.options.modelContexts?.[model] : undefined;
    return typeof limit === "number" && limit > 0 ? limit : null;
  }

  // The CLI streams no usage_update; after every turn the session-store
  // truth (latest usage.record of the main agent) feeds the status panel.
  private emitTurnTokenUsage(acpSessionId: string): void {
    const contextLimit = this.resolveContextLimit();
    const usage = this.options.usageReader
      ? this.options.usageReader(acpSessionId)
      : readKimiSessionTokenUsage(acpSessionId, {
          ...(contextLimit === null ? {} : { limit: contextLimit }),
          sessionsRoot: this.workspaceHome.sessionsRoot,
        });
    if (!usage) {
      return;
    }
    this.emit({
      data: { kind: "token_usage", tokenUsage: usage },
      timestamp: nowIso(),
      type: "stream_event",
      uuid: `${randomUUID()}::token_usage`,
    });
  }

  // Stop semantics: cancel the in-flight turn but keep the CLI session
  // alive so the next message continues the same native conversation.
  async cancelTurn(): Promise<void> {
    if (!(this.acpSessionId && this.turnActive)) {
      return;
    }
    await this.channel
      .notify("session/cancel", { sessionId: this.acpSessionId })
      .catch(() => undefined);
  }

  async close(): Promise<void> {
    this.stopSwarmPolling();
    this.acpSessionId = null;
    // A relaunched child starts a fresh CLI session: the model must be
    // re-applied there (proven live: a kept appliedModel silently left the
    // relaunch on the default model).
    this.appliedModel = null;
    await this.channel.stop();
  }

  // Model selection is the only config the Kimi ACP surface accepts; a
  // refusal must not kill the native session. The requested value is
  // remembered either way so a rejecting CLI is not re-asked every turn.
  private async applyModel(model: string): Promise<void> {
    if (!this.acpSessionId || model === this.appliedModel) {
      return;
    }
    this.appliedModel = model;
    await this.channel
      .request("session/set_config_option", {
        configId: "model",
        sessionId: this.acpSessionId,
        value: model,
      })
      .catch((error: Error) => {
        this.emit(
          streamDiagnostic("kimi_model_selection_failed", error.message)
        );
      });
  }

  private handleNotification(notification: KimiAcpNotification): void {
    if (!this.matchesSession(notification)) {
      return;
    }
    for (const event of this.normalizer.normalizeNotification(notification)) {
      this.emit(event);
    }
  }

  private matchesSession(notification: KimiAcpNotification): boolean {
    if (!isKimiAcpRecord(notification.params)) {
      return true;
    }
    const sessionId = notification.params.sessionId;
    return (
      typeof sessionId !== "string" ||
      this.acpSessionId === null ||
      sessionId === this.acpSessionId
    );
  }

  private handleExit(exit: KimiAcpSessionProcessExit): void {
    this.acpSessionId = null;
    if (exit.expected) {
      return;
    }
    this.emit({
      message: `Kimi CLI exited unexpectedly (${
        exit.code === null
          ? `signal ${exit.signal ?? "unknown"}`
          : `code ${exit.code}`
      }).`,
      timestamp: nowIso(),
      type: "stream_error",
      uuid: randomUUID(),
    });
  }

  private emit(event: KimiNativeSessionEvent): void {
    this.subagentChannels.observeEvent(event);
    this.options.onEvent(event);
  }
}

function lifecycleEvent(
  type: "turn_completed" | "turn_failed" | "turn_started",
  message?: string
): NormalizedProviderEvent {
  return {
    ...(message ? { message } : {}),
    timestamp: nowIso(),
    type,
    uuid: randomUUID(),
  };
}

function streamDiagnostic(
  kind: string,
  message: string
): NormalizedProviderEvent {
  return {
    data: { kind, message },
    timestamp: nowIso(),
    type: "stream_event",
    uuid: `${randomUUID()}::${kind}`,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}
