import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProviderAdapter } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  type ProviderTurnStatus,
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import {
  type ProviderSessionBinding,
  providerSessionBindingFacade,
} from "../../provider-session-binding/src/provider-session-binding-facade.js";
import {
  type CoreSessionMessage,
  type SessionCoreEvent,
  sessionEventStreamFacade,
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
  providerRegistry?: ProviderRegistryLike;
}

interface ProviderSessionBindingFacadeLike {
  createPending(
    sessionId: string,
    providerId: ProviderId
  ): ProviderSessionBinding;
  getBinding(sessionId: string): ProviderSessionBinding | null;
  markFailed(
    sessionId: string,
    providerId: ProviderId,
    error: string
  ): ProviderSessionBinding;
  markReady(
    sessionId: string,
    providerId: ProviderId,
    providerSessionId: string
  ): ProviderSessionBinding;
}

interface SessionEventStreamLike {
  publish(event: SessionCoreEvent): void;
  rememberSession?(session: CoreSession): void;
}

interface ProviderRegistryLike {
  getAdapter(providerId: ProviderId): ProviderAdapter | null;
}

interface ProviderRuntimeBinding {
  adapter: ProviderAdapter;
  providerSessionId: string;
  unsubscribe: () => void;
}

const ADAPTER_NOT_REGISTERED =
  "Provider adapter is not registered in Core runtime.";
const PROVIDER_STARTING = "Provider session is still starting.";

export class SessionRequestHandlerFacade {
  private readonly bindingFacade: ProviderSessionBindingFacadeLike;
  private readonly eventStream: SessionEventStreamLike;
  private readonly providerRegistry: ProviderRegistryLike;
  private readonly runtimeBindings = new Map<string, ProviderRuntimeBinding>();
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
      providerId: request.providerId,
      providerName: request.providerName,
      title: request.title ?? `${request.providerName} session`,
      updatedAt: now,
      workspaceId: request.workspaceId,
      ...(request.workspacePath
        ? { workspacePath: request.workspacePath }
        : {}),
    };
    this.sessions.set(session.id, session);
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
      this.publishError(session.id, this.bindingUnavailableMessage(session.id));
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

  getSession(sessionId: string): CoreSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  listSessions(workspaceId?: string): CoreSession[] {
    const sessions = Array.from(this.sessions.values());
    const filtered = workspaceId
      ? sessions.filter((session) => session.workspaceId === workspaceId)
      : sessions;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  restoreSessionHistory(workspaces: WorkspaceHistoryRef[]): CoreSession[] {
    const restoredSessions = workspaces.flatMap((workspace) =>
      readWorkspaceSessions(workspace.path)
    );
    for (const session of restoredSessions) {
      this.sessions.set(session.id, session);
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

  resumeRestoredSessions(): void {
    for (const session of this.sessions.values()) {
      this.bindProviderSession(session).catch((error: unknown) => {
        this.publishError(session.id, stringifyError(error));
      });
    }
  }

  private publishMessage(message: CoreSessionMessage): void {
    this.publish({
      payload: message,
      timestamp: message.timestamp,
      type: "session:message",
    });
  }

  private publishBinding(binding: ProviderSessionBinding): void {
    this.publish({
      payload: binding,
      timestamp: binding.updatedAt,
      type: "session:provider-binding",
    });
    this.updateTelemetryWithBinding(binding);
  }

  private publishError(sessionId: string, error: string): void {
    this.publish({
      payload: { error, sessionId },
      timestamp: new Date().toISOString(),
      type: "session:error",
    });
  }

  private publishTurnState(sessionId: string, state: "idle" | "running"): void {
    this.updateTelemetryStatus(sessionId, state);
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
    const indexPath = sessionIndexPath(workspacePath);
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(
      indexPath,
      JSON.stringify(workspaceSessions, null, 2),
      "utf8"
    );
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

  private updateTelemetryStatus(
    sessionId: string,
    status: ProviderTurnStatus
  ): void {
    const current = this.telemetryBySession.get(sessionId);
    if (!current) {
      return;
    }
    this.setTelemetry(
      sessionId,
      usageContextTelemetryFacade.applyStatus(current, status)
    );
  }

  private updateTelemetryWithBinding(binding: ProviderSessionBinding): void {
    const current = this.telemetryBySession.get(binding.sessionId);
    if (!current) {
      return;
    }
    this.setTelemetry(
      binding.sessionId,
      usageContextTelemetryFacade.applyBinding(current, binding)
    );
  }

  private updateTelemetryWithProviderEvent(
    sessionId: string,
    event: unknown
  ): void {
    const current = this.telemetryBySession.get(sessionId);
    if (!current) {
      return;
    }
    this.setTelemetry(
      sessionId,
      usageContextTelemetryFacade.applyProviderEvent(current, event)
    );
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
        { model: session.model }
      );
    } catch (error) {
      this.publishTurnState(session.id, "idle");
      this.publishError(session.id, stringifyError(error));
    }
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") {
      return;
    }
    this.updateTelemetryWithProviderEvent(sessionId, event);
    if (event.type === "dialog_message") {
      this.publishMessage({
        id: readString(event.uuid) ?? createId("message-provider"),
        role: event.tag === "thinking" ? "thinking" : "assistant",
        sessionId,
        text: readString(event.content) ?? "",
        timestamp: readString(event.timestamp) ?? new Date().toISOString(),
      });
      return;
    }
    if (event.type === "turn_started") {
      this.publishTurnState(sessionId, "running");
      return;
    }
    if (event.type === "turn_completed") {
      this.publishTurnState(sessionId, "idle");
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

  private bindingUnavailableMessage(sessionId: string): string {
    const binding = this.bindingFacade.getBinding(sessionId);
    if (binding?.status === "pending") {
      return PROVIDER_STARTING;
    }
    return binding?.error ?? ADAPTER_NOT_REGISTERED;
  }
}

interface WorkspaceHistoryRef {
  path: string;
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function sessionIndexPath(workspacePath: string): string {
  return join(workspacePath, ".harness", "sessions", "index.json");
}

function readWorkspaceSessions(workspacePath: string): CoreSession[] {
  const indexPath = sessionIndexPath(workspacePath);
  if (!existsSync(indexPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(indexPath, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isCoreSession) : [];
  } catch {
    return [];
  }
}

function isCoreSession(value: unknown): value is CoreSession {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.providerId === "string" &&
    typeof value.providerName === "string" &&
    typeof value.model === "string" &&
    typeof value.title === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.workspacePath === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export const sessionRequestHandlerFacade = new SessionRequestHandlerFacade();
