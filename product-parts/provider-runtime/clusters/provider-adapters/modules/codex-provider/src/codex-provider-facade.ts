import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import { providerEventNormalizerFacade } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderTurnOptions,
  ProviderUsageLimitsRefreshRequest,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { readCodexUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";

interface CodexProviderOptions {
  approvalPolicy?: string;
  codexCommand?: string;
  defaultModel?: string;
  sandbox?: string;
  workspacePath?: string;
}

interface JsonRpcResponse {
  error?: { message?: string };
  id?: string;
  result?: unknown;
}

interface CodexSessionState {
  activeTurnId: string | null;
  hasExactTokenUsageInTurn: boolean;
  listeners: Set<ProviderEventListener>;
  pendingInputTokens: number;
  workspacePath: string;
}

const CODEX_PATH_ENTRIES = [
  path.join(homedir(), ".npm-global", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
];
const CODEX_APP_SERVER_ARGS = [
  "app-server",
  "--disable",
  "multi_agent",
  "--disable",
  "computer_use",
  "--disable",
  "image_generation",
  "--disable",
  "plugins",
  "--disable",
  "apps",
];

export class CodexProviderFacade implements ProviderAdapter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly command: string;
  private readonly options: Required<
    Omit<CodexProviderOptions, "workspacePath">
  > &
    Pick<CodexProviderOptions, "workspacePath">;
  private readonly pendingRequests = new Map<
    string,
    { reject: (error: Error) => void; resolve: (value: unknown) => void }
  >();
  private requestCounter = 0;
  private readonly sessions = new Map<string, CodexSessionState>();
  private startPromise: Promise<void> | null = null;
  private stdoutReader: readline.Interface | null = null;

  constructor(options: CodexProviderOptions = {}) {
    this.command = options.codexCommand ?? "codex";
    const defaultModel =
      options.defaultModel && options.defaultModel !== "cli-default"
        ? options.defaultModel
        : (process.env.CODEX_MODEL ?? "gpt-5.4-mini");
    this.options = {
      approvalPolicy: options.approvalPolicy ?? "never",
      codexCommand: this.command,
      defaultModel,
      sandbox: options.sandbox ?? "danger-full-access",
      workspacePath: options.workspacePath,
    };
  }

  async initialize(): Promise<void> {
    await this.start();
  }

  async createSession(workspacePath?: string): Promise<string> {
    const cwd = workspacePath ?? this.options.workspacePath ?? process.cwd();
    const response = await this.request<Record<string, unknown>>(
      "thread/start",
      {
        approvalPolicy: this.options.approvalPolicy,
        cwd,
        model: this.options.defaultModel,
        persistExtendedHistory: true,
        sandbox: this.options.sandbox,
      }
    );
    const threadId = readThreadId(response);
    this.ensureSession(threadId, cwd);
    this.emit(threadId, {
      data: { model: this.options.defaultModel },
      timestamp: new Date().toISOString(),
      type: "system",
      uuid: `${threadId}::model`,
    });
    return threadId;
  }

  async resumeSession(
    sessionId: string,
    workspacePath?: string
  ): Promise<string> {
    const cwd = workspacePath ?? this.options.workspacePath ?? process.cwd();
    const response = await this.request<Record<string, unknown>>(
      "thread/resume",
      {
        approvalPolicy: this.options.approvalPolicy,
        cwd,
        model: this.options.defaultModel,
        persistExtendedHistory: true,
        sandbox: this.options.sandbox,
        threadId: sessionId,
      }
    );
    const threadId = readThreadId(response) ?? sessionId;
    this.ensureSession(threadId, cwd);
    return threadId;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void> {
    const state = this.ensureSession(sessionId);
    state.pendingInputTokens = estimateTokenCount(content);
    state.hasExactTokenUsageInTurn = false;
    const selectedModel = readModel(turnOptions, this.options.defaultModel);
    const reasoningEffort = readReasoningEffort(turnOptions);
    const response = await this.request<Record<string, unknown>>("turn/start", {
      cwd: state.workspacePath,
      ...(reasoningEffort ? { effort: reasoningEffort } : {}),
      input: [{ text: content, text_elements: [], type: "text" }],
      model: selectedModel,
      summary: readReasoningSummaryEnabled(turnOptions) ? "detailed" : "none",
      threadId: sessionId,
    });
    const turn = isRecord(response.turn) ? response.turn : null;
    const turnId = readString(turn?.id);
    if (turnId) {
      state.activeTurnId = turnId;
    }
  }

  subscribe(sessionId: string, listener: ProviderEventListener): () => void {
    const state = this.ensureSession(sessionId);
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (state?.activeTurnId) {
      await this.request("turn/interrupt", {
        threadId: sessionId,
        turnId: state.activeTurnId,
      }).catch(() => undefined);
    }
    this.sessions.delete(sessionId);
    if (this.sessions.size === 0) {
      this.stop();
    }
  }

  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const response = await this.request<Record<string, unknown>>(
      "account/rateLimits/read"
    ).catch(() => null);
    const event = readCodexUsageLimits(response?.rateLimits);
    if (event) {
      request.broadcast(event);
    }
  }

  private async start(): Promise<void> {
    if (this.child) {
      return;
    }
    if (!this.startPromise) {
      this.startPromise = this.startInternal().finally(() => {
        this.startPromise = null;
      });
    }
    await this.startPromise;
  }

  private async startInternal(): Promise<void> {
    const home = await providerHomeManagerFacade.prepareCodexHome({
      providerId: "codex",
      workspacePath: this.options.workspacePath,
    });
    const child = spawn(this.command, CODEX_APP_SERVER_ARGS, {
      env: {
        ...process.env,
        CODEX_HOME: home.homePath,
        PATH: buildPath(process.env.PATH),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    this.attachProcessHandlers(child);
    await this.request("initialize", {
      capabilities: { experimentalApi: true },
      clientInfo: { name: "Harness AI", version: "0.0.0" },
    });
  }

  private attachProcessHandlers(child: ChildProcessWithoutNullStreams): void {
    const stdout = readline.createInterface({ input: child.stdout });
    this.stdoutReader = stdout;
    stdout.on("line", (line) => this.handleStdoutLine(line));
    child.on("exit", () => {
      if (this.child === child) {
        this.child = null;
      }
      this.stdoutReader?.close();
      this.stdoutReader = null;
      for (const pending of this.pendingRequests.values()) {
        pending.reject(new Error("codex app-server exited"));
      }
      this.pendingRequests.clear();
    });
  }

  private async request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult> {
    if (!this.child && method !== "initialize") {
      await this.start();
    }
    const child = this.child;
    if (!child) {
      throw new Error("codex app-server is not running");
    }
    const id = `harness-codex-${++this.requestCounter}`;
    const payload =
      params === undefined ? { id, method } : { id, method, params };
    return await new Promise<TResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        reject,
        resolve: (value) => resolve(value as TResult),
      });
      child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) {
          return;
        }
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private handleStdoutLine(line: string): void {
    if (!line.trim()) {
      return;
    }
    const parsed = JSON.parse(line) as JsonRpcResponse & {
      method?: string;
      params?: unknown;
    };
    if (parsed.id) {
      const pending = this.pendingRequests.get(parsed.id);
      if (!pending) {
        return;
      }
      this.pendingRequests.delete(parsed.id);
      if (parsed.error) {
        pending.reject(
          new Error(parsed.error.message ?? "Codex request failed")
        );
        return;
      }
      pending.resolve(parsed.result);
      return;
    }
    if (parsed.method) {
      this.handleNotification(parsed.method, parsed.params);
    }
  }

  private handleNotification(method: string, params: unknown): void {
    const threadId = isRecord(params) ? readString(params.threadId) : null;
    if (!threadId) {
      return;
    }
    const state = this.ensureSession(threadId);
    for (const event of providerEventNormalizerFacade.normalizeCodexNotification(
      method,
      params
    )) {
      if (event.type === "turn_started") {
        state.activeTurnId = null;
        state.hasExactTokenUsageInTurn = false;
      }
      if (isTokenUsageEvent(event)) {
        state.hasExactTokenUsageInTurn = true;
      }
      if (event.type === "dialog_message" && !state.hasExactTokenUsageInTurn) {
        this.emit(
          threadId,
          tokenUsageEvent(
            state.pendingInputTokens + estimateTokenCount(event.content)
          )
        );
      }
      if (event.type === "turn_completed" || event.type === "turn_failed") {
        state.activeTurnId = null;
        state.pendingInputTokens = 0;
      }
      this.emit(threadId, event);
    }
  }

  private ensureSession(
    sessionId: string,
    workspacePath = this.options.workspacePath ?? process.cwd()
  ): CodexSessionState {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }
    const state = {
      activeTurnId: null,
      hasExactTokenUsageInTurn: false,
      listeners: new Set<ProviderEventListener>(),
      pendingInputTokens: 0,
      workspacePath,
    };
    this.sessions.set(sessionId, state);
    return state;
  }

  private emit(sessionId: string, event: unknown): void {
    const state = this.sessions.get(sessionId);
    for (const listener of state?.listeners ?? []) {
      listener(event);
    }
  }

  private stop(): void {
    const child = this.child;
    if (!child) {
      return;
    }
    this.child = null;
    child.kill("SIGTERM");
  }
}

function buildPath(basePath = ""): string {
  const parts = new Set(basePath.split(path.delimiter).filter(Boolean));
  for (const candidate of CODEX_PATH_ENTRIES) {
    parts.add(candidate);
  }
  return Array.from(parts).join(path.delimiter);
}

function readModel(
  turnOptions: ProviderTurnOptions | undefined,
  fallback: string
): string {
  return typeof turnOptions?.model === "string" ? turnOptions.model : fallback;
}

function readReasoningEffort(
  turnOptions: ProviderTurnOptions | undefined
): string | null {
  return typeof turnOptions?.reasoningEffort === "string"
    ? turnOptions.reasoningEffort
    : null;
}

function readReasoningSummaryEnabled(
  turnOptions: ProviderTurnOptions | undefined
): boolean {
  return turnOptions?.reasoningSummaryEnabled !== false;
}

function readThreadId(response: Record<string, unknown>): string {
  const thread = isRecord(response.thread) ? response.thread : null;
  const id = readString(thread?.id);
  if (!id) {
    throw new Error("codex app-server response did not include thread id");
  }
  return id;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenUsageEvent(used: number): unknown {
  return {
    data: { kind: "token_usage", tokenUsage: { used } },
    timestamp: new Date().toISOString(),
    type: "stream_event",
    uuid: `${globalThis.crypto.randomUUID()}::token_usage_fallback`,
  };
}

function isTokenUsageEvent(value: unknown): boolean {
  const event = isRecord(value) ? value : null;
  const data = isRecord(event?.data) ? event.data : null;
  return event?.type === "stream_event" && data?.kind === "token_usage";
}

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export const codexProviderFacade = new CodexProviderFacade();
