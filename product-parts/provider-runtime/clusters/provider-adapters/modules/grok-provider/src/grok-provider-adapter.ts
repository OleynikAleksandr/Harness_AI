import crypto from "node:crypto";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderSessionStartOptions,
  ProviderSessionStartOutcome,
  ProviderTurnOptions,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type {
  GrokAcpNotification,
  GrokAcpRequest,
  GrokAcpSessionSelection,
  GrokProviderEvent,
} from "./grok-acp-contracts.js";
import {
  GrokAcpProcess,
  type GrokAcpProcessExit,
  type GrokAcpProcessReporter,
} from "./grok-acp-process.js";
import {
  type GrokCliLocationOptions,
  type GrokCliProbe,
  probeGrokCli,
} from "./grok-cli-locator.js";
import { GrokEventNormalizer } from "./grok-event-normalizer.js";
import {
  buildGrokProfileApplication,
  type GrokProfileApplication,
  resolveGrokSessionProfileState,
  verifyGrokProfileApplication,
} from "./grok-profile-application.js";
import {
  GrokSessionRuntime,
  type GrokSessionTransport,
} from "./grok-session-runtime.js";

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
  readonly processFactory?: (
    options: GrokProcessFactoryOptions
  ) => GrokSessionTransport;
  readonly readinessProbe?: () => Promise<GrokCliProbe>;
  readonly reporter?: GrokAcpProcessReporter;
  readonly reverseRequestHandler?: (
    request: GrokAcpRequest,
    providerSessionId: string | null
  ) => Promise<unknown>;
  readonly workspacePath?: string;
}

interface GrokAdapterSession {
  readonly application: GrokProfileApplication;
  readonly eventNormalizer: GrokEventNormalizer;
  readonly listeners: Set<ProviderEventListener>;
  readonly pendingEvents: GrokProviderEvent[];
  providerSessionId: string | null;
  readonly runtime: GrokSessionRuntime;
  readonly transport: GrokSessionTransport;
  turnRunning: boolean;
  readonly workspacePath: string;
}

const GROK_SESSION_PREFIX_PATTERN = /^grok:/u;

export class GrokProviderAdapter implements ProviderAdapter {
  readonly #options: GrokProviderAdapterOptions;
  readonly #sessions = new Map<string, GrokAdapterSession>();
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
      normalizeWorkspacePath(workspacePath ?? this.#options.workspacePath),
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
    const profileState = resolveGrokSessionProfileState(startOptions);
    const application = buildGrokProfileApplication(profileState);
    const entry = this.#createEntry(
      normalizeWorkspacePath(workspacePath ?? this.#options.workspacePath),
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
    entry.listeners.add(listener);
    for (const event of entry.pendingEvents.splice(0)) {
      this.#dispatch(entry, event);
    }
    return () => {
      entry.listeners.delete(listener);
    };
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
    this.#dispatch(entry, entry.eventNormalizer.turnStarted(providerSessionId));
    try {
      const result = await entry.runtime.prompt(
        content,
        readTurnSelection(turnOptions)
      );
      this.#dispatch(
        entry,
        entry.eventNormalizer.normalizePromptResult(providerSessionId, result)
      );
    } catch (error) {
      this.#dispatch(
        entry,
        entry.eventNormalizer.normalizePromptFailure(providerSessionId, error)
      );
      throw error;
    } finally {
      entry.turnRunning = false;
    }
  }

  async closeSession(providerSessionId: string): Promise<void> {
    const entry = this.#requireSession(providerSessionId);
    if (entry.turnRunning) {
      await entry.runtime.cancel().catch(() => undefined);
    }
    this.#sessions.delete(providerSessionId);
    entry.listeners.clear();
    entry.pendingEvents.length = 0;
    await entry.runtime.close();
  }

  deleteSessionArtifacts(
    providerSessionId: string,
    _workspacePath: string
  ): void {
    normalizeProviderSessionId(providerSessionId);
    this.#options.reporter?.info?.(
      "Grok session has no Harness-owned persistent artifacts to delete."
    );
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
      sessionMeta: application.sessionMeta,
      transport,
      workspacePath,
    });
    entry = {
      application,
      eventNormalizer: new GrokEventNormalizer(),
      listeners: new Set(),
      pendingEvents: [],
      providerSessionId: null,
      runtime,
      transport,
      turnRunning: false,
      workspacePath,
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
    if (!includeProfileDetails) {
      return normalizedId;
    }
    return { appliedProfileApplication, providerSessionId: normalizedId };
  }

  #handleNotification(
    entry: GrokAdapterSession,
    notification: GrokAcpNotification
  ): void {
    for (const event of entry.eventNormalizer.normalizeNotification(
      notification
    )) {
      this.#dispatch(entry, event);
    }
  }

  #handleExit(entry: GrokAdapterSession, exit: GrokAcpProcessExit): void {
    if (exit.expected) {
      return;
    }
    entry.turnRunning = false;
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
    const handler = this.#options.reverseRequestHandler;
    if (!handler) {
      throw new Error(`Unsupported Grok reverse request: ${request.method}`);
    }
    return await handler(request, entry.providerSessionId);
  }

  #dispatch(entry: GrokAdapterSession, event: GrokProviderEvent): void {
    if (entry.listeners.size === 0) {
      entry.pendingEvents.push(event);
      return;
    }
    for (const listener of entry.listeners) {
      listener(event);
    }
  }

  #requireSession(providerSessionId: string): GrokAdapterSession {
    const normalizedId = normalizeProviderSessionId(providerSessionId);
    const entry = this.#sessions.get(normalizedId);
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

function readTurnSelection(
  options: ProviderTurnOptions | undefined
): GrokAcpSessionSelection | undefined {
  if (!options) {
    return;
  }
  const modelId = readString(options.model) ?? readString(options.modelId);
  const reasoningEffort = readString(options.reasoningEffort);
  if (!(modelId || reasoningEffort)) {
    return;
  }
  return {
    ...(modelId ? { modelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

function normalizeWorkspacePath(value: string | undefined): string {
  const workspacePath = value?.trim() || process.cwd();
  return workspacePath;
}

function normalizeProviderSessionId(value: string): string {
  const normalized = value.trim().replace(GROK_SESSION_PREFIX_PATTERN, "");
  if (!normalized) {
    throw new Error("Grok provider session id is empty.");
  }
  return normalized;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
