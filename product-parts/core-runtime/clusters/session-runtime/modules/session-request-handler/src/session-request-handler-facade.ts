import { normalizeProviderSessionStart } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import { providerRegistryFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { ReasoningTranslationOverlayFacade } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import { providerSessionBindingFacade } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import {
  type CoreSessionMessage,
  sessionEventStreamFacade,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { resolveNextSessionMode } from "./next-session-mode.js";
import { buildProviderTurnOptions } from "./provider-turn-options.js";
import {
  restoreSessionHistory as restoreHistory,
  restoreTelemetryHistory as restoreTelemetry,
  writeWorkspaceSessionIndex,
} from "./session-history-restore.js";
import { resolveDisplayMessage } from "./session-live-tail-dedupe.js";
import {
  buildSessionProfilePayload,
  SessionProfileResolver,
  type SessionProfileResolverLike,
  withRecordedProfileApplication,
} from "./session-profile-resolution.js";
import {
  type ProviderEventRouterContext,
  routeProviderEvent,
} from "./session-provider-event-router.js";
import {
  ADAPTER_NOT_REGISTERED,
  closeAndCleanupProviderSession,
  createId,
  resolveBindingUnavailableMessage,
  stringifyError,
} from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  CoreSessionActionResult,
  CreateCoreSessionRequest,
  DeleteSessionResult,
  ProviderRegistryLike,
  ProviderRuntimeBinding,
  ProviderSessionBindingFacadeLike,
  RollbackCoreSessionRequest,
  SendCoreMessageRequest,
  SessionEventStreamLike,
  SessionRequestHandlerDependencies,
} from "./session-request-handler-types.js";
import { SessionRollback } from "./session-rollback.js";
import { SessionTurnStop } from "./session-turn-stop.js";

export type { CoreSession } from "./session-request-handler-types.js";
export class SessionRequestHandlerFacade {
  private readonly bindingFacade: ProviderSessionBindingFacadeLike;
  private readonly eventStream: SessionEventStreamLike;
  private readonly providerRegistry: ProviderRegistryLike;
  private readonly reasoningTranslation =
    new ReasoningTranslationOverlayFacade();
  private readonly runtimeBindings = new Map<string, ProviderRuntimeBinding>();
  private readonly messagesBySession = new Map<string, CoreSessionMessage[]>();
  private readonly sessions = new Map<string, CoreSession>();
  private readonly telemetryBySession = new Map<
    string,
    ProviderUsageTelemetry
  >();
  private readonly turnStop = new SessionTurnStop({
    deleteBinding: (sessionId) => this.runtimeBindings.delete(sessionId),
    getBinding: (sessionId) => this.runtimeBindings.get(sessionId),
    getSession: (sessionId) => this.sessions.get(sessionId),
    publishIdle: (sessionId) => this.publishTurnState(sessionId, "idle"),
  });
  private readonly rollback = new SessionRollback({
    bindProviderSession: (session) => this.bindProviderSession(session),
    getEvents: (sessionId) => this.eventStream.listEvents?.(sessionId) ?? [],
    getMessages: (sessionId) => this.messagesBySession.get(sessionId) ?? [],
    getRuntimeBinding: (sessionId) => this.runtimeBindings.get(sessionId),
    getSession: (sessionId) => this.sessions.get(sessionId),
    getTelemetryStatus: (sessionId) =>
      this.telemetryBySession.get(sessionId)?.status,
    publishError: (sessionId, error) => this.publishError(sessionId, error),
    publishEvent: (event) => this.eventStream.publish(event),
    publishTurnState: (sessionId, state) =>
      this.publishTurnState(sessionId, state),
    restoreTelemetry: (sessionId, telemetry) =>
      this.setTelemetry(sessionId, telemetry),
    setMessages: (sessionId, messages) =>
      this.messagesBySession.set(sessionId, messages),
    stringifyError,
  });
  private readonly profileResolver: SessionProfileResolverLike;
  constructor(deps: SessionRequestHandlerDependencies = {}) {
    this.bindingFacade = deps.bindingFacade ?? providerSessionBindingFacade;
    this.eventStream = deps.eventStream ?? sessionEventStreamFacade;
    this.providerRegistry = deps.providerRegistry ?? providerRegistryFacade;
    this.profileResolver = deps.profileResolver ?? new SessionProfileResolver();
  }
  async createSession(
    request: CreateCoreSessionRequest
  ): Promise<CoreSessionActionResult> {
    const nextSessionMode = resolveNextSessionMode(request.nextSessionMode);
    // Snapshot is captured exactly once at create; broken selection rejects.
    const resolution = await this.profileResolver.resolveAppliedProfile({
      nextSessionMode,
      providerId: request.providerId,
      workspacePath: request.workspacePath,
    });
    if (!resolution.ok) {
      return { error: resolution.error, ok: false };
    }
    const now = new Date().toISOString();
    const session: CoreSession = {
      appliedProfile: resolution.appliedProfile,
      createdAt: now,
      id: createId(`session-${request.providerId}`),
      model: request.model,
      nextSessionMode,
      providerId: request.providerId,
      providerName: request.providerName,
      title: request.title ?? `${request.providerName} session`,
      updatedAt: now,
      workspaceId: request.workspaceId,
    };
    if (request.workspacePath) {
      session.workspacePath = request.workspacePath;
    }
    this.sessions.set(session.id, session);
    this.messagesBySession.set(session.id, []);
    this.eventStream.rememberSession?.(session);
    this.persistSessionIndex(session.workspacePath);
    this.setTelemetry(
      session.id,
      usageContextTelemetryFacade.createTelemetry({
        model: session.model,
        provider: session.providerName,
        providerId: session.providerId,
        status: "idle",
      })
    );
    this.eventStream.publish({
      payload: { sessionId: session.id, title: session.title },
      timestamp: now,
      type: "session:created",
    });
    this.publishBinding(
      this.bindingFacade.createPending(session.id, session.providerId)
    );
    this.bindProviderSession(session).catch((error: unknown) => {
      this.publishError(session.id, stringifyError(error));
    });
    return { ok: true, session };
  }
  sendMessage(request: SendCoreMessageRequest): CoreSessionActionResult {
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const text = request.text.trim();
    if (!text) {
      return { error: "Message is empty", ok: false };
    }
    const now = new Date().toISOString();
    const updatedSession = { ...session, updatedAt: now };
    this.sessions.set(session.id, updatedSession);
    this.persistSessionIndex(updatedSession.workspacePath);
    this.publishMessage({
      id: createId("message-user"),
      role: "user",
      sessionId: session.id,
      text,
      timestamp: now,
    });
    this.publishTurnState(session.id, "running");
    this.dispatchProviderMessage(updatedSession, text).catch(
      (error: unknown) => {
        this.publishError(session.id, stringifyError(error));
        this.publishTurnState(session.id, "idle");
      }
    );
    return { ok: true, session: updatedSession };
  }
  stopTurn(sessionId: string): CoreSessionActionResult {
    return this.turnStop.stop(sessionId);
  }
  rollbackSessionTurns(
    request: RollbackCoreSessionRequest
  ): Promise<CoreSessionActionResult> {
    return this.rollback.rollback(request);
  }
  deleteSession(sessionId: string): DeleteSessionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const binding = this.runtimeBindings.get(sessionId);
    closeAndCleanupProviderSession({
      adapter:
        binding?.adapter ??
        this.providerRegistry.getAdapter(session.providerId),
      binding,
      providerSessionId:
        binding?.providerSessionId ?? session.providerSessionId,
      workspacePath: session.workspacePath,
    });
    this.runtimeBindings.delete(sessionId);
    this.messagesBySession.delete(sessionId);
    this.telemetryBySession.delete(sessionId);
    this.sessions.delete(sessionId);
    this.persistSessionIndex(session.workspacePath);
    return { ok: true };
  }
  listSessions(workspaceId?: string): CoreSession[] {
    const sessions = Array.from(this.sessions.values());
    const filtered = workspaceId
      ? sessions.filter((session) => session.workspaceId === workspaceId)
      : sessions;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  restoreSessionHistory(workspaces: { path: string }[]): CoreSession[] {
    restoreHistory({
      eventStream: this.eventStream,
      messagesBySession: this.messagesBySession,
      sessions: this.sessions,
      telemetryBySession: this.telemetryBySession,
      workspaces,
    });
    return this.listSessions();
  }
  restoreTelemetryHistory(
    telemetryBySession: ReadonlyMap<string, ProviderUsageTelemetry>
  ): void {
    restoreTelemetry({
      sessions: this.sessions,
      telemetryBySession: this.telemetryBySession,
      telemetryHistory: telemetryBySession,
    });
  }
  resumeRestoredSessions(): void {
    for (const session of this.sessions.values()) {
      this.bindProviderSession(session).catch((error: unknown) => {
        this.publishError(session.id, stringifyError(error));
      });
    }
  }
  private publishMessage(message: CoreSessionMessage) {
    const displayMessage = resolveDisplayMessage(
      this.messagesBySession.get(message.sessionId) ?? [],
      message
    );
    if (!displayMessage) {
      return null;
    }
    this.rememberMessage(displayMessage);
    this.eventStream.publish({
      payload: displayMessage,
      timestamp: displayMessage.timestamp,
      type: "session:message",
    });
    return displayMessage;
  }

  private rememberMessage(message: CoreSessionMessage): void {
    const messages = this.messagesBySession.get(message.sessionId) ?? [];
    messages.push(message);
    this.messagesBySession.set(message.sessionId, messages);
  }

  private publishBinding(binding: ProviderSessionBinding): void {
    this.rememberProviderSessionId(binding);
    this.eventStream.publish({
      payload: binding,
      timestamp: binding.updatedAt,
      type: "session:provider-binding",
    });
    this.updateTelemetry(binding.sessionId, (current) =>
      usageContextTelemetryFacade.applyBinding(current, binding)
    );
  }

  private rememberProviderSessionId(binding: ProviderSessionBinding): void {
    const session = this.sessions.get(binding.sessionId);
    if (
      session &&
      binding.providerSessionId &&
      session.providerSessionId !== binding.providerSessionId
    ) {
      this.sessions.set(binding.sessionId, {
        ...session,
        providerSessionId: binding.providerSessionId,
      });
      this.persistSessionIndex(session.workspacePath);
    }
  }

  private publishError(sessionId: string, error: string): void {
    this.eventStream.publish({
      payload: { error, sessionId },
      timestamp: new Date().toISOString(),
      type: "session:error",
    });
  }

  private publishTurnState(sessionId: string, state: "idle" | "running"): void {
    this.updateTelemetry(sessionId, (current) =>
      usageContextTelemetryFacade.applyStatus(current, state)
    );
    this.eventStream.publish({
      payload: { sessionId, state },
      timestamp: new Date().toISOString(),
      type: "session:turn-state",
    });
  }

  private recordAppliedProfileApplication(
    sessionId: string,
    appliedProfileApplication?: Readonly<Record<string, unknown>>
  ): void {
    const updated = withRecordedProfileApplication(
      this.sessions.get(sessionId),
      appliedProfileApplication
    );
    if (updated) {
      this.sessions.set(sessionId, updated);
      this.persistSessionIndex(updated.workspacePath);
    }
  }

  private persistSessionIndex(workspacePath?: string): void {
    if (!workspacePath) {
      return;
    }
    const workspaceSessions = this.listSessions().filter(
      (session) => session.workspacePath === workspacePath
    );
    writeWorkspaceSessionIndex(workspacePath, workspaceSessions);
  }

  private setTelemetry(sessionId: string, telemetry: ProviderUsageTelemetry) {
    const current = this.telemetryBySession.get(sessionId);
    if (current && JSON.stringify(current) === JSON.stringify(telemetry)) {
      return;
    }
    this.telemetryBySession.set(sessionId, telemetry);
    this.eventStream.publish({
      payload: { sessionId, telemetry },
      timestamp: telemetry.updatedAt,
      type: "session:telemetry",
    });
  }

  private updateTelemetry(
    sessionId: string,
    apply: (current: ProviderUsageTelemetry) => ProviderUsageTelemetry
  ): void {
    const current = this.telemetryBySession.get(sessionId);
    if (current) {
      this.setTelemetry(sessionId, apply(current));
    }
  }

  private async bindProviderSession(session: CoreSession): Promise<void> {
    const adapter = this.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.publishBinding(
        this.bindingFacade.markFailed(
          session.id,
          session.providerId,
          ADAPTER_NOT_REGISTERED
        )
      );
      this.publishError(session.id, ADAPTER_NOT_REGISTERED);
      return;
    }
    try {
      await adapter.initialize?.();
      // Adapter input comes strictly from the immutable snapshot (never
      // reread); legacy sessions pass no options at all.
      const profilePayload = buildSessionProfilePayload(session.appliedProfile);
      const startOptions = session.appliedProfile
        ? { profile: profilePayload, profileKind: session.appliedProfile.kind }
        : undefined;
      const startOutcome =
        session.providerSessionId && adapter.resumeSession
          ? await adapter.resumeSession(
              session.providerSessionId,
              session.workspacePath,
              startOptions
            )
          : await adapter.createSession(session.workspacePath, startOptions);
      const { appliedProfileApplication, providerSessionId } =
        normalizeProviderSessionStart(startOutcome);
      this.recordAppliedProfileApplication(
        session.id,
        appliedProfileApplication
      );
      const unsubscribe = adapter.subscribe(providerSessionId, (event) =>
        this.handleProviderEvent(session.id, event)
      );
      this.runtimeBindings.set(session.id, {
        adapter,
        providerSessionId,
        unsubscribe,
      });
      this.publishBinding(
        this.bindingFacade.markReady(
          session.id,
          session.providerId,
          providerSessionId
        )
      );
      this.refreshUsageLimits(session.id).catch(() => undefined);
    } catch (error) {
      this.publishBinding(
        this.bindingFacade.markFailed(
          session.id,
          session.providerId,
          stringifyError(error)
        )
      );
      this.publishError(session.id, stringifyError(error));
    }
  }
  private async dispatchProviderMessage(
    session: CoreSession,
    text: string
  ): Promise<void> {
    // Resume-on-send: after a Stop the binding is gone, so rebind (which resumes
    // by providerSessionId) before dispatching the turn.
    let binding = this.runtimeBindings.get(session.id);
    if (!binding) {
      await this.bindProviderSession(session);
      binding = this.runtimeBindings.get(session.id);
    }
    if (!binding) {
      throw new Error(
        resolveBindingUnavailableMessage(
          this.bindingFacade.getBinding(session.id)
        )
      );
    }
    await binding.adapter.sendMessage(
      binding.providerSessionId,
      text,
      buildProviderTurnOptions(session)
    );
  }
  private handleProviderEvent(sessionId: string, event: unknown): void {
    routeProviderEvent(this.providerEventRouterContext(), sessionId, event);
  }
  private providerEventRouterContext(): ProviderEventRouterContext {
    return {
      getBinding: (sessionId) => this.runtimeBindings.get(sessionId),
      getSession: (sessionId) => this.sessions.get(sessionId),
      markBindingReady: (sessionId, providerId, providerSessionId) =>
        this.publishBinding(
          this.bindingFacade.markReady(sessionId, providerId, providerSessionId)
        ),
      publishError: (sessionId, error) => this.publishError(sessionId, error),
      publishMessage: (message) => this.publishMessage(message),
      publishTranslationPatch: (payload) =>
        this.eventStream.publish({
          payload,
          timestamp: new Date().toISOString(),
          type: "session:message_translation",
        }),
      publishTurnState: (sessionId, state) =>
        this.publishTurnState(sessionId, state),
      reasoningTranslation: this.reasoningTranslation,
      refreshUsageLimits: (sessionId) =>
        this.refreshUsageLimits(sessionId).catch(() => undefined),
      setBinding: (sessionId, binding) =>
        this.runtimeBindings.set(sessionId, binding),
      updateTelemetry: (sessionId, event) =>
        this.updateTelemetry(sessionId, (current) =>
          usageContextTelemetryFacade.applyProviderEvent(
            current,
            event as Record<string, unknown>
          )
        ),
    };
  }
  async refreshUsageLimits(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const binding = this.runtimeBindings.get(sessionId);
    if (!(session?.workspacePath && binding?.adapter.refreshUsageLimits)) {
      return;
    }
    await binding.adapter.refreshUsageLimits({
      broadcast: (event) => this.handleProviderEvent(sessionId, event),
      providerSessionId: binding.providerSessionId,
      runtimeSessionId: sessionId,
      workspacePath: session.workspacePath,
    });
  }
}

export const sessionRequestHandlerFacade = new SessionRequestHandlerFacade();
