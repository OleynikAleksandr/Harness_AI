import { randomUUID } from "node:crypto";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import {
  isKimiAcpRecord,
  type KimiAcpNotification,
  type KimiAcpReverseRequestHandler,
} from "./kimi-acp-session-contracts.js";
import {
  KimiAcpSessionProcess,
  type KimiAcpSessionProcessExit,
  type KimiAcpSessionProcessOptions,
} from "./kimi-acp-session-process.js";
import {
  type KimiNativeSessionEvent,
  KimiSessionEventNormalizer,
} from "./kimi-session-event-normalizer.js";
import {
  type KimiSessionTokenUsage,
  readKimiSessionTokenUsage,
} from "./kimi-session-usage-reader.js";

export interface KimiNativeSessionRuntimeOptions {
  readonly model?: string;
  readonly onEvent: (event: KimiNativeSessionEvent) => void;
  readonly onReverseRequest?: KimiAcpReverseRequestHandler;
  // Test/DI overrides for the supervised child (command, args, timeouts).
  readonly processOverrides?: Partial<KimiAcpSessionProcessOptions>;
  // The Core-visible provider session id; parents synthesized subagents.
  readonly providerSessionId?: string;
  // Test/DI override for the session-store usage reader.
  readonly usageReader?: (acpSessionId: string) => KimiSessionTokenUsage | null;
  readonly workspacePath: string;
}

const HANDSHAKE_TIMEOUT_MS = 30_000;
// A native turn can legitimately run for many minutes of agentic work; the
// prompt request must not fall into the default wire timeout.
const PROMPT_TIMEOUT_MS = 30 * 60_000;

// One immutable binding: one runtime = one `kimi acp` child = one native CLI
// session with the default agent and the user's real provider home. The
// model is selected once at open (`session/set_config_option`); the native
// system prompt and tool inventory stay untouched — that is the point of the
// native profile path.
export class KimiNativeSessionRuntime {
  private acpSessionId: string | null = null;
  private appliedModel: string | null = null;
  private readonly channel: KimiAcpSessionProcess;
  private readonly normalizer = new KimiSessionEventNormalizer();
  private readonly options: KimiNativeSessionRuntimeOptions;
  private turnActive = false;

  constructor(options: KimiNativeSessionRuntimeOptions) {
    this.options = options;
    if (options.providerSessionId) {
      this.normalizer.bindParentSession(options.providerSessionId);
    }
    this.channel = new KimiAcpSessionProcess({
      cwd: options.workspacePath,
      onExit: (exit) => this.handleExit(exit),
      onNotification: (notification) => this.handleNotification(notification),
      onProtocolError: (error) =>
        this.emit(streamDiagnostic("kimi_protocol_error", error.message)),
      ...(options.onReverseRequest
        ? { onReverseRequest: options.onReverseRequest }
        : {}),
      ...options.processOverrides,
    });
  }

  get isOpen(): boolean {
    return this.acpSessionId !== null && this.channel.isRunning;
  }

  async open(): Promise<string> {
    if (this.acpSessionId) {
      return this.acpSessionId;
    }
    await this.channel.request(
      "initialize",
      {
        clientCapabilities: {
          fs: { readTextFile: false, writeTextFile: false },
          terminal: false,
        },
        clientInfo: { name: "harness-ai", version: "0.0.1" },
        protocolVersion: 1,
      },
      { timeoutMs: HANDSHAKE_TIMEOUT_MS }
    );
    const created = await this.channel.request<Record<string, unknown>>(
      "session/new",
      { cwd: this.options.workspacePath, mcpServers: [] },
      { timeoutMs: HANDSHAKE_TIMEOUT_MS }
    );
    const sessionId =
      isKimiAcpRecord(created) && typeof created.sessionId === "string"
        ? created.sessionId
        : null;
    if (!sessionId) {
      throw new Error("Kimi ACP session/new returned no sessionId");
    }
    this.acpSessionId = sessionId;
    if (this.options.model) {
      await this.applyModel(this.options.model);
    }
    return sessionId;
  }

