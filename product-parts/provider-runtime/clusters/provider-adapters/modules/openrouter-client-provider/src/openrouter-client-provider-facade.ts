// Thin OpenRouter endpoint for the universal client. Honors EVERY field of
// the preserved OpenRouter Settings card (2026-07-05 user review fix — no
// visible control may go dead): apiKey, baseUrl, defaultModel and endpointTag
// resolve from Core settings per turn. The Core universal client owns the
// loop, tools, streaming and event normalization.

import { randomUUID } from "node:crypto";
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
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

// The Settings endpoint picker stores "default" for OpenRouter's automatic
// routing; only a concrete endpoint tag routes the session.
const DEFAULT_ENDPOINT_TAG = "default";
const TRAILING_SLASHES_PATTERN = /\/+$/u;

// The Base URL field of the preserved Settings card stays honest: a stored
// URL wins, anything blank falls back to the canonical OpenRouter API base.
export const resolveOpenRouterBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim().replace(TRAILING_SLASHES_PATTERN, "");
  return trimmed.length > 0 ? trimmed : OPENROUTER_DEFAULT_BASE_URL;
};

// OpenRouter dialect: reasoning_details thinking (structured blocks return
// through history unchanged), usage streams in any chunk, full tool_choice,
// and app-attribution headers identifying Harness AI.
export const buildOpenRouterDialect = (baseUrl: string): DialectProfile => ({
  baseUrl: resolveOpenRouterBaseUrl(baseUrl),
  extraHeaders: {
    "HTTP-Referer": "https://harness-ai.app",
    "X-Title": "Harness AI",
  },
  providerId: "openrouter-client",
  thinkingForm: "reasoning_details",
  toolChoiceSupport: "full",
  usageFromAnyChunk: true,
});

export interface OpenRouterTurnInput {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly endpointTag: string;
  readonly messages: readonly ClientMessage[];
  readonly model: string;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

// MVP sends NO `reasoning` request parameter (model defaults apply). A
// non-default endpoint tag routes via the request body — the reference wire
// form; `provider` is not a reserved core key, so extraBody carries it.
export const buildOpenRouterTurnRequest = (
  input: OpenRouterTurnInput
): ClientTurnRequest => {
  const endpointTag = input.endpointTag.trim();
  const routed = endpointTag.length > 0 && endpointTag !== DEFAULT_ENDPOINT_TAG;
  return {
    apiKey: input.apiKey,
    dialect: buildOpenRouterDialect(input.baseUrl),
    messages: input.messages,
    model: input.model,
    tools: input.tools,
    ...(routed
      ? {
          extraBody: {
            provider: { allow_fallbacks: false, order: [endpointTag] },
          },
        }
      : {}),
    ...(input.signal ? { signal: input.signal } : {}),
  };
};

const AUTH_MISSING_MESSAGE =
  "OpenRouter API key is missing. Add it in Provider Settings.";

interface OpenRouterClientSessionState {
  abort: AbortController | null;
  readonly listeners: Set<ProviderEventListener>;
  messages: readonly ClientMessage[];
  readonly workspacePath: string;
}

export class OpenRouterClientProviderFacade implements ProviderAdapter {
  private readonly defaultWorkspacePath: string;
  private readonly registry: ToolRegistry;
  private readonly sessions = new Map<string, OpenRouterClientSessionState>();

  constructor(workspacePath: string = process.cwd()) {
    this.defaultWorkspacePath = workspacePath;
    this.registry = createToolRegistry();
    this.registry.registerSource(createBuiltinToolSource());
  }

  createSession(workspacePath?: string): Promise<string> {
    const sessionId = `openrouter-client-${randomUUID()}`;
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const apiKey = providerAuthStoreFacade.getApiKey("openrouter-client");
    if (!apiKey) {
      this.emitAuthFailed(session);
      return;
    }
    const settings = settingsStoreFacade.getSettings(session.workspacePath);
    const provider = settings.providers.openRouter;
    const baseUrl =
      providerAuthStoreFacade.getBaseUrl("openrouter-client") ??
      provider.baseUrl;
    session.abort?.abort();
    const abort = new AbortController();
    session.abort = abort;
    const request = buildOpenRouterTurnRequest({
      apiKey,
      baseUrl,
      endpointTag: provider.endpointTag,
      messages: [...session.messages, { content, role: "user" }],
      model: provider.defaultModel,
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

  private ensureSession(sessionId: string, workspacePath?: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        abort: null,
        listeners: new Set(),
        messages: [],
        workspacePath: workspacePath ?? this.defaultWorkspacePath,
      });
    }
  }

  private requireSession(sessionId: string): OpenRouterClientSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown openrouter-client session: ${sessionId}`);
    }
    return session;
  }

  private emitTurnEvent(
    session: OpenRouterClientSessionState,
    event: ClientTurnEvent
  ): void {
    const mapped = mapClientTurnEvent(event);
    if (mapped) {
      this.emit(session, mapped);
    }
    if (event.kind === "turn_failed") {
      this.emit(session, {
        message: event.text ?? "OpenRouter client turn failed",
        timestamp: new Date().toISOString(),
        type: "stream_error",
        uuid: randomUUID(),
      });
    }
  }

  private emitAuthFailed(session: OpenRouterClientSessionState): void {
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
    session: OpenRouterClientSessionState,
    event: NormalizedProviderEvent
  ): void {
    for (const listener of [...session.listeners]) {
      listener(event);
    }
  }
}
