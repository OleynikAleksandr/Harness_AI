// Thin Kimi endpoint for the universal client. Holds Kimi's dialect specifics
// (base URL, model, thinking form), builds the ClientTurnRequest, and exposes
// the ProviderAdapter that Core session routing constructs: each session keeps
// its in-memory message history, every turn runs through the Core client-core
// agent loop, and stream events are emitted as NormalizedProviderEvents. The
// Kimi Code subscription channel accepts a plain API key from a third-party
// client (verified via OpenCode). Contract: docs/architecture/UniversalClient.md
// sections 3.3 / 3.6.

import { randomUUID } from "node:crypto";
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

// The single public Kimi Code coding model; the vendor rotates the backend.
export const KIMI_MODEL = "kimi-for-coding";

export const KIMI_DIALECT: DialectProfile = {
  baseUrl: "https://api.kimi.com/coding/v1",
  providerId: "kimi",
  thinkingForm: "reasoning_content",
  toolChoiceSupport: "auto_only",
  usageFromAnyChunk: false,
};

export interface KimiTurnInput {
  readonly apiKey: string;
  readonly messages: readonly ClientMessage[];
  readonly model?: string;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

// Assemble the Core client turn request for a Kimi session. The Core session
// route runs this through the universal-client agent loop; this module stays
// Kimi-specific and does not own the loop.
export const buildKimiTurnRequest = (
  input: KimiTurnInput
): ClientTurnRequest => ({
  apiKey: input.apiKey,
  dialect: KIMI_DIALECT,
  messages: input.messages,
  model: input.model ?? KIMI_MODEL,
  tools: input.tools,
  ...(input.signal ? { signal: input.signal } : {}),
});

const AUTH_MISSING_MESSAGE =
  "Kimi For Coding API key is missing. Add it in Provider Settings.";

interface KimiClientSessionState {
  abort: AbortController | null;
  readonly listeners: Set<ProviderEventListener>;
  messages: readonly ClientMessage[];
  readonly workspacePath: string;
}

export class KimiClientProviderFacade implements ProviderAdapter {
  private readonly defaultWorkspacePath: string;
  private readonly registry: ToolRegistry;
  private readonly sessions = new Map<string, KimiClientSessionState>();

  constructor(workspacePath: string = process.cwd()) {
    this.defaultWorkspacePath = workspacePath;
    this.registry = createToolRegistry();
    this.registry.registerSource(createBuiltinToolSource());
  }

  createSession(workspacePath?: string): Promise<string> {
    const sessionId = `kimi-client-${randomUUID()}`;
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  // Resume-on-send after a Stop: the in-memory history kept by closeSession
  // continues under the same provider session id. After a Core restart the
  // map is empty and the session resumes with a blank history (client session
  // history persistence is not part of the MVP).
  resumeSession(sessionId: string, workspacePath?: string): Promise<string> {
    this.ensureSession(sessionId, workspacePath);
    return Promise.resolve(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.requireSession(sessionId);
    const apiKey = providerAuthStoreFacade.getApiKey("kimi-client");
    if (!apiKey) {
      this.emitAuthFailed(session);
      return;
    }
    session.abort?.abort();
    const abort = new AbortController();
    session.abort = abort;
    const request = buildKimiTurnRequest({
      apiKey,
      messages: [...session.messages, { content, role: "user" }],
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

  // Stop semantics (session-turn-stop contract): abort the in-flight turn but
  // keep the history so the next message resumes the same provider session id.
  closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.abort?.abort();
      session.abort = null;
    }
    return Promise.resolve();
  }

  // Full cleanup for a removed session: drop the in-memory history.
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

  private requireSession(sessionId: string): KimiClientSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown kimi-client session: ${sessionId}`);
    }
    return session;
  }

  private emitTurnEvent(
    session: KimiClientSessionState,
    event: ClientTurnEvent
  ): void {
    const mapped = mapClientTurnEvent(event);
    if (mapped) {
      this.emit(session, mapped);
    }
    // The session event router publishes an error to the user only for
    // stream_error, so a failed turn also surfaces its message as one.
    if (event.kind === "turn_failed") {
      this.emit(session, {
        message: event.text ?? "Kimi client turn failed",
        timestamp: new Date().toISOString(),
        type: "stream_error",
        uuid: randomUUID(),
      });
    }
  }

  private emitAuthFailed(session: KimiClientSessionState): void {
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
    session: KimiClientSessionState,
    event: NormalizedProviderEvent
  ): void {
    for (const listener of [...session.listeners]) {
      listener(event);
    }
  }
}
