import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import {
  type ProviderSessionBinding,
  providerSessionBindingFacade
} from "../../provider-session-binding/src/provider-session-binding-facade.js";
import {
  type CoreSessionMessage,
  type SessionCoreEvent,
  sessionEventStreamFacade
} from "../../session-event-stream/src/session-event-stream-facade.js";

export interface CoreSession {
  createdAt: string;
  id: string;
  model: string;
  providerId: ProviderId;
  providerName: string;
  title: string;
  updatedAt: string;
  workspaceId: string;
  workspacePath?: string;
}

export interface CreateCoreSessionRequest {
  model: string;
  providerId: ProviderId;
  providerName: string;
  title?: string;
  workspaceId: string;
  workspacePath?: string;
}

export interface SendCoreMessageRequest {
  sessionId: string;
  text: string;
}

export type CoreSessionActionResult =
  | { ok: true; session: CoreSession }
  | { error: string; ok: false };

export interface SessionRequestHandlerDependencies {
  bindingFacade?: ProviderSessionBindingFacadeLike;
  eventStream?: SessionEventStreamLike;
}

interface ProviderSessionBindingFacadeLike {
  createPending(sessionId: string, providerId: ProviderId): ProviderSessionBinding;
  getBinding(sessionId: string): ProviderSessionBinding | null;
  markFailed(
    sessionId: string,
    providerId: ProviderId,
    error: string
  ): ProviderSessionBinding;
}

interface SessionEventStreamLike {
  publish(event: SessionCoreEvent): void;
}

const ADAPTER_NOT_ATTACHED =
  "Provider adapter contract is not attached yet. Core accepted the user intent, but no provider turn was dispatched.";

export class SessionRequestHandlerFacade {
  private readonly bindingFacade: ProviderSessionBindingFacadeLike;
  private readonly eventStream: SessionEventStreamLike;
  private readonly sessions = new Map<string, CoreSession>();

  constructor(deps: SessionRequestHandlerDependencies = {}) {
    this.bindingFacade = deps.bindingFacade ?? providerSessionBindingFacade;
    this.eventStream = deps.eventStream ?? sessionEventStreamFacade;
  }

  createSession(request: CreateCoreSessionRequest): CoreSessionActionResult {
    const now = new Date().toISOString();
    const session: CoreSession = {
      createdAt: now,
      id: createId(`session-${request.providerId}`),
      model: request.model,
      providerId: request.providerId,
      providerName: request.providerName,
      title: request.title ?? `${request.providerName} session`,
      updatedAt: now,
      workspaceId: request.workspaceId,
      ...(request.workspacePath ? { workspacePath: request.workspacePath } : {})
    };
    this.sessions.set(session.id, session);
    this.publish({
      payload: { sessionId: session.id, title: session.title },
      timestamp: now,
      type: "session:created"
    });
    this.publishBinding(this.bindingFacade.createPending(session.id, session.providerId));
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
    this.publishMessage({
      id: createId("message-user"),
      role: "user",
      sessionId: session.id,
      text,
      timestamp: now
    });
    this.publishTurnState(session.id, "running");
    this.publishBinding(
      this.bindingFacade.markFailed(session.id, session.providerId, ADAPTER_NOT_ATTACHED)
    );
    this.publishError(session.id, ADAPTER_NOT_ATTACHED);
    this.publishTurnState(session.id, "idle");
    return { ok: true, session: updatedSession };
  }

  getSession(sessionId: string): CoreSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  listSessions(workspaceId?: string): CoreSession[] {
    const sessions = Array.from(this.sessions.values());
    return workspaceId
      ? sessions.filter((session) => session.workspaceId === workspaceId)
      : sessions;
  }

  private publishMessage(message: CoreSessionMessage): void {
    this.publish({
      payload: message,
      timestamp: message.timestamp,
      type: "session:message"
    });
  }

  private publishBinding(binding: ProviderSessionBinding): void {
    this.publish({
      payload: binding,
      timestamp: binding.updatedAt,
      type: "session:provider-binding"
    });
  }

  private publishError(sessionId: string, error: string): void {
    this.publish({
      payload: { error, sessionId },
      timestamp: new Date().toISOString(),
      type: "session:error"
    });
  }

  private publishTurnState(
    sessionId: string,
    state: "idle" | "running"
  ): void {
    this.publish({
      payload: { sessionId, state },
      timestamp: new Date().toISOString(),
      type: "session:turn-state"
    });
  }

  private publish(event: SessionCoreEvent): void {
    this.eventStream.publish(event);
  }
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export const sessionRequestHandlerFacade = new SessionRequestHandlerFacade();
