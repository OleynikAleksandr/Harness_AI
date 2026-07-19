// Thin Kimi endpoint for the universal client plus the profile-selective
// session router (2026-07-17 user order): sessions of the built-in native
// profile delegate to the kimi-native-session ACP driver (installed Kimi
// CLI, default agent, real provider home), while managed/legacy sessions run
// the Core client-core agent loop with the materialized managed profile
// really applied (leading system message + builtin tool whitelist). The
// module holds Kimi's dialect specifics (base URL, model, thinking form),
// builds the ClientTurnRequest, and exposes the one ProviderAdapter Core
// session routing constructs for `kimi-client`. Each client session keeps
// its in-memory message history and stream events are emitted as
// NormalizedProviderEvents. The Kimi Code subscription channel accepts a
// plain API key from a third-party client (verified via OpenCode). Contract:
// docs/architecture/UniversalClient.md sections 3.3 / 3.6.

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
import {
  deleteKimiNativeSessionArtifacts,
  isKimiNativeSessionId,
  isKimiNativeSubagentSessionId,
  kimiNativeSessionDriver,
} from "../../kimi-native-session/src/kimi-native-session-facade.js";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderInteractionDecision,
  ProviderSessionStartOptions,
  ProviderTurnOptions,
  ProviderUsageLimitsRefreshRequest,
  SessionProfilePayload,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildKimiManagedSystemMessages,
  selectKimiManagedTools,
} from "./kimi-managed-profile-application.js";
import { resolveKimiModelContexts } from "./kimi-model-catalog.js";
import { readKimiUsageLimitsEvent } from "./kimi-usage-limits.js";

export {
  fetchKimiModelContexts,
  type KimiModelContexts,
  parseKimiModelContexts,
  resolveKimiModelContexts,
} from "./kimi-model-catalog.js";

// Backward-compatible fallback for legacy callers that do not pass Core's
// immutable session model in ProviderTurnOptions.
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

const readTurnModel = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value.trim() : KIMI_MODEL;

interface KimiClientSessionState {
  abort: AbortController | null;
  readonly listeners: Set<ProviderEventListener>;
  messages: readonly ClientMessage[];
  readonly profile: SessionProfilePayload | undefined;
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