  async prompt(text: string, model?: string): Promise<void> {
    const sessionId = await this.open();
    if (model) {
      // The Core session model arrives with the turn; select it before the
      // prompt when it differs from what the CLI session already applied.
      await this.applyModel(model);
    }
    this.turnActive = true;
    this.emit(lifecycleEvent("turn_started"));
    try {
      const result = await this.channel.request<Record<string, unknown>>(
        "session/prompt",
        { prompt: [{ text, type: "text" }], sessionId },
        { timeoutMs: PROMPT_TIMEOUT_MS }
      );
      for (const event of this.normalizer.flushTurnEnd()) {
        this.emit(event);
      }
      this.emitTurnTokenUsage(sessionId);
      const stopReason =
        isKimiAcpRecord(result) && typeof result.stopReason === "string"
          ? result.stopReason
          : null;
      this.emit(lifecycleEvent("turn_completed", stopReason ?? undefined));
    } catch (error) {
      for (const event of this.normalizer.flushTurnEnd()) {
        this.emit(event);
      }
      this.emitTurnTokenUsage(sessionId);
      this.emit(
        lifecycleEvent(
          "turn_failed",
          error instanceof Error ? error.message : String(error)
        )
      );
    } finally {
      this.turnActive = false;
    }
  }

  // The CLI streams no usage_update; after every turn the session-store
  // truth (latest usage.record of the main agent) feeds the status panel.
  private emitTurnTokenUsage(acpSessionId: string): void {
    const usage = (this.options.usageReader ?? readKimiSessionTokenUsage)(
      acpSessionId
    );
    if (!usage) {
      return;
    }
    this.emit({
      data: { kind: "token_usage", tokenUsage: usage },
      timestamp: nowIso(),
      type: "stream_event",
      uuid: `${randomUUID()}::token_usage`,
    });
  }

  // Stop semantics: cancel the in-flight turn but keep the CLI session
  // alive so the next message continues the same native conversation.
  async cancelTurn(): Promise<void> {
    if (!(this.acpSessionId && this.turnActive)) {
      return;
    }
    await this.channel
      .notify("session/cancel", { sessionId: this.acpSessionId })
      .catch(() => undefined);
  }

  async close(): Promise<void> {
    this.acpSessionId = null;
    await this.channel.stop();
  }

  // Model selection is the only config the Kimi ACP surface accepts; a
  // refusal must not kill the native session. The requested value is
  // remembered either way so a rejecting CLI is not re-asked every turn.
  private async applyModel(model: string): Promise<void> {
    if (!this.acpSessionId || model === this.appliedModel) {
      return;
    }
    this.appliedModel = model;
    await this.channel
      .request("session/set_config_option", {
        configId: "model",
        sessionId: this.acpSessionId,
        value: model,
      })
      .catch((error: Error) => {
        this.emit(
          streamDiagnostic("kimi_model_selection_failed", error.message)
        );
      });
  }

  private handleNotification(notification: KimiAcpNotification): void {
    if (!this.matchesSession(notification)) {
      return;
    }
    for (const event of this.normalizer.normalizeNotification(notification)) {
      this.emit(event);
    }
  }

  private matchesSession(notification: KimiAcpNotification): boolean {
    if (!isKimiAcpRecord(notification.params)) {
      return true;
    }
    const sessionId = notification.params.sessionId;
    return (
      typeof sessionId !== "string" ||
      this.acpSessionId === null ||
      sessionId === this.acpSessionId
    );
  }

  private handleExit(exit: KimiAcpSessionProcessExit): void {
    this.acpSessionId = null;
    if (exit.expected) {
      return;
    }
    this.emit({
      message: `Kimi CLI exited unexpectedly (${
        exit.code === null
          ? `signal ${exit.signal ?? "unknown"}`
          : `code ${exit.code}`
      }).`,
      timestamp: nowIso(),
      type: "stream_error",
      uuid: randomUUID(),
    });
  }

  private emit(event: KimiNativeSessionEvent): void {
    this.options.onEvent(event);
  }
}

function lifecycleEvent(
  type: "turn_completed" | "turn_failed" | "turn_started",
  message?: string
): NormalizedProviderEvent {
  return {
    ...(message ? { message } : {}),
    timestamp: nowIso(),
    type,
    uuid: randomUUID(),
  };
}

function streamDiagnostic(
  kind: string,
  message: string
): NormalizedProviderEvent {
  return {
    data: { kind, message },
    timestamp: nowIso(),
    type: "stream_event",
    uuid: `${randomUUID()}::${kind}`,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}
