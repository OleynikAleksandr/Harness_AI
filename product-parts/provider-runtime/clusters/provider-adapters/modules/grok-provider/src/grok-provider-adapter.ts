import crypto from "node:crypto";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderInteractionDecision,
  ProviderRollbackResult,
  ProviderSessionStartOptions,
  ProviderSessionStartOutcome,
  ProviderTurnOptions,
  ProviderUsageLimitsRefreshRequest,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type {
  GrokAcpNotification,
  GrokAcpRequest,
} from "./grok-acp-contracts.js";
import {
  GrokAcpProcess,
  type GrokAcpProcessExit,
  type GrokAcpProcessReporter,
} from "./grok-acp-process.js";
import { GrokBillingClient } from "./grok-billing-client.js";
import {
  type GrokCliLocationOptions,
  type GrokCliProbe,
  probeGrokCli,
} from "./grok-cli-locator.js";
import { GrokEventNormalizer } from "./grok-event-normalizer.js";
import { GrokInteractionBridge } from "./grok-interaction-bridge.js";
import {
  buildGrokProfileApplication,
  type GrokProfileApplication,
  resolveGrokSessionProfileState,
  verifyGrokProfileApplication,
} from "./grok-profile-application.js";
import { GrokRewindClient } from "./grok-rewind-client.js";
import { GrokSessionEventRouter } from "./grok-session-event-router.js";
import {
  GrokSessionRuntime,
  type GrokSessionTransport,
  normalizeGrokTurnSelection,
} from "./grok-session-runtime.js";
import {
  GrokSubagentNormalizer,
  readGrokNotificationSessionId,
} from "./grok-subagent-normalizer.js";

export interface GrokProcessFactoryOptions {
  readonly cwd: string;
  readonly onExit: (exit: GrokAcpProcessExit) => void;
  readonly onNotification: (notification: GrokAcpNotification) => void;
  readonly onReverseRequest: (request: GrokAcpRequest) => Promise<unknown>;
}

export interface GrokProviderAdapterOptions extends GrokCliLocationOptions {
  readonly clientVersion?: string;
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: string;
  readonly interactionTimeoutMs?: number;
  readonly mcpServers?: readonly Readonly<Record<string, unknown>>[];
  readonly processFactory?: (
    options: GrokProcessFactoryOptions
  ) => GrokSessionTransport;
  readonly readinessProbe?: () => Promise<GrokCliProbe>;
  readonly reporter?: GrokAcpProcessReporter;
  readonly workspacePath?: string;
}

const GROK_SESSION_PREFIX_PATTERN = /^grok:/u;

interface GrokAdapterSession {
  readonly application: GrokProfileApplication;
  readonly eventNormalizer: GrokEventNormalizer;
  readonly eventRouter: GrokSessionEventRouter;
  readonly interactionBridge: GrokInteractionBridge;
  providerSessionId: string | null;
  readonly runtime: GrokSessionRuntime;
  readonly subagentNormalizer: GrokSubagentNormalizer;
  readonly transport: GrokSessionTransport;
  turnRunning: boolean;
}

export class GrokProviderAdapter implements ProviderAdapter {
  readonly #options: GrokProviderAdapterOptions;
  readonly #sessions = new Map<string, GrokAdapterSession>();
  readonly #subagentSessions = new Map<string, GrokAdapterSession>();
  #binaryPath: string | null = null;
  #initialized = false;

  constructor(options: GrokProviderAdapterOptions = {}) {
    this.#options = options;
  }

  async initialize(): Promise<void> {
    if (this.#initialized) {
      return;
    }
    const probe = await (this.#options.readinessProbe?.() ??
      probeGrokCli(this.#options));
    if (probe.status !== "ready" || !probe.binaryPath) {
      throw new Error(probe.message);
    }
    this.#binaryPath = probe.binaryPath;
    this.#initialized = true;
  }

  async createSession(
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    this.#assertInitialized();
    const profileState = resolveGrokSessionProfileState(startOptions);
    const application = buildGrokProfileApplication(profileState);
    const entry = this.#createEntry(
      (workspacePath ?? this.#options.workspacePath)?.trim() || process.cwd(),
      application
    );
    try {
      const started = await entry.runtime.create();
      return await this.#completeBinding(
        entry,
        started.providerSessionId,
        Boolean(profileState)
      );
    } catch (error) {
      await entry.runtime.close().catch(() => undefined);
      throw error;
    }
  }

  async resumeSession(
    providerSessionId: string,
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    this.#assertInitialized();
    const normalizedProviderSessionId =
      normalizeProviderSessionId(providerSessionId);
    if (this.#subagentSessions.has(normalizedProviderSessionId)) {
      return normalizedProviderSessionId;
    }
    const profileState = resolveGrokSessionProfileState(startOptions);
    const application = buildGrokProfileApplication(profileState);
    const entry = this.#createEntry(
      (workspacePath ?? this.#options.workspacePath)?.trim() || process.cwd(),
      application
    );
    try {
      const started = await entry.runtime.load(providerSessionId);
      return await this.#completeBinding(
        entry,
        started.providerSessionId,
        Boolean(profileState)
      );
    } catch (error) {
      await entry.runtime.close().catch(() => undefined);
      throw error;
    }
  }

