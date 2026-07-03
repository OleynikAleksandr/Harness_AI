import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Interactive pty runner for the native request capture. The claude binary
// assembles its system prompt and inline tool set BY ENTRY MODE (SDK
// stream-json transport -> SDK identity + 9 inline tools; `-p` print mode ->
// SDK identity + 26 tools; interactive TTY -> "You are Claude Code..." +
// the full inline tool set) and no SDK query option switches that mode, so
// the only way to record the ORIGINAL CLI wrapping is to drive the binary in
// a real pty: boot the interactive UI, type the probe, submit, then
// self-terminate on a timer (the capture orchestrator never kills the
// provider process — the proxy capture wins the race).
//
// The pty itself comes from the system python3 (`pty.fork`): `script(1)`
// does not deliver piped stdin to the pty on macOS and `expect` deadlocks
// without an active output drain, while python3 ships with the Xcode Command
// Line Tools on every developer machine this diagnostic feature targets.

const PYTHON_BINARY = "python3";
const PROBE_TYPE_WAIT_MS = 2000;
const DEFAULT_BOOT_WAIT_MS = 15_000;
const DEFAULT_POST_SUBMIT_WAIT_MS = 25_000;
const WATCHDOG_GRACE_MS = 20_000;
const STDERR_TAIL_LIMIT = 2000;

// Boots the pty, drains its output (an undrained pty blocks the Ink UI on
// write), types the probe, submits it and terminates the child. Timings
// arrive as seconds via argv; extra argv entries are passed to the binary.
const PYTHON_PTY_DRIVER = `
import os, pty, select, sys, time

binary = sys.argv[1]
probe = sys.argv[2]
boot_seconds = float(sys.argv[3])
post_submit_seconds = float(sys.argv[4])
extra_args = sys.argv[5:]

pid, master = pty.fork()
if pid == 0:
    os.execv(binary, [binary] + extra_args)

def pump(seconds):
    end = time.time() + seconds
    while time.time() < end:
        ready, _, _ = select.select([master], [], [], 0.25)
        if master in ready:
            try:
                if not os.read(master, 65536):
                    return
            except OSError:
                return

pump(boot_seconds)
os.write(master, probe.encode())
pump(${PROBE_TYPE_WAIT_MS / 1000})
os.write(master, b"\\r")
pump(post_submit_seconds)
try:
    os.kill(pid, 15)
except ProcessLookupError:
    pass
`;

export interface ClaudeInteractiveCliRunOptions {
  readonly binaryPath: string;
  readonly bootWaitMs?: number;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly modelId?: string | null;
  readonly postSubmitWaitMs?: number;
  readonly probePrompt: string;
  readonly workspacePath: string;
}

export interface ClaudeInteractiveCliRunResult {
  readonly exitCode: number | null;
}

// Pure helper (unit-tested): upserts the interactive-run prerequisites into
// the `.claude.json` raw content — onboarding completion and the trust-dialog
// acceptance for the probe workspace — preserving every other field. Returns
// null when nothing is missing: the provider-home `.claude.json` is a
// symlink to the USER's live Claude config (auth home-bridge), so the run
// must not rewrite it unless a prerequisite is actually absent.
export function upsertInteractiveTrustConfig(
  rawConfig: string | null,
  workspacePath: string
): string | null {
  let config: Record<string, unknown> = {};
  if (rawConfig) {
    try {
      const parsed: unknown = JSON.parse(rawConfig);
      if (typeof parsed === "object" && parsed !== null) {
        config = parsed as Record<string, unknown>;
      }
    } catch {
      // Unreadable config: rebuild the minimal interactive prerequisites.
    }
  }
  const projects =
    typeof config.projects === "object" && config.projects !== null
      ? (config.projects as Record<string, unknown>)
      : {};
  const project =
    typeof projects[workspacePath] === "object" &&
    projects[workspacePath] !== null
      ? (projects[workspacePath] as Record<string, unknown>)
      : {};
  if (
    config.hasCompletedOnboarding === true &&
    project.hasTrustDialogAccepted === true
  ) {
    return null;
  }
  config.hasCompletedOnboarding = true;
  project.hasTrustDialogAccepted = true;
  projects[workspacePath] = project;
  config.projects = projects;
  return JSON.stringify(config);
}

// Pure helper (unit-tested): argv for the python pty driver.
export function buildPtyDriverArgv(options: {
  readonly binaryPath: string;
  readonly bootWaitMs: number;
  readonly modelId?: string | null;
  readonly postSubmitWaitMs: number;
  readonly probePrompt: string;
}): readonly string[] {
  const extraArgs = options.modelId ? ["--model", options.modelId] : [];
  return [
    "-c",
    PYTHON_PTY_DRIVER,
    options.binaryPath,
    options.probePrompt,
    String(options.bootWaitMs / 1000),
    String(options.postSubmitWaitMs / 1000),
    ...extraArgs,
  ];
}

export async function runClaudeInteractiveCli(
  options: ClaudeInteractiveCliRunOptions
): Promise<ClaudeInteractiveCliRunResult> {
  const homePath = options.env.HOME;
  if (!homePath) {
    throw new Error(
      "claude_interactive_capture_home_missing: the auth environment must provide the provider HOME"
    );
  }
  await ensurePython3Available();
  await ensureInteractiveTrust(homePath, options.workspacePath);
  const bootWaitMs = options.bootWaitMs ?? DEFAULT_BOOT_WAIT_MS;
  const postSubmitWaitMs =
    options.postSubmitWaitMs ?? DEFAULT_POST_SUBMIT_WAIT_MS;
  const argv = buildPtyDriverArgv({
    binaryPath: options.binaryPath,
    bootWaitMs,
    modelId: options.modelId,
    postSubmitWaitMs,
    probePrompt: options.probePrompt,
  });
  return await new Promise<ClaudeInteractiveCliRunResult>((resolve, reject) => {
    const child = spawn(PYTHON_BINARY, argv, {
      cwd: options.workspacePath,
      env: { ...options.env, TERM: "xterm-256color" },
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderrTail = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString("utf8")).slice(
        -STDERR_TAIL_LIMIT
      );
    });
    // The driver self-terminates; the watchdog only covers a hung pty.
    const watchdog = setTimeout(
      () => child.kill("SIGKILL"),
      bootWaitMs + PROBE_TYPE_WAIT_MS + postSubmitWaitMs + WATCHDOG_GRACE_MS
    );
    child.on("error", (error) => {
      clearTimeout(watchdog);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(watchdog);
      if (code === 0 || code === null) {
        resolve({ exitCode: code });
        return;
      }
      reject(
        new Error(
          `claude_interactive_capture_driver_failed: exit ${code}${
            stderrTail ? `; stderr tail: ${stderrTail}` : ""
          }`
        )
      );
    });
  });
}

async function ensureInteractiveTrust(
  homePath: string,
  workspacePath: string
): Promise<void> {
  const configPath = path.join(homePath, ".claude.json");
  let raw: string | null = null;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    raw = null;
  }
  const updated = upsertInteractiveTrustConfig(raw, workspacePath);
  if (updated === null) {
    return;
  }
  await writeFile(configPath, updated, "utf8");
}

async function ensurePython3Available(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = spawn(PYTHON_BINARY, ["--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    probe.on("error", () => {
      reject(
        new Error(
          "claude_interactive_capture_python3_missing: the interactive pty driver needs the system python3 (install the Xcode Command Line Tools)"
        )
      );
    });
    probe.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          "claude_interactive_capture_python3_missing: the interactive pty driver needs the system python3 (install the Xcode Command Line Tools)"
        )
      );
    });
  });
}
