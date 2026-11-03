// Thin GLM endpoint for the universal client. Holds Z.ai/GLM dialect specifics,
// builds the ClientTurnRequest with GLM extra body parameters, and exposes the
// ProviderAdapter that Core session routing constructs. The Core universal
// client owns the loop, tools, streaming and event normalization.

import { randomUUID } from "node:crypto";
import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { settingsStoreFacade } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { createBuiltinToolSource } from "../../../../../../core-runtime/clusters/universal-client/modules/builtin-tools/src/builtin-tools-facade.js";
import type {
  ClientMessage,
  ClientTurnEvent,
  ClientTurnRequest,
  DialectProfile,
  ToolDescriptor,
} from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";
import {
  mapClientTurnEvent,
  runClientTurn,
} from "../../../../../../core-runtime/clusters/universal-client/modules/client-core/src/client-core-facade.js";
import {
  createToolRegistry,
  type ToolRegistry,
} from "../../../../../../core-runtime/clusters/universal-client/modules/tool-registry/src/tool-registry-facade.js";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderSessionStartOptions,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { workspaceContextSystemMessages } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

export const GLM_DEFAULT_MODEL = "glm-5.2";

export const GLM_DIALECT: DialectProfile = {
  baseUrl: "https://api.z.ai/api/coding/paas/v4",
  extraHeaders: { "Accept-Language": "en-US,en" },
  providerId: "glm-client",
  thinkingForm: "reasoning_content",
  toolChoiceSupport: "auto_only",
  usageFromAnyChunk: false,
};

export interface GlmTurnInput {
  readonly apiKey: string;
  readonly messages: readonly ClientMessage[];
  readonly model: string;
  readonly reasoningEffort: ReasoningEffort;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

export const buildGlmTurnRequest = (
  input: GlmTurnInput
): ClientTurnRequest => ({
  apiKey: input.apiKey,
  dialect: GLM_DIALECT,
  extraBody: {
    reasoning_effort: input.reasoningEffort,
    thinking: { type: "enabled" },
    tool_stream: true,
  },
  messages: input.messages,
  model: input.model,
  tools: input.tools,
  ...(input.signal ? { signal: input.signal } : {}),
});

const AUTH_MISSING_MESSAGE =
  "Z.ai Coding Plan API key is missing. Add it in Provider Settings.";

interface GlmClientSessionState {
  abort: AbortController | null;
  readonly listeners: Set<ProviderEventListener>;
  messages: readonly ClientMessage[];
  readonly workspacePath: string;
}

export class GlmClientProviderFacade implements ProviderAdapter {
  private readonly defaultWorkspacePath: string;
  private readonly registry: ToolRegistry;
  private readonly sessions = new Map<string, GlmClientSessionState>();

  constructor(workspacePath: string = process.cwd()) {
    this.defaultWorkspacePath = workspacePath;
    this.registry = createToolRegistry();
    this.registry.registerSource(createBuiltinToolSource());
  }

  createSession(
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<string> {
    const sessionId = `glm-client-${randomUUID()}`;
    this.ensureSession(sessionId, workspacePath, options);
    return Promise.resolve(sessionId);
  }

  resumeSession(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<string> {
    this.ensureSession(sessionId, workspacePath, options);
    return Promise.resolve(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const apiKey = providerAuthStoreFacade.getApiKey("glm-client");
    if (!apiKey) {
      this.emitAuthFailed(session);
      return;
    }
    const settings = settingsStoreFacade.getSettings(session.workspacePath);
    session.abort?.abort();
    const abort = new AbortController();
    session.abort = abort;
    const request = buildGlmTurnRequest({
      apiKey,
      messages: [...session.messages, { content, role: "user" }],
      model: settings.providers.glmClient.defaultModel,
      reasoningEffort: settings.providers.glmClient.reasoningEffort,
      signal: abort.signal,
      tools: this.registry.listDescriptors(),
    });
    try {
      session.messages = await runClientTurn({
        onEvent: (event) => this.emitTurnEvent(session, event),
        registry: this.registry,
        request,
        workspacePath: session.workspacePath,
      });
    } finally {
      if (session.abort === abort) {
        session.abort = null;
      }
    }
  }

  subscribe(sessionId: string, listener: ProviderEventListener): () => void {
    const session = this.requireSession(sessionId);
    session.listeners.add(listener);
    return () => session.listeners.delete(listener);
  }

  closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.abort?.abort();
      session.abort = null;
    }
    return Promise.resolve();
  }

  deleteSessionArtifacts(providerSessionId: string): void {
    this.sessions.delete(providerSessionId);
  }

  private ensureSession(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        abort: null,
        listeners: new Set(),
        // A new history opens with the Workflow Kit context, if any.
        messages: workspaceContextSystemMessages(options),
        workspacePath: workspacePath ?? this.defaultWorkspacePath,
      });
    }
  }

  private requireSession(sessionId: string): GlmClientSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown glm-client session: ${sessionId}`);
    }
    return session;
  }

  private emitTurnEvent(
    session: GlmClientSessionState,
    event: ClientTurnEvent
  ): void {
    const mapped = mapClientTurnEvent(event);
    if (mapped) {
      this.emit(session, mapped);
    }
    if (event.kind === "turn_failed") {
      this.emit(session, {
        message: event.text ?? "GLM client turn failed",
        timestamp: new Date().toISOString(),
        type: "stream_error",
        uuid: randomUUID(),
      });
    }
  }

  private emitAuthFailed(session: GlmClientSessionState): void {
    const timestamp = new Date().toISOString();
    this.emit(session, { timestamp, type: "turn_failed", uuid: randomUUID() });
    this.emit(session, {
      message: AUTH_MISSING_MESSAGE,
      timestamp,
      type: "stream_error",
      uuid: randomUUID(),
    });
  }

  private emit(
    session: GlmClientSessionState,
    event: NormalizedProviderEvent
  ): void {
    for (const listener of [...session.listeners]) {
      listener(event);
    }
  }
}
