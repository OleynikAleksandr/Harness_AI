import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import readline from "node:readline";
import { GrokAcpRouter, type GrokAcpRouterOptions } from "./grok-acp-router.js";

export interface GrokAcpProcessExit {
  readonly code: number | null;
  readonly expected: boolean;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
}

export interface GrokAcpProcessReporter {
  readonly error?: (message: string) => void;
  readonly info?: (message: string) => void;
  readonly warn?: (message: string) => void;
}

export interface GrokAcpProcessOptions {
  readonly binaryPath: string;
  readonly commandArgs?: readonly string[];
  readonly cwd: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly onExit?: (exit: GrokAcpProcessExit) => void;
  readonly onNotification?: GrokAcpRouterOptions["onNotification"];
  readonly onProtocolError?: GrokAcpRouterOptions["onProtocolError"];
  readonly onReverseRequest?: GrokAcpRouterOptions["onReverseRequest"];
  readonly reporter?: GrokAcpProcessReporter;
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly stderrLimitBytes?: number;
}

const DEFAULT_COMMAND_ARGS = [
  "--no-auto-update",
  "agent",
  "--no-leader",
  "stdio",
] as const;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 2000;
const DEFAULT_STDERR_LIMIT_BYTES = 16_384;

export class GrokAcpProcess {
  readonly #options: GrokAcpProcessOptions;
  readonly #router: GrokAcpRouter;
  #child: ChildProcessWithoutNullStreams | null = null;
  #expectedExit = false;
  #startPromise: Promise<void> | null = null;
  #stderr = "";
  #stdoutReader: readline.Interface | null = null;

  constructor(options: GrokAcpProcessOptions) {
    this.#options = options;
    this.#router = new GrokAcpRouter({
      onNotification: options.onNotification,
      onProtocolError: (error) => {
        options.onProtocolError?.(error);
        options.reporter?.warn?.(error.message);
      },
      onReverseRequest: options.onReverseRequest,
      requestTimeoutMs: options.requestTimeoutMs,
      sendLine: (line) => this.#writeLine(line),
    });
  }

  get isRunning(): boolean {
    return this.#child !== null;
  }

  get stderrSnapshot(): string {
    return this.#stderr;
  }

  async start(): Promise<void> {
    if (this.#child) {
      return;
    }
    if (this.#startPromise) {
      return await this.#startPromise;
    }
    this.#startPromise = this.#startInternal().finally(() => {
      this.#startPromise = null;
    });
    return await this.#startPromise;
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    options?: Parameters<GrokAcpRouter["request"]>[2]
  ): Promise<TResult> {
    await this.start();
    return await this.#router.request<TResult>(method, params, options);
  }

  async notify(method: string, params?: unknown): Promise<void> {
    await this.start();
    await this.#router.notify(method, params);
  }

  async stop(): Promise<void> {
    const child = this.#child;
    if (!child) {
      return;
    }
    this.#expectedExit = true;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        finish();
      }, this.#options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
      child.once("exit", finish);
      child.kill("SIGTERM");
    });
  }

  async #startInternal(): Promise<void> {
    this.#expectedExit = false;
    this.#stderr = "";
    const child = spawn(
      this.#options.binaryPath,
      [...(this.#options.commandArgs ?? DEFAULT_COMMAND_ARGS)],
      {
        cwd: this.#options.cwd,
        env: { ...process.env, ...this.#options.environment },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );
    this.#child = child;
    this.#attachHandlers(child);
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        child.off("spawn", onSpawn);
        reject(error);
      };
      const onSpawn = (): void => {
        child.off("error", onError);
        resolve();
      };
      child.once("error", onError);
      child.once("spawn", onSpawn);
    });
  }

  #attachHandlers(child: ChildProcessWithoutNullStreams): void {
    const stdoutReader = readline.createInterface({ input: child.stdout });
    this.#stdoutReader = stdoutReader;
    stdoutReader.on("line", (line) => {
      this.#router.handleLine(line);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      this.#appendStderr(chunk.toString("utf8"));
    });
    child.on("error", (error) => {
      this.#options.reporter?.error?.(
        `Grok ACP process error: ${error.message}`
      );
    });
    child.on("exit", (code, signal) => {
      const expected = this.#expectedExit;
      if (this.#child === child) {
        this.#child = null;
      }
      if (this.#stdoutReader === stdoutReader) {
        stdoutReader.close();
        this.#stdoutReader = null;
      }
      const reason = expected
        ? new Error("Grok ACP process stopped.")
        : new Error(
            code === null
              ? `Grok ACP process exited with signal ${signal ?? "unknown"}.`
              : `Grok ACP process exited with code ${code}.`
          );
      this.#router.rejectAll(reason);
      const exit = { code, expected, signal, stderr: this.#stderr };
      this.#options.onExit?.(exit);
      if (expected) {
        this.#options.reporter?.info?.("Grok ACP process stopped.");
      } else {
        this.#options.reporter?.error?.(reason.message);
      }
    });
  }

  #appendStderr(chunk: string): void {
    const limit = this.#options.stderrLimitBytes ?? DEFAULT_STDERR_LIMIT_BYTES;
    this.#stderr = `${this.#stderr}${chunk}`.slice(-limit);
  }

  async #writeLine(line: string): Promise<void> {
    const child = this.#child;
    if (!child || child.stdin.destroyed || !child.stdin.writable) {
      throw new Error("Grok ACP process is not running.");
    }
    await new Promise<void>((resolve, reject) => {
      child.stdin.write(line, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
