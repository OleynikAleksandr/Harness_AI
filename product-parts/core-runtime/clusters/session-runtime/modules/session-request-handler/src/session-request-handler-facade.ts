import {
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import { providerRegistryFacade } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import { providerSessionBindingFacade } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import {
  type CoreSessionMessage,
  type SessionCoreEvent,
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
import { resolveLiveAssistantTail } from "./session-live-tail-dedupe.js";
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

export type { CoreSession } from "./session-request-handler-types.js";

export class SessionRequestHandlerFacade {
  private readonly bindingFacade: ProviderSessionBindingFacadeLike;
  private readonly eventStream: SessionEventStreamLike;
  private readonly providerRegistry: ProviderRegistryLike;
  private readonly runtimeBindings = new Map<string, ProviderRuntimeBinding>();
  private readonly messagesBySession = new Map<string, CoreSessionMessage[]>();
  private readonly sessions = new Map<string, CoreSession>();
  private readonly telemetryBySession = new Map<
    string,
    ProviderUsageTelemetry
  >();
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
    this.publish({
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
    const runtimeBinding = this.runtimeBindings.get(session.id);
    if (!runtimeBinding) {
      this.publishError(
        session.id,
        resolveBindingUnavailableMessage(
          this.bindingFacade.getBinding(session.id)
        )
      );
      return { ok: true, session: updatedSession };
    }
    this.publishTurnState(session.id, "running");
    this.dispatchProviderMessage(session, runtimeBinding, text).catch(
      (error: unknown) => {
        this.publishError(session.id, stringifyError(error));
        this.publishTurnState(session.id, "idle");
      }
    );
    return { ok: true, session: updatedSession };
  }
  deleteSession(sessionId: string): DeleteSessionResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: "Session not found", ok: false };
    }
    const binding = this.runtimeBindings.get(sessionId);
    binding?.unsubscribe();
    binding?.adapter
      .closeSession(binding.providerSessionId)
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

  private publishMessage(message: CoreSessionMessage): void {
    const displayMessage = this.resolveDisplayMessage(message);
    if (!displayMessage) {
      return;
    }
    this.rememberMessage(displayMessage);
    this.publish({
      payload: displayMessage,
      timestamp: displayMessage.timestamp,
      type: "session:message",
    });
  }

  private resolveDisplayMessage(
    message: CoreSessionMessage
  ): CoreSessionMessage | null {
    if (message.role !== "assistant" || message.tag === "live") {
      return message;
    }
    const deduped = resolveLiveAssistantTail(
      this.messagesBySession.get(message.sessionId) ?? [],
      message.text
    );
    if (!deduped) {
      return null;
    }
    return {
      ...message,
      text: deduped.text,
      ...(deduped.tag ? { tag: deduped.tag } : {}),
    };
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
    this.publish({
      payload: binding,
      timestamp: binding.updatedAt,
      type: "session:provider-binding",
    });
    this.updateTelemetry(binding.sessionId, (current) =>
      usageContextTelemetryFacade.applyBinding(current, binding)
    );
  }

  // Persist the provider session id on the Core session for both the initial
  // binding and later promotions (e.g. Claude realSessionId), so a removed
  // session can locate its provider artifact by the id used in the filename.
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
    this.publish({
      payload: { error, sessionId },
      timestamp: new Date().toISOString(),
      type: "session:error",
    });
  }

  private publishTurnState(sessionId: string, state: "idle" | "running"): void {
    this.updateTelemetry(sessionId, (current) =>
      usageContextTelemetryFacade.applyStatus(current, state)
    );
    this.publish({
      payload: { sessionId, state },
      timestamp: new Date().toISOString(),
      type: "session:turn-state",
    });
  }

  private publish(event: SessionCoreEvent): void {
    this.eventStream.publish(event);
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

  private setTelemetry(
    sessionId: string,
    telemetry: ProviderUsageTelemetry
  ): void {
    const current = this.telemetryBySession.get(sessionId);
    if (current && JSON.stringify(current) === JSON.stringify(telemetry)) {
      return;
    }
    this.telemetryBySession.set(sessionId, telemetry);
    this.publish({
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
      const providerSessionId = await adapter.createSession(
        session.workspacePath
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
    runtimeBinding: ProviderRuntimeBinding,
    text: string
  ): Promise<void> {
    try {
      await runtimeBinding.adapter.sendMessage(
        runtimeBinding.providerSessionId,
        text,
        buildProviderTurnOptions(session)
      );
    } catch (error) {
      this.publishTurnState(session.id, "idle");
      this.publishError(session.id, stringifyError(error));
    }
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
      for (const message of displayMessages) {
        this.publishMessage({
          id: message.id,
          role: message.role,
          sessionId,
          ...(message.tag ? { tag: message.tag } : {}),
          text: message.text,
          timestamp: message.timestamp,
        });
      }
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
