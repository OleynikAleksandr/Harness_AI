import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface, type Interface } from "node:readline";

interface KimiAcpClientOptions {
  readonly command: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly onDiagnostic?: (record: unknown) => void;
}

interface PendingRequest {
  readonly reject: (error: Error) => void;
  readonly resolve: (value: unknown) => void;
}

export interface KimiCaptureAcpClient {
  initialize(): Promise<void>;
  prompt(sessionId: string, prompt: string): Promise<void>;
  setModel(sessionId: string, model: string): Promise<void>;
  start(): Promise<void>;
  startSession(): Promise<string>;
  stop(): Promise<void>;
}

export class KimiAcpClient implements KimiCaptureAcpClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextRequestId = 1;
  private readonly options: KimiAcpClientOptions;
  private readonly pending = new Map<string, PendingRequest>();
  private stderrReader: Interface | null = null;
  private stdoutReader: Interface | null = null;

  constructor(options: KimiAcpClientOptions) {
    this.options = options;
  }

  start(): Promise<void> {
    if (this.child) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const child = spawn(this.options.command, ["acp"], {
        cwd: this.options.cwd,
        env: this.options.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;
      const rejectStartup = (error: Error): void => {
        this.cleanup();
        reject(new Error(`Kimi ACP process failed to start: ${error.message}`));
      };
      child.once("error", rejectStartup);
      child.once("spawn", () => {
        child.off("error", rejectStartup);
        this.attachReaders(child);
        resolve();
      });
      child.once("exit", (code, signal) => {
        const reason = `Kimi ACP process exited (${code ?? signal ?? "unknown"})`;
        this.rejectPending(new Error(reason));
        this.cleanup();
      });
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "harness-ai-capture", version: "0.0.1" },
      protocolVersion: 1,
    });
  }

  async startSession(): Promise<string> {
    const result = await this.request("session/new", {
      cwd: this.options.cwd,
      mcpServers: [],
    });
    if (typeof result === "object" && result !== null) {
      const sessionId = (result as Record<string, unknown>).sessionId;
      if (typeof sessionId === "string" && sessionId) {
        return sessionId;
      }
    }
    throw new Error("Kimi capture: session/new returned no sessionId");
  }

  async setModel(sessionId: string, model: string): Promise<void> {
    await this.request("session/set_config_option", {
      configId: "model",
      sessionId,
      value: model,
    });
  }

  async prompt(sessionId: string, prompt: string): Promise<void> {
    await this.request("session/prompt", {
      prompt: [{ text: prompt, type: "text" }],
      sessionId,
    });
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child || child.exitCode !== null) {
      this.cleanup();
      return;
    }
    await new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGKILL");
        }
      }, 1000);
      killTimer.unref();
      child.once("exit", () => {
        clearTimeout(killTimer);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const child = this.child;
    if (!child) {
      return Promise.reject(new Error("Kimi ACP process is not running"));
    }
    const id = String(this.nextRequestId);
    this.nextRequestId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      child.stdin.write(
        `${JSON.stringify({ id, jsonrpc: "2.0", method, params })}\n`
      );
    });
  }

  private attachReaders(child: ChildProcessWithoutNullStreams): void {
    this.stdoutReader = createInterface({ input: child.stdout });
    this.stderrReader = createInterface({ input: child.stderr });
    this.stdoutReader.on("line", (line) => this.handleLine(line));
    this.stderrReader.on("line", (line) => {
      this.options.onDiagnostic?.({
        bytes: Buffer.byteLength(line, "utf8"),
        kind: "stderr",
      });
    });
  }

  private handleLine(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      this.options.onDiagnostic?.({ kind: "malformed_stdout" });
      return;
    }
    if (!(typeof message === "object" && message !== null)) {
      return;
    }
    const frame = message as Record<string, unknown>;
    if ("id" in frame && ("result" in frame || "error" in frame)) {
      this.handleResponse(frame);
      return;
    }
    if (
      typeof frame.method === "string" &&
      (typeof frame.id === "string" || typeof frame.id === "number")
    ) {
      this.respondToAgentRequest(frame.id);
    }
  }

  private handleResponse(frame: Record<string, unknown>): void {
    const id = String(frame.id);
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    this.pending.delete(id);
    if (typeof frame.error === "object" && frame.error !== null) {
      const error = frame.error as Record<string, unknown>;
      pending.reject(
        new Error(
          typeof error.message === "string"
            ? error.message
            : "Kimi ACP request failed"
        )
      );
      return;
    }
    pending.resolve(frame.result);
  }

  private respondToAgentRequest(id: string | number): void {
    this.child?.stdin.write(
      `${JSON.stringify({ id, jsonrpc: "2.0", result: {} })}\n`
    );
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private cleanup(): void {
    this.stdoutReader?.close();
    this.stderrReader?.close();
    this.stdoutReader = null;
    this.stderrReader = null;
    this.child = null;
  }
}