  subscribe(
    providerSessionId: string,
    listener: ProviderEventListener
  ): () => void {
    const entry = this.#requireSession(providerSessionId);
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    return entry.eventRouter.subscribe(normalizedId, listener);
  }

  async sendMessage(
    providerSessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void> {
    const entry = this.#requireSession(providerSessionId);
    if (entry.turnRunning) {
      throw new Error(
        `Grok session ${providerSessionId} already has an active turn.`
      );
    }
    entry.turnRunning = true;
    this.#dispatch(
      entry,
      entry.eventNormalizer.turnStarted(providerSessionId),
      providerSessionId
    );
    try {
      const result = await entry.runtime.prompt(
        content,
        normalizeGrokTurnSelection(turnOptions)
      );
      this.#dispatch(
        entry,
        entry.eventNormalizer.normalizePromptResult(providerSessionId, result),
        providerSessionId
      );
    } catch (error) {
      this.#dispatch(
        entry,
        entry.eventNormalizer.normalizePromptFailure(providerSessionId, error),
        providerSessionId
      );
      throw error;
    } finally {
      entry.turnRunning = false;
    }
  }

  async closeSession(providerSessionId: string): Promise<void> {
    const entry = this.#requireSession(providerSessionId);
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    if (this.#subagentSessions.has(normalizedId)) {
      this.#subagentSessions.delete(normalizedId);
      entry.eventRouter.clearSession(normalizedId);
      return;
    }
    if (entry.turnRunning) {
      await entry.runtime.cancel().catch(() => undefined);
    }
    this.#sessions.delete(normalizedId);
    for (const [childSessionId, childEntry] of this.#subagentSessions) {
      if (childEntry === entry) {
        this.#subagentSessions.delete(childSessionId);
      }
    }
    entry.eventRouter.clearAll();
    entry.interactionBridge.cancelAll();
    await entry.runtime.close();
  }

  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const entry = this.#requireSession(request.providerSessionId);
    const snapshot = await new GrokBillingClient({
      transport: entry.transport,
    }).read();
    request.broadcast({
      provider: "grok",
      providerScopeKey: snapshot.providerScopeKey,
      type: "usage_limits",
      usageLimitLabels: {
        currentSession: snapshot.subscriptionTier ?? "Subscription",
        currentWeekAllModels: "Weekly",
      },
      usageLimits: {
        currentSession: null,
        currentWeekAllModels: {
          percentUsed: snapshot.usagePercent,
          resetsAt: snapshot.resetAt,
        },
      },
    });
  }

  async rollbackSessionTurns(
    providerSessionId: string,
    numTurns: number
  ): Promise<ProviderRollbackResult> {
    const entry = this.#requireSession(providerSessionId);
    return await new GrokRewindClient(entry.transport).rollbackTurns(
      normalizeProviderSessionId(providerSessionId),
      numTurns
    );
  }

  respondToInteraction(
    providerSessionId: string,
    decision: ProviderInteractionDecision
  ): Promise<void> {
    const entry = this.#requireSession(providerSessionId);
    entry.interactionBridge.respond(decision);
    return Promise.resolve();
  }

  #createEntry(
    workspacePath: string,
    application: GrokProfileApplication
  ): GrokAdapterSession {
    let entry: GrokAdapterSession;
    const callbacks: GrokProcessFactoryOptions = {
      cwd: workspacePath,
      onExit: (exit) => this.#handleExit(entry, exit),
      onNotification: (notification) =>
        this.#handleNotification(entry, notification),
      onReverseRequest: (request) => this.#handleReverseRequest(entry, request),
    };
    const transport = this.#options.processFactory
      ? this.#options.processFactory(callbacks)
      : new GrokAcpProcess({
          binaryPath: this.#requireBinaryPath(),
          cwd: workspacePath,
          onExit: callbacks.onExit,
          onNotification: callbacks.onNotification,
          onReverseRequest: callbacks.onReverseRequest,
          reporter: this.#options.reporter,
        });
    const interactionBridge = new GrokInteractionBridge({
      emit: (event) => this.#dispatch(entry, { ...event, provider: "grok" }),
      timeoutMs: this.#options.interactionTimeoutMs,
    });
    const runtime = new GrokSessionRuntime({
      clientVersion: this.#options.clientVersion,
      selection: {
        ...(this.#options.defaultModel
          ? { modelId: this.#options.defaultModel }
          : {}),
        ...(this.#options.defaultReasoningEffort
          ? { reasoningEffort: this.#options.defaultReasoningEffort }
          : {}),
      },
      mcpServers: this.#options.mcpServers,
      sessionMeta: application.sessionMeta,
      transport,
      workspacePath,
    });
    entry = {
      application,
      eventNormalizer: new GrokEventNormalizer(),
      eventRouter: new GrokSessionEventRouter(),
      interactionBridge,
      providerSessionId: null,
      runtime,
      subagentNormalizer: new GrokSubagentNormalizer(),
      transport,
      turnRunning: false,
    };
    return entry;
  }

  async #completeBinding(
    entry: GrokAdapterSession,
    providerSessionId: string,
    includeProfileDetails: boolean
  ): Promise<ProviderSessionStartOutcome> {
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    if (this.#sessions.has(normalizedId)) {
      throw new Error(
        `Grok provider session ${normalizedId} is already bound.`
      );
    }
    let appliedProfileApplication = entry.application.details;
    if (entry.application.verification) {
      const sessionInfo = await entry.transport.request("_x.ai/session/info", {
        sessionId: normalizedId,
      });
      appliedProfileApplication = verifyGrokProfileApplication(
        entry.application,
        sessionInfo
      );
    }
    entry.providerSessionId = normalizedId;
    this.#sessions.set(normalizedId, entry);
    entry.eventRouter.ensureSession(normalizedId);
    this.#recoverRunningSubagents(entry, normalizedId).catch(() => undefined);
    if (!includeProfileDetails) {
      return normalizedId;
    }
    return { appliedProfileApplication, providerSessionId: normalizedId };
  }

  #handleNotification(
    entry: GrokAdapterSession,
    notification: GrokAcpNotification
  ): void {
    const subagentEvents =
      entry.subagentNormalizer.normalizeNotification(notification);
    if (subagentEvents.length > 0) {
      for (const routed of subagentEvents) {
        if (routed.childProviderSessionId) {
          this.#registerSubagentSession(entry, routed.childProviderSessionId);
        }
        this.#dispatch(entry, routed.event, routed.targetProviderSessionId);
      }
      return;
    }
    const targetProviderSessionId =
      readGrokNotificationSessionId(notification) ?? entry.providerSessionId;
    const compatibleNotification =
      notification.method === "x.ai/session_notification"
        ? { ...notification, method: "_x.ai/session_notification" }
        : notification;
    for (const event of entry.eventNormalizer.normalizeNotification(
      compatibleNotification
    )) {
      this.#dispatch(entry, event, targetProviderSessionId);
    }
  }

  #handleExit(entry: GrokAdapterSession, exit: GrokAcpProcessExit): void {
    if (exit.expected) {
      return;
    }
    entry.turnRunning = false;
    entry.interactionBridge.cancelAll(
      "Grok ACP process exited while awaiting an interaction."
    );
    this.#dispatch(entry, {
      message: `Grok ACP process exited unexpectedly (${exit.code ?? exit.signal ?? "unknown"}).`,
      provider: "grok",
      timestamp: new Date().toISOString(),
      type: "stream_error",
      uuid: `${crypto.randomUUID()}::stream_error`,
    });
  }

  async #handleReverseRequest(
    entry: GrokAdapterSession,
    request: GrokAcpRequest
  ): Promise<unknown> {
    return await entry.interactionBridge.handle(request);
  }

  #dispatch(
    entry: GrokAdapterSession,
    event: unknown,
    targetProviderSessionId = entry.providerSessionId
  ): void {
    if (!targetProviderSessionId) {
      return;
    }
    entry.eventRouter.dispatch(targetProviderSessionId, event);
  }

  async #recoverRunningSubagents(
    entry: GrokAdapterSession,
    parentProviderSessionId: string
  ): Promise<void> {
    const response = await entry.transport.request(
      "_x.ai/subagent/list_running",
      {
        sessionId: parentProviderSessionId,
      }
    );
    for (const routed of entry.subagentNormalizer.normalizeRunningResponse(
      response,
      parentProviderSessionId
    )) {
      if (routed.childProviderSessionId) {
        this.#registerSubagentSession(entry, routed.childProviderSessionId);
      }
      this.#dispatch(entry, routed.event, routed.targetProviderSessionId);
    }
  }

  #registerSubagentSession(
    entry: GrokAdapterSession,
    providerSessionId: string
  ): void {
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    const existing = this.#subagentSessions.get(normalizedId);
    if (existing && existing !== entry) {
      throw new Error(
        `Grok subagent session ${normalizedId} is already bound.`
      );
    }
    this.#subagentSessions.set(normalizedId, entry);
    entry.eventRouter.ensureSession(normalizedId);
  }

  #requireSession(providerSessionId: string): GrokAdapterSession {
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    const entry =
      this.#sessions.get(normalizedId) ??
      this.#subagentSessions.get(normalizedId);
    if (!entry) {
      throw new Error(`Grok provider session is not bound: ${normalizedId}`);
    }
    return entry;
  }

  #assertInitialized(): void {
    if (!this.#initialized) {
      throw new Error("Grok provider adapter must be initialized before use.");
    }
  }

  #requireBinaryPath(): string {
    if (!this.#binaryPath) {
      throw new Error("Grok CLI binary path is unavailable.");
    }
    return this.#binaryPath;
  }
}

function normalizeProviderSessionId(value: string): string {
  const normalized = value.trim().replace(GROK_SESSION_PREFIX_PATTERN, "");
  if (!normalized) {
    throw new Error("Grok provider session id is empty.");
  }
  return normalized;
}
