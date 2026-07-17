// Public facade of the Kimi native session module: the ACP backend the
// kimi-client adapter uses for native-profile sessions. It owns the
// per-session driver (runtime + interaction bridge + listener fan-out) and
// re-exports the transport layers for tests and diagnostics.

import { randomUUID } from "node:crypto";
import type { ProviderInteractionDecision } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { KimiAcpSessionProcessOptions } from "./kimi-acp-session-process.js";
import { KimiInteractionBridge } from "./kimi-interaction-bridge.js";
import { KimiNativeSessionRuntime } from "./kimi-native-session-runtime.js";

export {
  KimiAcpChannelClosedError,
  type KimiAcpInitializeResult,
  type KimiAcpNotification,
  KimiAcpProtocolError,
  KimiAcpRequestTimeoutError,
  type KimiAcpReverseRequest,
  type KimiAcpReverseRequestHandler,
} from "./kimi-acp-session-contracts.js";
export {
  KimiAcpSessionProcess,
  type KimiAcpSessionProcessExit,
  type KimiAcpSessionProcessOptions,
  resolveKimiSessionCommand,
} from "./kimi-acp-session-process.js";
export {
  type KimiAcpRequestOptions,
  KimiAcpSessionRouter,
  type KimiAcpSessionRouterOptions,
} from "./kimi-acp-session-router.js";
export {
  KimiInteractionBridge,
  type KimiInteractionBridgeOptions,
} from "./kimi-interaction-bridge.js";
export {
  KimiNativeSessionRuntime,
  type KimiNativeSessionRuntimeOptions,
} from "./kimi-native-session-runtime.js";
export {
  type KimiNativeSessionEvent,
  KimiSessionEventNormalizer,
} from "./kimi-session-event-normalizer.js";
export {
  type KimiSessionTokenUsage,
  parseKimiWireUsage,
  readKimiSessionTokenUsage,
} from "./kimi-session-usage-reader.js";
export { KimiSubagentNormalizer } from "./kimi-subagent-normalizer.js";
export {
  deleteKimiNativeSessionArtifacts,
  type KimiWorkspaceHome,
  prepareKimiWorkspaceHome,
} from "./kimi-workspace-home.js";

const KIMI_NATIVE_SESSION_ID_PREFIX = "kimi-native-";
const KIMI_SUBAGENT_SESSION_ID_PREFIX = "kimi-agent-";

// The kimi-client adapter routes by this marker: native-profile sessions get
// prefixed provider session ids, everything else stays on the universal
// client.
export function isKimiNativeSessionId(sessionId: string): boolean {
  return sessionId.startsWith(KIMI_NATIVE_SESSION_ID_PREFIX);
}

// Synthetic child ids minted by the subagent normalizer. A Kimi subagent has
// no provider channel of its own (its lifecycle is synthesized from the
// parent's tool stream), so Core's child-session adoption must get an inert
// channel instead of an unknown-session error.
export function isKimiNativeSubagentSessionId(sessionId: string): boolean {
  return sessionId.startsWith(KIMI_SUBAGENT_SESSION_ID_PREFIX);
}

export interface KimiNativeSessionStartOptions {
  readonly model?: string;
  readonly workspacePath: string;
}

interface KimiNativeSessionEntry {
  readonly bridge: KimiInteractionBridge;
  readonly listeners: Set<(event: unknown) => void>;
  readonly runtime: KimiNativeSessionRuntime;
}

export interface KimiNativeSessionDriverOptions {
  // Test/DI overrides for every spawned child (command, args, timeouts).
  readonly processOverrides?: Partial<KimiAcpSessionProcessOptions>;
}

// Session driver the kimi-client adapter consumes for the native profile.
// One entry per provider session id: an immutable ACP runtime binding, a
// fail-closed permission bridge and the listener fan-out. Stop cancels the
// in-flight turn but keeps the CLI session alive (resume-on-send); delete
// kills the child and drops the entry. After a Core restart resume opens a
// fresh native CLI session under the same provider session id (native
// history persistence is CLI-side).
export class KimiNativeSessionDriver {
  private readonly options: KimiNativeSessionDriverOptions;
  private readonly sessions = new Map<string, KimiNativeSessionEntry>();

  constructor(options: KimiNativeSessionDriverOptions = {}) {
    this.options = options;
  }

  async createSession(
    startOptions: KimiNativeSessionStartOptions
  ): Promise<string> {
    const sessionId = `${KIMI_NATIVE_SESSION_ID_PREFIX}${randomUUID()}`;
    await this.ensureEntry(sessionId, startOptions);
    return sessionId;
  }

  async resumeSession(
    sessionId: string,
    startOptions: KimiNativeSessionStartOptions
  ): Promise<string> {
    await this.ensureEntry(sessionId, startOptions);
    return sessionId;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    model?: string
  ): Promise<void> {
    await this.requireEntry(sessionId).runtime.prompt(content, model);
  }

  subscribe(sessionId: string, listener: (event: unknown) => void): () => void {
    const listeners = this.requireEntry(sessionId).listeners;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Stop semantics: cancel the in-flight turn and pending permissions, keep
  // the CLI session alive so the next message continues the conversation.
  async stopSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    entry.bridge.cancelAll();
    await entry.runtime.cancelTurn();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      return;
    }
    this.sessions.delete(sessionId);
    entry.bridge.cancelAll();
    await entry.runtime.close();
  }

  respondToInteraction(
    sessionId: string,
    decision: ProviderInteractionDecision
  ): void {
    this.requireEntry(sessionId).bridge.respond(decision);
  }

  private async ensureEntry(
    sessionId: string,
    startOptions: KimiNativeSessionStartOptions
  ): Promise<KimiNativeSessionEntry> {
    const existing = this.sessions.get(sessionId);
    if (existing?.runtime.isOpen) {
      return existing;
    }
    const listeners =
      existing?.listeners ?? new Set<(event: unknown) => void>();
    // One throwing consumer must not break delivery to the others or tear
    // down the native turn mid-batch (proven live: a Core-side listener
    // failure silenced the whole session).
    const broadcast = (event: unknown): void => {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch {
          // Listener failures are the consumer's concern; delivery goes on.
        }
      }
    };
    const bridge = new KimiInteractionBridge({ emit: broadcast });
    const runtime = new KimiNativeSessionRuntime({
      ...(startOptions.model ? { model: startOptions.model } : {}),
      onEvent: broadcast,
      onReverseRequest: (request) => bridge.handle(request),
      ...(this.options.processOverrides
        ? { processOverrides: this.options.processOverrides }
        : {}),
      providerSessionId: sessionId,
      workspacePath: startOptions.workspacePath,
    });
    const entry: KimiNativeSessionEntry = { bridge, listeners, runtime };
    this.sessions.set(sessionId, entry);
    try {
      await runtime.open();
    } catch (error) {
      this.sessions.delete(sessionId);
      await runtime.close().catch(() => undefined);
      throw error;
    }
    return entry;
  }

  private requireEntry(sessionId: string): KimiNativeSessionEntry {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      throw new Error(`Unknown Kimi native session: ${sessionId}`);
    }
    return entry;
  }
}

export const kimiNativeSessionDriver = new KimiNativeSessionDriver();
