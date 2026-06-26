import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderTurnOptions,
} from "./provider-adapter-contract-facade.js";

interface SessionState {
  listeners: Set<ProviderEventListener>;
  messages: Array<{ content: string; role: "assistant" | "user" }>;
  workspacePath?: string;
}

export interface CliProviderAdapterOptions {
  args: (prompt: string, model?: string) => string[];
  commands: string[];
  model?: string;
  timeoutMs?: number;
}

export interface OpenAiCompatibleAdapterOptions {
  apiKey?: string | null;
  baseUrl: string;
  model: string;
}

const DEFAULT_CLI_TIMEOUT_MS = 180_000;
const TRAILING_SLASHES_REGEX = /\/+$/u;
const PATH_ENTRIES = [
  path.join(homedir(), ".npm-global", "bin"),
  path.join(homedir(), ".local", "bin"),
  path.join(homedir(), ".kimi-code", "bin"),
  path.join(homedir(), ".opencode", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];

class SessionProviderAdapterBase {
  protected readonly sessions = new Map<string, SessionState>();

  closeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    return Promise.resolve();
  }

  createSession(workspacePath?: string): Promise<string> {
    const sessionId = `provider-${randomUUID()}`;
    this.sessions.set(sessionId, {
      listeners: new Set(),
      messages: [],
      workspacePath,
    });
    return Promise.resolve(sessionId);
  }

  subscribe(sessionId: string, listener: ProviderEventListener): () => void {
    const session = this.ensureSession(sessionId);
    session.listeners.add(listener);
    return () => {
      session.listeners.delete(listener);
    };
  }

  protected emit(sessionId: string, event: unknown): void {
    for (const listener of this.ensureSession(sessionId).listeners) {
      listener(event);
    }
  }

  protected ensureSession(sessionId: string): SessionState {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }
    const session = {
      listeners: new Set<ProviderEventListener>(),
      messages: [],
    };
    this.sessions.set(sessionId, session);
    return session;
  }
}

export class CliSessionProviderAdapter
  extends SessionProviderAdapterBase
  implements ProviderAdapter
{
  private readonly options: CliProviderAdapterOptions;

  constructor(options: CliProviderAdapterOptions) {
    super();
    this.options = options;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void> {
    const session = this.ensureSession(sessionId);
    const prompt = buildPrompt(session.messages, content);
    this.emit(sessionId, event("turn_started"));
    try {
      const text = await runCli({
        args: this.options.args(
          prompt,
          readModel(turnOptions, this.options.model)
        ),
        commands: this.options.commands,
        timeoutMs: this.options.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS,
      });
      session.messages.push({ role: "user", content });
      session.messages.push({ role: "assistant", content: text });
      this.emit(sessionId, dialogMessage(text));
      this.emit(sessionId, event("turn_completed"));
    } catch (error) {
      const message = stringifyError(error);
      this.emit(sessionId, event("turn_failed", message));
      throw error;
    }
  }
}

export class OpenAiCompatibleSessionProviderAdapter
  extends SessionProviderAdapterBase
  implements ProviderAdapter
{
  private readonly options: OpenAiCompatibleAdapterOptions;

  constructor(options: OpenAiCompatibleAdapterOptions) {
    super();
    this.options = options;
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = this.ensureSession(sessionId);
    this.emit(sessionId, event("turn_started"));
    try {
      const messages = [
        ...session.messages,
        { role: "user" as const, content },
      ];
      const response = await fetch(chatUrl(this.options.baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.options.apiKey
            ? { Authorization: `Bearer ${this.options.apiKey}` }
            : {}),
        },
        body: JSON.stringify({ model: this.options.model, messages }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      const text = extractOpenAiText(await response.json());
      session.messages.push({ role: "user", content });
      session.messages.push({ role: "assistant", content: text });
      this.emit(sessionId, dialogMessage(text));
      this.emit(sessionId, event("turn_completed"));
    } catch (error) {
      const message = stringifyError(error);
      this.emit(sessionId, event("turn_failed", message));
      throw error;
    }
  }
}

function runCli(options: {
  args: string[];
  commands: string[];
  timeoutMs: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    let index = 0;
    const tryNext = () => {
      const command = options.commands[index++];
      if (!command) {
        reject(new Error("Provider CLI is not available"));
        return;
      }
      const child = spawn(command, options.args, {
        env: { ...process.env, PATH: buildPath(process.env.PATH ?? "") },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(
        () => child.kill("SIGTERM"),
        options.timeoutMs
      );
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", tryNext);
      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          const text = (stdout || stderr).trim();
          text
            ? resolve(text)
            : reject(new Error("Provider returned empty output"));
          return;
        }
        reject(
          new Error((stderr || `Provider exited with code ${code}`).trim())
        );
      });
    };
    tryNext();
  });
}

function buildPrompt(
  history: Array<{ content: string; role: "assistant" | "user" }>,
  content: string
): string {
  if (history.length === 0) {
    return content;
  }
  return [
    ...history.map((message) => `${message.role}: ${message.content}`),
    `user: ${content}`,
    "assistant:",
  ].join("\n\n");
}

function buildPath(basePath: string): string {
  return [
    ...new Set([
      ...basePath.split(path.delimiter).filter(Boolean),
      ...PATH_ENTRIES,
    ]),
  ].join(path.delimiter);
}

function chatUrl(baseUrl: string): string {
  return `${baseUrl.replace(TRAILING_SLASHES_REGEX, "")}/chat/completions`;
}

function dialogMessage(content: string): unknown {
  return {
    content,
    role: "assistant",
    timestamp: new Date().toISOString(),
    type: "dialog_message",
    uuid: randomUUID(),
  };
}

function event(type: string, message?: string): unknown {
  return {
    ...(message ? { message } : {}),
    timestamp: new Date().toISOString(),
    type,
    uuid: randomUUID(),
  };
}

function extractOpenAiText(value: unknown): string {
  if (!(isRecord(value) && Array.isArray(value.choices))) {
    throw new Error("Provider response does not contain choices");
  }
  const first = value.choices[0];
  const message =
    isRecord(first) && isRecord(first.message) ? first.message : null;
  const content =
    typeof message?.content === "string" ? message.content.trim() : "";
  if (!content) {
    throw new Error("Provider returned empty response");
  }
  return content;
}

function readModel(
  turnOptions: ProviderTurnOptions | undefined,
  fallback?: string
): string | undefined {
  return typeof turnOptions?.model === "string" ? turnOptions.model : fallback;
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
