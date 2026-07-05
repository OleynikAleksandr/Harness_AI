// Thin Local Models endpoint for the universal client. Holds the local-server
// dialect specifics — a user-configured base URL, an optional Bearer key and
// the local thinking form — and exposes the ProviderAdapter Core session
// routing constructs. The Core universal client owns the loop, tools,
// streaming and event normalization.

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
import { detectLocalModelsContextLength } from "./local-models-context-length.js";

const TRAILING_SLASHES_PATTERN = /\/+$/u;
const V1_SUFFIX_PATTERN = /\/v1$/u;

// Users store either the server root (http://127.0.0.1:1234) or the full /v1
// prefix (http://127.0.0.1:11434/v1); both resolve to one /v1 request base.
export const resolveLocalModelsV1BaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim().replace(TRAILING_SLASHES_PATTERN, "");
  if (!trimmed) {
    return "";
  }
  return V1_SUFFIX_PATTERN.test(trimmed) ? trimmed : `${trimmed}/v1`;
};

// Local servers speak plain OpenAI chat completions: no vendor headers, no
// tool_choice parameter (Ollama rejects it; auto is every server's default),
// and thinking streams as reasoning_content — the LM Studio / vLLM /
// llama.cpp-deepseek form. Raw <think>-tag templates remain a per-model
// concern for the core think_tags splitter if a live model needs it.
export const buildLocalModelsDialect = (baseUrl: string): DialectProfile => ({
  baseUrl: resolveLocalModelsV1BaseUrl(baseUrl),
  providerId: "local-models-client",
  thinkingForm: "reasoning_content",
  toolChoiceSupport: "unsupported",
  usageFromAnyChunk: false,
});

export interface LocalModelsTurnInput {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly messages: readonly ClientMessage[];
  readonly model: string;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

export const buildLocalModelsTurnRequest = (
  input: LocalModelsTurnInput
): ClientTurnRequest => ({
  dialect: buildLocalModelsDialect(input.baseUrl),
  messages: input.messages,
  model: input.model,
  tools: input.tools,
  ...(input.apiKey ? { apiKey: input.apiKey } : {}),
  ...(input.signal ? { signal: input.signal } : {}),
});

// Live model catalog from the configured local server (GET {v1}/models).
// Serves both the Settings RPC and the liveness preflight, replacing the old
// hardcoded LM-Studio URL (Core Authority fix): the base URL comes from the
// auth store (settings file + env fallbacks) or the merged settings default.
export const listLocalModels = async (): Promise<string[]> => {
  const baseUrl =
    providerAuthStoreFacade.getBaseUrl("local-models-client") ??
    settingsStoreFacade.getSettings().providers.localModels.baseUrl;
  const v1BaseUrl = resolveLocalModelsV1BaseUrl(baseUrl);
  if (!v1BaseUrl) {
    return [];
  }
  const response = await fetch(`${v1BaseUrl}/models`);
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { data?: unknown[] };
  return Array.isArray(payload.data)
    ? payload.data
        .map((model) =>
          typeof (model as { id?: unknown })?.id === "string"
            ? (model as { id: string }).id
            : null
        )
        .filter((modelId): modelId is string => Boolean(modelId))
    : [];
};

const BASE_URL_MISSING_MESSAGE =
  "Local Models server base URL is missing. Set it in Provider Settings.";

interface LocalModelsClientSessionState {
  abort: AbortController | null;
  // One context-window probe per session; the result rides a "system"
  // telemetry event (tokenUsage.limit) instead of a dialog message.
  contextWindowChecked: boolean;
  readonly listeners: Set<ProviderEventListener>;
  messages: readonly ClientMessage[];
  readonly workspacePath: string;
}

export class LocalModelsClientProviderFacade implements ProviderAdapter {
  private readonly defaultWorkspacePath: string;
  private readonly registry: ToolRegistry;
  private readonly sessions = new Map<string, LocalModelsClientSessionState>();

  constructor(workspacePath: string = process.cwd()) {
    this.defaultWorkspacePath = workspacePath;
    this.registry = createToolRegistry();
    this.registry.registerSource(createBuiltinToolSource());
  }

  createSession(workspacePath?: string): Promise<string> {
    const sessionId = `local-models-client-${randomUUID()}`;
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const settings = settingsStoreFacade.getSettings(session.workspacePath);
    // Auth-store first (settings file + env fallbacks), then the merged
    // settings snapshot whose normalization guarantees the default URL.
    const baseUrl =
      providerAuthStoreFacade.getBaseUrl("local-models-client") ??
      settings.providers.localModels.baseUrl;
    if (!resolveLocalModelsV1BaseUrl(baseUrl)) {
      this.emitBaseUrlMissing(session);
      return;
    }
    // The key is optional: most local servers run no-auth.
    const apiKey = providerAuthStoreFacade.getApiKey("local-models-client");
    await this.publishContextWindow(session, {
      baseUrl,
      contextLength: settings.providers.localModels.contextLength,
      model: settings.providers.localModels.defaultModel,
    });
    session.abort?.abort();
    const abort = new AbortController();
    session.abort = abort;
    const request = buildLocalModelsTurnRequest({
      baseUrl,
      messages: [...session.messages, { content, role: "user" }],
      model: settings.providers.localModels.defaultModel,
      signal: abort.signal,
      tools: this.registry.listDescriptors(),
      ...(apiKey ? { apiKey } : {}),
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
        contextWindowChecked: false,
        listeners: new Set(),
        messages: [],
        workspacePath: workspacePath ?? this.defaultWorkspacePath,
      });
    }
  }

  private requireSession(sessionId: string): LocalModelsClientSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown local-models-client session: ${sessionId}`);
    }
    return session;
  }

  private emitTurnEvent(
    session: LocalModelsClientSessionState,
    event: ClientTurnEvent
  ): void {
    const mapped = mapClientTurnEvent(event);
    if (mapped) {
      this.emit(session, mapped);
    }
    if (event.kind === "turn_failed") {
      this.emit(session, {
        message: event.text ?? "Local Models client turn failed",
        timestamp: new Date().toISOString(),
        type: "stream_error",
        uuid: randomUUID(),
      });
    }
  }

  // Detect the context window once per session (settings override wins) and
  // publish it as tokenUsage.limit so the session usage telemetry reflects
  // the real local window instead of the provider default.
  private async publishContextWindow(
    session: LocalModelsClientSessionState,
    input: { baseUrl: string; contextLength: number; model: string }
  ): Promise<void> {
    if (session.contextWindowChecked) {
      return;
    }
    session.contextWindowChecked = true;
    const limit = await detectLocalModelsContextLength({
      baseUrl: input.baseUrl,
      contextLengthOverride: input.contextLength,
      model: input.model,
    }).catch(() => null);
    if (!limit) {
      return;
    }
    this.emit(session, {
      data: { tokenUsage: { limit, used: 0 } },
      timestamp: new Date().toISOString(),
      type: "system",
      uuid: randomUUID(),
    });
  }

  private emitBaseUrlMissing(session: LocalModelsClientSessionState): void {
    const timestamp = new Date().toISOString();
    this.emit(session, { timestamp, type: "turn_failed", uuid: randomUUID() });
    this.emit(session, {
      message: BASE_URL_MISSING_MESSAGE,
      timestamp,
      type: "stream_error",
      uuid: randomUUID(),
    });
  }

  private emit(
    session: LocalModelsClientSessionState,
    event: NormalizedProviderEvent
  ): void {
    for (const listener of [...session.listeners]) {
      listener(event);
    }
  }
}
