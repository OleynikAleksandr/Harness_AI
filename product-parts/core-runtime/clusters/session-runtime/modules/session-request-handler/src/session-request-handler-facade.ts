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
  type CoreSubagentCall,
  sessionEventStreamFacade,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { resolveNextSessionMode } from "./next-session-mode.js";
import {
  restoreSessionHistory as restoreHistory,
  restoreTelemetryHistory as restoreTelemetry,
  writeWorkspaceSessionIndex,
} from "./session-history-restore.js";
import { resolveDisplayMessage } from "./session-live-tail-dedupe.js";
import {
  SessionProfileResolver,
  type SessionProfileResolverLike,
  withRecordedProfileApplication,
} from "./session-profile-resolution.js";
import { SessionProviderBindingLifecycle } from "./session-provider-binding-lifecycle.js";
import {
  closeAndCleanupProviderSession,
  collectSessionTreeIds,
  createId,
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
  RegenerateCoreSessionTitleRequest,
  RenameCoreSessionRequest,
  RollbackCoreSessionRequest,
  SendCoreMessageRequest,
  SessionEventStreamLike,
  SessionRequestHandlerDependencies,
} from "./session-request-handler-types.js";
import { SessionRollback } from "./session-rollback.js";
import { SessionSubagentLifecycle } from "./session-subagent-lifecycle.js";
import { sessionTitleService } from "./session-title-service.js";
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
  private readonly titleContext = {
    getFirstUserMessage: (sessionId: string) =>
      this.messagesBySession
        .get(sessionId)
        ?.find((message) => message.role === "user")?.text,
    getSession: (sessionId: string) => this.sessions.get(sessionId),
    updateSession: (session: CoreSession) => this.updateSession(session),
  };
  private readonly providerBindingLifecycle: SessionProviderBindingLifecycle;
  private readonly subagentLifecycle: SessionSubagentLifecycle;
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
    bindProviderSession: (session) =>
      this.providerBindingLifecycle.bindProviderSession(session),
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
    this.providerBindingLifecycle = new SessionProviderBindingLifecycle({
      bindingFacade: this.bindingFacade,
      getSession: (sessionId) => this.sessions.get(sessionId),
      handleSubagentEvent: (sessionId, event) =>
        this.subagentLifecycle.handleProviderEvent(sessionId, event),
      providerRegistry: this.providerRegistry,
      publishBinding: (binding) => this.publishBinding(binding),
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
      recordAppliedProfileApplication: (sessionId, application) =>
        this.recordAppliedProfileApplication(sessionId, application),
      runtimeBindings: this.runtimeBindings,
      updateTelemetryFromProvider: (sessionId, event) =>
        this.updateTelemetry(sessionId, (current) =>
          usageContextTelemetryFacade.applyProviderEvent(
            current,
            event as Record<string, unknown>
          )
        ),
    });
    this.subagentLifecycle = new SessionSubagentLifecycle({
      addSession: (session) => this.addSubagentSession(session),
      adoptProviderSession: (childSession, parentSession) =>
        this.providerBindingLifecycle.adoptProviderSession(
          childSession,
          parentSession
        ),
      getSession: (sessionId) => this.sessions.get(sessionId),
      getSubagentCall: (parentSessionId, callId) =>
        this.getSubagentCall(parentSessionId, callId),
      listSessions: () => this.listSessions(),
      publishChildResultMessage: (message) => this.publishMessage(message),
      publishSubagentCall: (event) => this.eventStream.publish(event),
      updateSession: (session) => this.updateSession(session),
    });
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
      sessionKind: "primary",
      title: request.title ?? `${request.providerName} session`,
      titleOrigin: "default",
      updatedAt: now,
      workspaceId: request.workspaceId,
    };
    if (request.workspacePath) {
      session.workspacePath = request.workspacePath;
    }
    this.rememberCreatedSession(session, "idle");
    this.providerBindingLifecycle
      .bindProviderSession(session)
      .catch((error: unknown) => {
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
    const updatedSession = sessionTitleService.applyInitialAutoTitle(
      session,
      text,
      now
    );
    this.updateSession(updatedSession);
    this.publishMessage({
      id: createId("message-user"),
      role: "user",
      sessionId: session.id,
      text,
      timestamp: now,
    });
    this.publishTurnState(session.id, "running");
    this.providerBindingLifecycle
      .dispatchProviderMessage(updatedSession, text)
      .catch((error: unknown) => {
        this.publishError(session.id, stringifyError(error));
        this.publishTurnState(session.id, "idle");
      });
    return { ok: true, session: updatedSession };
  }
  renameSession(request: RenameCoreSessionRequest): CoreSessionActionResult {
    return sessionTitleService.renameSession(request, this.titleContext);
  }
  regenerateSessionTitle(
    request: RegenerateCoreSessionTitleRequest
  ): CoreSessionActionResult {
    return sessionTitleService.regenerateSessionTitle(
      request,
      this.titleContext
    );
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
    const rootSession = this.sessions.get(sessionId);
    if (!rootSession) {
      return { error: "Session not found", ok: false };
    }
    const sessionIds = collectSessionTreeIds(this.sessions, sessionId)
      .slice()
      .reverse();
    for (const id of sessionIds) {
      const session = this.sessions.get(id);
      if (!session) {
        continue;
      }
      const binding = this.runtimeBindings.get(id);
      closeAndCleanupProviderSession({
        adapter:
          binding?.adapter ??
          this.providerRegistry.getAdapter(session.providerId),
        binding,
        providerSessionId:
          binding?.providerSessionId ?? session.providerSessionId,
        workspacePath: session.workspacePath,
      });
      // Every session in the deleted tree drops its persisted event JSONL
      // and reasoning translation overlay, so no orphan artifacts remain.
      this.eventStream.deleteSessionEvents?.(id);
      if (session.workspacePath) {
        this.reasoningTranslation.deleteSessionOverlays(
          session.workspacePath,
          id
        );
      }
      this.runtimeBindings.delete(id);
      this.messagesBySession.delete(id);
      this.telemetryBySession.delete(id);
      this.sessions.delete(id);
    }
    this.persistSessionIndex(rootSession.workspacePath);
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
      this.providerBindingLifecycle
        .bindProviderSession(session)
        .catch((error: unknown) => {
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

  private addSubagentSession(session: CoreSession): void {
    this.rememberCreatedSession(
      session,
      session.subagentStatus === "running" ? "running" : "idle"
    );
  }

  private rememberCreatedSession(
    session: CoreSession,
    status: "idle" | "running"
  ): void {
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
        status,
      })
    );
    this.eventStream.publish({
      payload: { sessionId: session.id, title: session.title },
      timestamp: session.createdAt,
      type: "session:created",
    });
    this.publishBinding(
      this.bindingFacade.createPending(session.id, session.providerId)
    );
  }

  private updateSession(session: CoreSession): void {
    this.sessions.set(session.id, session);
    this.persistSessionIndex(session.workspacePath);
    this.eventStream.publish({
      payload: { sessionId: session.id },
      timestamp: session.updatedAt,
      type: "session:updated",
    });
  }

  private getSubagentCall(
    parentSessionId: string,
    callId: string
  ): CoreSubagentCall | undefined {
    const event = (this.eventStream.listEvents?.(parentSessionId) ?? []).find(
      (candidate) =>
        candidate.type === "session:subagent-call" &&
        candidate.payload.id === callId
    );
    return event?.type === "session:subagent-call" ? event.payload : undefined;
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

  async refreshUsageLimits(sessionId: string): Promise<void> {
    await this.providerBindingLifecycle.refreshUsageLimits(sessionId);
  }
}

export const sessionRequestHandlerFacade = new SessionRequestHandlerFacade();
