import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface, type Interface } from "node:readline";
import { withRealGitConfig } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { KimiAcpChannelClosedError } from "./kimi-acp-session-contracts.js";
import {
  type KimiAcpRequestOptions,
  KimiAcpSessionRouter,
  type KimiAcpSessionRouterOptions,
} from "./kimi-acp-session-router.js";

export interface KimiAcpSessionProcessExit {
  readonly code: number | null;
  readonly expected: boolean;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
}

export interface KimiAcpSessionProcessOptions {
  readonly command?: string;
  readonly commandArgs?: readonly string[];
  readonly cwd: string;
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly onExit?: (exit: KimiAcpSessionProcessExit) => void;
  readonly onNotification?: KimiAcpSessionRouterOptions["onNotification"];
  readonly onProtocolError?: KimiAcpSessionRouterOptions["onProtocolError"];
  readonly onReverseRequest?: KimiAcpSessionRouterOptions["onReverseRequest"];
  readonly requestTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
}

const KIMI_CONFIG_DIRNAME = ".kimi-code";
const DEFAULT_COMMAND_ARGS = ["acp"] as const;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 2000;
const STDERR_KEEP_BYTES = 16_384;

// The session channel launches the CLI the user actually has: the standalone
// install under ~/.kimi-code/bin (PATH fallback), against the REAL provider
// home — no cloned HOME and no base-URL rewrite (both stay capture-only).
export function resolveKimiSessionCommand(): string {
  const userInstall = path.join(homedir(), KIMI_CONFIG_DIRNAME, "bin", "kimi");
  return existsSync(userInstall) ? userInstall : "kimi";
}

// One supervised `kimi acp` child per native session: stdio JSON-RPC framing
// through the router, bounded stderr snapshot for diagnostics, and an
// expected/unexpected exit signal that rejects every pending request. The
// CLI's self-update is pinned off for the child's lifetime so the binary
// cannot swap mid-session.
export class KimiAcpSessionProcess {
  private child: ChildProcessWithoutNullStreams | null = null;
  private expectedExit = false;
  private readonly options: KimiAcpSessionProcessOptions;
  private readonly router: KimiAcpSessionRouter;
  private starting: Promise<void> | null = null;
  private stderrTail = "";
  private stdoutReader: Interface | null = null;

  constructor(options: KimiAcpSessionProcessOptions) {
    this.options = options;
    this.router = new KimiAcpSessionRouter({
      onNotification: options.onNotification,
      onProtocolError: options.onProtocolError,
      onReverseRequest: options.onReverseRequest,
      requestTimeoutMs: options.requestTimeoutMs,
      sendLine: (line) => this.writeLine(line),
    });
  }

  get isRunning(): boolean {
    return this.child !== null;
  }

  get stderrSnapshot(): string {
    return this.stderrTail;
  }

  async start(): Promise<void> {
    if (this.child) {
      return;
    }
    this.starting ??= this.spawnChild().finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    options?: KimiAcpRequestOptions
  ): Promise<TResult> {
    await this.start();
    return await this.router.request<TResult>(method, params, options);
  }

  async notify(method: string, params?: unknown): Promise<void> {
    await this.start();
    await this.router.notify(method, params);
  }

  async stop(): Promise<void> {
    const child = this.child;
    if (!child) {
      return;
    }
    this.expectedExit = true;
    await new Promise<void>((resolve) => {
      const killTimeout = setTimeout(() => {
        child.kill("SIGKILL");
      }, this.options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
      child.once("exit", () => {
        clearTimeout(killTimeout);
        resolve();
      });
      child.kill("SIGTERM");
    });
  }

  private async spawnChild(): Promise<void> {
    this.expectedExit = false;
    this.stderrTail = "";
    const child = spawn(
      this.options.command ?? resolveKimiSessionCommand(),
      [...(this.options.commandArgs ?? DEFAULT_COMMAND_ARGS)],
      {
        cwd: this.options.cwd,
        // A provider HOME hides the user's ~/.gitconfig; point git at it.
        env: withRealGitConfig({
          ...process.env,
          ...this.options.environment,
          KIMI_CLI_NO_AUTO_UPDATE: "1",
        }),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );
    this.child = child;
    this.watchChild(child);
    await new Promise<void>((resolve, reject) => {
      const onSpawnError = (error: Error): void => {
        if (this.child === child) {
          this.child = null;
        }
        reject(error);
      };
      child.once("error", onSpawnError);
      child.once("spawn", () => {
        child.off("error", onSpawnError);
        resolve();
      });
    });
  }

  private watchChild(child: ChildProcessWithoutNullStreams): void {
    const reader = createInterface({ input: child.stdout });
    this.stdoutReader = reader;
    reader.on("line", (line) => this.router.handleLine(line));
    child.stderr.on("data", (chunk: Buffer) => {
      this.stderrTail = `${this.stderrTail}${chunk.toString("utf8")}`.slice(
        -STDERR_KEEP_BYTES
      );
    });
    child.on("exit", (code, signal) => {
      const expected = this.expectedExit;
      if (this.child === child) {
        this.child = null;
      }
      if (this.stdoutReader === reader) {
        reader.close();
        this.stdoutReader = null;
      }
      this.router.rejectAll(
        new KimiAcpChannelClosedError(
          expected
            ? "stopped by Harness"
            : `Kimi CLI exited with ${code === null ? `signal ${signal ?? "unknown"}` : `code ${code}`}`
        )
      );
      this.options.onExit?.({
        code,
        expected,
        signal,
        stderr: this.stderrTail,
      });
    });
  }

  private async writeLine(line: string): Promise<void> {
    const child = this.child;
    if (!child || child.stdin.destroyed || !child.stdin.writable) {
      throw new KimiAcpChannelClosedError("stdin is not writable");
    }
    await new Promise<void>((resolve, reject) => {
      child.stdin.write(line, (error) => (error ? reject(error) : resolve()));
    });
  }
}
