import crypto from "node:crypto";
import {
  normalizeProviderSessionStart,
  type ProviderSessionStartOptions,
  type ProviderSessionStartOutcome,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { SDKAuthManager } from "../auth/sdk-auth-manager.js";
import {
  type ClaudeNativeRequestCaptureOptions,
  ClaudeNativeRequestCaptureService,
} from "../diagnostics/claude-native-request-capture-service.js";
import { SDKInstaller } from "../installer/sdk-installer.js";
import { SDKMessageProcessor } from "../messaging/message-processor.js";
import { resolveClaudeProviderProjectDir } from "../sdk/claude-provider-home.js";
import { ClaudeSDKManager } from "../sdk/claude-sdk-manager.js";
import { SDKSessionManager } from "../session/session-manager.js";
import type { ActiveSession } from "../session/types.js";
import { isClaudeChildProviderSessionId } from "../subagents/claude-subagent-event-normalizer.js";
import {
  ClaudeSubagentObserver,
  resolveParentTranscriptPath,
} from "../subagents/claude-subagent-observer.js";
import { ClaudeHaikuTranslationService } from "../translation/claude-haiku-translation-service.js";
import type {
  ClaudeModuleOptions,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ModuleReporter,
} from "../types.js";
import { deleteClaudeTranscriptArtifacts } from "./claude-transcript-cleanup.js";

export type SessionListener = (payload: unknown) => void;

export class ClaudeProviderAdapter {
  private readonly installer: SDKInstaller;
  private readonly sdkManager: ClaudeSDKManager;
  private readonly nativeRequestCaptureService: ClaudeNativeRequestCaptureService;
  private readonly authManager: SDKAuthManager;
  private readonly reporter?: ModuleReporter;
  private haikuTranslationService: ClaudeHaikuTranslationService | null = null;
  private readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
  private readonly workspacePath: string;
  private readonly listeners = new Map<string, Set<SessionListener>>();
  private readonly pendingEvents = new Map<string, unknown[]>();
  private readonly sessionIdAliases = new Map<string, string>();
  private readonly subagentObservers = new Map<
    string,
    ClaudeSubagentObserver
  >();
  private readonly projectPath: string;

  constructor(options: ClaudeModuleOptions) {
    this.usageLimitsFacade = options.usageLimitsFacade;
    const reporter = options.reporter;
    this.reporter = reporter;
    this.workspacePath = options.workspace.workspacePath;
    const projectPath = this.resolveProjectPath(
      options.workspace.claudeProjectSlug
    );
    this.projectPath = projectPath;
    const installer = new SDKInstaller(options.installerPaths, {
      logger: reporter,
    });
    this.installer = installer;
    const authManager = new SDKAuthManager({ reporter });
    this.authManager = authManager;
    const sessionManager = new SDKSessionManager();
    const messageProcessor = new SDKMessageProcessor(sessionManager, {
      projectPath,
      reporter,
      usageLimitsFacade: options.usageLimitsFacade,
    });
    this.sdkManager = new ClaudeSDKManager({
      installer,
      authManager,
      sessions: sessionManager,
      processor: messageProcessor,
      workspace: options.workspace,
      reporter,
      enableDebugStreams: options.enableDebugStreams,
    });
    this.nativeRequestCaptureService = new ClaudeNativeRequestCaptureService({
      authManager,
      installer,
      workspace: options.workspace,
    });
  }

  getHaikuTranslationService(): ClaudeHaikuTranslationService {
    if (!this.haikuTranslationService) {
      this.haikuTranslationService = new ClaudeHaikuTranslationService({
        authManager: this.authManager,
        installer: this.installer,
        reporter: this.reporter,
      });
    }
    return this.haikuTranslationService;
  }

  async initialize(): Promise<void> {
    await this.sdkManager.initialize();
    await this.authManager.ensureProviderHomeSessionBootstrap({
      executablePath: this.installer.getExecutablePath(),
      workspacePath: this.workspacePath,
    });
  }

  async createSession(
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    const outcome = await this.sdkManager.createSession(
      workspacePath,
      startOptions
    );
    const { providerSessionId } = normalizeProviderSessionStart(outcome);
    const session = this.sdkManager.getSession(providerSessionId);
    if (session) {
      this.bindSessionEvents(session);
      this.hydrateSubagents(providerSessionId);
    }
    return outcome;
  }

  async resumeSession(
    sessionId: string,
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    // Subagent child sessions are not SDK sessions: their transcript replays
    // through the parent's observer, so a restored child binds as-is.
    if (isClaudeChildProviderSessionId(sessionId)) {
      return sessionId;
    }
    const outcome = await this.sdkManager.resumeSession(
      sessionId,
      workspacePath,
      startOptions
    );
    const { providerSessionId } = normalizeProviderSessionStart(outcome);
    const session = this.sdkManager.getSession(providerSessionId);
    if (session) {
      this.bindSessionEvents(session);
      this.hydrateSubagents(providerSessionId);
    }
    return outcome;
  }

  async refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }): Promise<void> {
    const facade = this.usageLimitsFacade;
    if (!facade) {
      return;
    }
    const payload = await facade
      .readStreamPayload({
        workspacePath: params.workspacePath,
        runtimeSessionId: params.runtimeSessionId,
        providerSessionId: params.providerSessionId,
        force: true,
      })
      .catch((): ClaudeUsageLimitsStreamPayload | null => null);
    if (!payload?.usageLimits) {
      return;
    }
    params.broadcast({
      providerScopeKey: payload.providerScopeKey,
      usageLimits: payload.usageLimits,
      data: payload.data,
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    if (isClaudeChildProviderSessionId(sessionId)) {
      this.listeners.delete(sessionId);
      this.pendingEvents.delete(sessionId);
      return;
    }
    const observer = this.subagentObservers.get(
      this.resolveSessionAlias(sessionId)
    );
    if (observer) {
      await observer.stopTurnPolling();
      this.subagentObservers.delete(this.resolveSessionAlias(sessionId));
    }
    await this.sdkManager.closeSession(sessionId);
    this.listeners.delete(sessionId);
  }

  deleteSessionArtifacts(
    providerSessionId: string,
    workspacePath: string
  ): void {
    deleteClaudeTranscriptArtifacts(workspacePath, providerSessionId);
  }

  async captureNativeRequest(
    options: ClaudeNativeRequestCaptureOptions
  ): Promise<void> {
    await this.nativeRequestCaptureService.captureNativeRequest(options);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void> {
    await this.sdkManager.sendMessage(sessionId, content, turnOptions);
  }

  subscribe(sessionId: string, listener: SessionListener): () => void {
    const resolvedId = this.resolveSessionAlias(sessionId);
    const bucket = this.listeners.get(resolvedId) ?? new Set<SessionListener>();
    bucket.add(listener);
    this.listeners.set(resolvedId, bucket);
    this.flushPendingEvents(resolvedId);
    if (resolvedId !== sessionId) {
      this.sessionIdAliases.set(sessionId, resolvedId);
      this.flushPendingEvents(sessionId);
    }
    return () => {
      const target = this.listeners.get(resolvedId);
      if (!target) {
        return;
      }
      target.delete(listener);
      if (target.size === 0) {
        this.listeners.delete(resolvedId);
      }
    };
  }

  private bindSessionEvents(session: ActiveSession): void {
    session.eventEmitter.on("message", (payload: unknown) => {
      this.dispatchMessage(session.sessionId, payload);
      this.handleSubagentTurnLifecycle(session.sessionId, payload);
    });
    session.eventEmitter.on("error", (payload: unknown) => {
      this.dispatchMessage(session.sessionId, {
        type: "error",
        provider: "claude",
        payload,
      });
    });
    session.eventEmitter.on("sessionIdChanged", (payload) => {
      if (payload?.oldId && payload?.newId) {
        this.reassignListeners(payload.oldId, payload.newId);
        this.sessionIdAliases.set(payload.oldId, payload.newId);
        this.reassignSubagentObserver(payload.oldId, payload.newId);
      }
      const targetId = payload?.newId ?? session.sessionId;
      this.dispatchMessage(targetId, {
        type: "sessionIdChanged",
        payload,
      });
    });
  }

  private ensureSubagentObserver(
    providerSessionId: string
  ): ClaudeSubagentObserver {
    const resolvedId = this.resolveSessionAlias(providerSessionId);
    let observer = this.subagentObservers.get(resolvedId);
    if (!observer) {
      observer = new ClaudeSubagentObserver({
        emitter: {
          // dispatchMessage resolves aliases, so the captured id keeps
          // routing to the promoted session id after a rename.
          emitToChild: (childId, payload) =>
            this.dispatchMessage(childId, payload),
          emitToParent: (event) => this.dispatchMessage(resolvedId, event),
        },
        parentProviderSessionId: resolvedId,
        parentTranscriptPath: resolveParentTranscriptPath(
          this.projectPath,
          resolvedId
        ),
      });
      this.subagentObservers.set(resolvedId, observer);
    }
    return observer;
  }

  private hydrateSubagents(providerSessionId: string): void {
    this.ensureSubagentObserver(providerSessionId)
      .hydrate()
      .catch((error: unknown) => {
        this.reporter?.warn?.(
          `Claude subagent hydration failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
  }

  private handleSubagentTurnLifecycle(
    sessionId: string,
    payload: unknown
  ): void {
    const type =
      payload && typeof payload === "object"
        ? (payload as { readonly type?: unknown }).type
        : null;
    if (type === "turn_started") {
      this.ensureSubagentObserver(sessionId).startTurnPolling();
      return;
    }
    if (type === "turn_completed" || type === "turn_failed") {
      this.ensureSubagentObserver(sessionId)
        .stopTurnPolling()
        .catch(() => undefined);
    }
  }

  private reassignSubagentObserver(oldId: string, newId: string): void {
    const observer = this.subagentObservers.get(oldId);
    if (!observer || oldId === newId) {
      return;
    }
    this.subagentObservers.delete(oldId);
    this.subagentObservers.set(newId, observer);
    observer.updateParentSession(
      newId,
      resolveParentTranscriptPath(this.projectPath, newId)
    );
  }

  private dispatchMessage(sessionId: string, payload: unknown): void {
    const resolvedId = this.resolveSessionAlias(sessionId);
    const target = this.listeners.get(resolvedId);
    if (!target) {
      const queue = this.pendingEvents.get(resolvedId) ?? [];
      queue.push(payload);
      this.pendingEvents.set(resolvedId, queue);
      return;
    }
    for (const listener of target) {
      listener(payload);
    }
  }

  private reassignListeners(oldId: string, newId: string): void {
    if (oldId === newId) {
      return;
    }
    this.rebindPendingEvents(oldId, newId);
    this.rebindSessionAliases(oldId, newId);
    const set = this.listeners.get(oldId);
    if (set) {
      this.listeners.delete(oldId);
      const destination =
        this.listeners.get(newId) ?? new Set<SessionListener>();
      for (const listener of set) {
        destination.add(listener);
      }
      this.listeners.set(newId, destination);
    }
    this.flushPendingEvents(newId);
  }

  private rebindPendingEvents(oldId: string, newId: string): void {
    const queued = this.pendingEvents.get(oldId);
    if (!queued || queued.length === 0) {
      return;
    }
    this.pendingEvents.delete(oldId);
    const destination = this.pendingEvents.get(newId) ?? [];
    destination.push(...queued);
    this.pendingEvents.set(newId, destination);
  }

  private rebindSessionAliases(oldId: string, newId: string): void {
    for (const [alias, target] of this.sessionIdAliases.entries()) {
      if (target === oldId) {
        this.sessionIdAliases.set(alias, newId);
      }
    }
  }

  private resolveProjectPath(slug: string): string {
    return resolveClaudeProviderProjectDir(slug);
  }

  private resolveSessionAlias(sessionId: string): string {
    let current = sessionId;
    const visited = new Set<string>();
    while (this.sessionIdAliases.has(current) && !visited.has(current)) {
      visited.add(current);
      const next = this.sessionIdAliases.get(current);
      if (!next) {
        break;
      }
      current = next;
    }
    return current;
  }

  private flushPendingEvents(sessionId: string): void {
    const events = this.pendingEvents.get(sessionId);
    if (!events || events.length === 0) {
      return;
    }
    const listeners = this.listeners.get(sessionId);
    if (!listeners || listeners.size === 0) {
      return;
    }
    this.pendingEvents.delete(sessionId);
    for (const event of events) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}
