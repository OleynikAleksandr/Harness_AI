import {
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import { providerRegistryFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { ReasoningTranslationOverlayFacade } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import { providerSessionBindingFacade } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import {
  type CoreSessionMessage,
  sessionEventStreamFacade,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { sessionReasoningDisplayFacade } from "../../session-reasoning-display/src/session-reasoning-display-facade.js";
import { resolveNextSessionMode } from "./next-session-mode.js";
import { readPromotedProviderSessionId } from "./provider-session-id-promotion.js";
import { buildProviderTurnOptions } from "./provider-turn-options.js";
import {
  readWorkspaceSessionIndex,
  writeWorkspaceSessionIndex,
} from "./session-history-store.js";
import { resolveDisplayMessage } from "./session-live-tail-dedupe.js";
import {
  ADAPTER_NOT_REGISTERED,
  createId,
  isRecord,
  readString,
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
  SendCoreMessageRequest,
  SessionEventStreamLike,
  SessionRequestHandlerDependencies,
} from "./session-request-handler-types.js";
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
  constructor(deps: SessionRequestHandlerDependencies = {}) {
    this.bindingFacade = deps.bindingFacade ?? providerSessionBindingFacade;
    this.eventStream = deps.eventStream ?? sessionEventStreamFacade;
    this.providerRegistry = deps.providerRegistry ?? providerRegistryFacade;
  }
  createSession(request: CreateCoreSessionRequest): CoreSessionActionResult {
    const now = new Date().toISOString();
    const session: CoreSession = {
      createdAt: now,
      id: createId(`session-${request.providerId}`),
      model: request.model,
      nextSessionMode: resolveNextSessionMode(request.nextSessionMode),
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
  deleteSession(sessionId: string): DeleteSessionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const binding = this.runtimeBindings.get(sessionId);
    const providerSessionId =
      binding?.providerSessionId ?? session.providerSessionId;
    const adapter =
      binding?.adapter ?? this.providerRegistry.getAdapter(session.providerId);
    binding?.unsubscribe();
    (binding
      ? binding.adapter.closeSession(binding.providerSessionId)
      : Promise.resolve()
    )
      .then(() => {
        if (session.workspacePath && providerSessionId) {
          return adapter?.deleteSessionArtifacts?.(
            providerSessionId,
            session.workspacePath
          );
        }
      })
      .catch(() => undefined);
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
    const restoredSessions = workspaces.flatMap((workspace) =>
      readWorkspaceSessionIndex(workspace.path)
    );
    for (const session of restoredSessions) {
      this.sessions.set(session.id, session);
      this.messagesBySession.set(
        session.id,
        this.readRememberedMessages(session.id)
      );
      this.telemetryBySession.set(
        session.id,
        usageContextTelemetryFacade.createTelemetry({
          model: session.model,
          provider: session.providerName,
          providerId: session.providerId,
          status: "idle",
        })
      );
    }
    return this.listSessions();
  }
  restoreTelemetryHistory(
    telemetryBySession: ReadonlyMap<string, ProviderUsageTelemetry>
  ): void {
    for (const [sessionId, telemetry] of telemetryBySession) {
      if (this.sessions.has(sessionId)) {
        this.telemetryBySession.set(sessionId, telemetry);
      }
    }
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

  private readRememberedMessages(sessionId: string): CoreSessionMessage[] {
    return (
      this.eventStream
        .listEvents?.(sessionId)
        .filter((event) => event.type === "session:message")
        .map((event) => event.payload) ?? []
    );
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
      const providerSessionId =
        session.providerSessionId && adapter.resumeSession
          ? await adapter.resumeSession(
              session.providerSessionId,
              session.workspacePath
            )
          : await adapter.createSession(session.workspacePath);
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
    if (!isRecord(event)) {
      return;
    }
    this.updateTelemetry(sessionId, (current) =>
      usageContextTelemetryFacade.applyProviderEvent(current, event)
    );
    if (typeof event.type !== "string") {
      return;
    }
    const promotedProviderSessionId = readPromotedProviderSessionId(event);
    if (promotedProviderSessionId) {
      const session = this.sessions.get(sessionId);
      const binding = this.runtimeBindings.get(sessionId);
      if (
        session &&
        binding &&
        binding.providerSessionId !== promotedProviderSessionId
      ) {
        this.runtimeBindings.set(sessionId, {
          ...binding,
          providerSessionId: promotedProviderSessionId,
        });
        this.publishBinding(
          this.bindingFacade.markReady(
            sessionId,
            session.providerId,
            promotedProviderSessionId
          )
        );
      }
      return;
    }
    const displayMessages =
      sessionReasoningDisplayFacade.projectProviderEvent(event);
    if (displayMessages.length > 0) {
      const session = this.sessions.get(sessionId);
      this.reasoningTranslation.publishDisplayMessages({
        displayMessages,
        publishMessage: (message) => this.publishMessage(message),
        publishPatch: (payload) =>
          this.eventStream.publish({
            payload,
            timestamp: new Date().toISOString(),
            type: "session:message_translation",
          }),
        sessionId,
        settings: session
          ? settingsStoreFacade.getSettings(session.workspacePath).general
              .localization
          : null,
        workspacePath: session?.workspacePath,
      });
      return;
    }
    if (event.type === "turn_started") {
      this.publishTurnState(sessionId, "running");
      return;
    }
    if (event.type === "turn_completed") {
      this.publishTurnState(sessionId, "idle");
      this.refreshUsageLimits(sessionId).catch(() => undefined);
      return;
    }
    if (event.type === "turn_failed") {
      this.publishTurnState(sessionId, "idle");
      return;
    }
    if (event.type === "stream_error") {
      this.publishTurnState(sessionId, "idle");
      this.publishError(
        sessionId,
        readString(event.message) ?? "Provider turn failed"
      );
    }
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