  createSession(
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<string> {
    if (options?.profileKind === "native") {
      // Native profile = the vendor CLI itself: the session runs on the
      // kimi-native-session ACP driver, not the universal client. The merged
      // model-context map rides along so the workspace-home config and the
      // per-turn usage limit carry each model's honest window (k3 is 1M).
      return resolveKimiModelContexts().then((modelContexts) =>
        kimiNativeSessionDriver.createSession({
          modelContexts,
          workspacePath: workspacePath ?? this.defaultWorkspacePath,
        })
      );
    }
    const sessionId = `kimi-client-${randomUUID()}`;
    this.ensureSession(sessionId, workspacePath, options);
    return Promise.resolve(sessionId);
  }

  // Resume-on-send after a Stop: the in-memory history kept by closeSession
  // continues under the same provider session id. After a Core restart the
  // map is empty and the session resumes with a blank history (client session
  // history persistence is not part of the MVP).
  resumeSession(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<string> {
    if (isKimiNativeSubagentSessionId(sessionId)) {
      // Synthesized child: resume is a driver no-op; the live wire channel
      // attaches on subscribe and replays the child's wire from offset 0.
      return kimiNativeSessionDriver.resumeSession(sessionId, {
        workspacePath: workspacePath ?? this.defaultWorkspacePath,
      });
    }
    if (isKimiNativeSessionId(sessionId)) {
      return resolveKimiModelContexts().then((modelContexts) =>
        kimiNativeSessionDriver.resumeSession(sessionId, {
          modelContexts,
          workspacePath: workspacePath ?? this.defaultWorkspacePath,
        })
      );
    }
    this.ensureSession(sessionId, workspacePath, options);
    return Promise.resolve(sessionId);
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void> {
    if (isKimiNativeSubagentSessionId(sessionId)) {
      throw new Error(
        "Kimi subagent sessions are read-only: talk to the parent session."
      );
    }
    if (isKimiNativeSessionId(sessionId)) {
      const model = turnOptions?.model;
      const reasoningEffort = turnOptions?.reasoningEffort;
      await kimiNativeSessionDriver.sendMessage(
        sessionId,
        content,
        typeof model === "string" && model.trim() ? model.trim() : undefined,
        typeof reasoningEffort === "string" && reasoningEffort.trim()
          ? reasoningEffort.trim()
          : undefined
      );
      return;
    }
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
      model: readTurnModel(turnOptions?.model),
      signal: abort.signal,
      tools: selectKimiManagedTools(
        this.registry.listDescriptors(),
        session.profile
      ),
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
    if (isKimiNativeSubagentSessionId(sessionId)) {
      // Core adopts synthesized children onto the parent's adapter; the
      // driver serves the child a real channel tailing its own wire.jsonl
      // (a Kimi subagent has no ACP process of its own). Adoption must not
      // fail: with no live parent runtime claiming the child the driver
      // degrades to an inert no-op instead of an unknown-session error.
      return kimiNativeSessionDriver.subscribe(sessionId, listener);
    }
    if (isKimiNativeSessionId(sessionId)) {
      return kimiNativeSessionDriver.subscribe(sessionId, listener);
    }
    const session = this.requireSession(sessionId);
    session.listeners.add(listener);
    return () => session.listeners.delete(listener);
  }

  // Stop semantics (session-turn-stop contract): abort the in-flight turn but
  // keep the history so the next message resumes the same provider session id.
  // Native sessions keep their CLI process alive the same way.
  closeSession(sessionId: string): Promise<void> {
    if (isKimiNativeSubagentSessionId(sessionId)) {
      return Promise.resolve();
    }
    if (isKimiNativeSessionId(sessionId)) {
      return kimiNativeSessionDriver.stopSession(sessionId);
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      session.abort?.abort();
      session.abort = null;
    }
    return Promise.resolve();
  }

  respondToInteraction(
    sessionId: string,
    decision: ProviderInteractionDecision
  ): Promise<void> {
    if (isKimiNativeSessionId(sessionId)) {
      kimiNativeSessionDriver.respondToInteraction(sessionId, decision);
    }
    return Promise.resolve();
  }

  // One Kimi Coding Plan subscription serves native and client sessions
  // alike; Core calls this on bind-ready and after every completed turn.
  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const event = await readKimiUsageLimitsEvent();
    if (event) {
      request.broadcast({
        ...event,
        providerSessionId: request.providerSessionId,
      });
    }
  }

  // Full cleanup for a removed session: drop the in-memory history; a native
  // session also stops its CLI child and removes its session directory from
  // the workspace provider home (Claude-parity — no native JSONL garbage).
  deleteSessionArtifacts(
    providerSessionId: string,
    workspacePath?: string
  ): Promise<void> | void {
    if (isKimiNativeSubagentSessionId(providerSessionId)) {
      return;
    }
    if (isKimiNativeSessionId(providerSessionId)) {
      return kimiNativeSessionDriver
        .deleteSession(providerSessionId)
        .then(() => {
          if (workspacePath) {
            deleteKimiNativeSessionArtifacts(providerSessionId, workspacePath);
          }
        });
    }
    this.sessions.delete(providerSessionId);
  }

  private ensureSession(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): void {
    if (!this.sessions.has(sessionId)) {
      const profile =
        options?.profileKind === "managed" ? options.profile : undefined;
      this.sessions.set(sessionId, {
        abort: null,
        listeners: new Set(),
        // The managed profile prompt opens the history once as its system
        // message; runClientTurn then carries it forward with the history.
        messages: buildKimiManagedSystemMessages(profile),
        profile,
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
