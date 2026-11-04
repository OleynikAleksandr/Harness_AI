import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

// A GUI app started from Finder inherits a minimal PATH without Homebrew or
// user tool directories. Core reads the PATH of the user's login shell once
// at start so provider processes and Kit commands find node, git, etc.
const DEFAULT_TIMEOUT_MS = 3000;
const MAX_OUTPUT_CHARS = 262_144;
const MARKER = "__HARNESS_LOGIN_PATH_5c2e9a__";
const PRINT_PATH_COMMAND = `printf '%s%s%s' '${MARKER}' "$PATH" '${MARKER}'`;
const DARWIN_WELL_KNOWN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin"];

/** Raw output of one login shell run; `error` is null when it exited. */
interface LoginShellResult {
  readonly error: string | null;
  readonly stdout: string;
}

type LoginShellRunner = (
  shell: string,
  args: readonly string[],
  timeoutMs: number
) => Promise<LoginShellResult>;

interface LoginPathOptions {
  readonly directoryExists?: (directory: string) => boolean;
  readonly env?: NodeJS.ProcessEnv;
  readonly log?: (line: string) => void;
  readonly platform?: NodeJS.Platform;
  readonly run?: LoginShellRunner;
  readonly timeoutMs?: number;
}

interface LoginPathOutcome {
  /** The resulting PATH (unchanged when skipped). */
  readonly path: string | undefined;
  /** `merged`: login PATH applied; `fallback`: shell failed; `skipped`: Windows. */
  readonly status: "fallback" | "merged" | "skipped";
}

function runLoginShell(
  shell: string,
  args: readonly string[],
  timeoutMs: number
): Promise<LoginShellResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    const finish = (result: LoginShellResult): void => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };
    // Detached: the shell gets its own session without a controlling
    // terminal, and a timeout can kill everything its rc files started.
    const child = spawn(shell, [...args], {
      detached: true,
      env: process.env,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const timer = setTimeout(() => {
      try {
        if (child.pid === undefined) {
          child.kill("SIGKILL");
        } else {
          process.kill(-child.pid, "SIGKILL");
        }
      } catch {
        child.kill("SIGKILL");
      }
      finish({ error: `timed out after ${timeoutMs} ms`, stdout });
    }, timeoutMs);
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      if (stdout.length < MAX_OUTPUT_CHARS) {
        stdout += chunk;
      }
    });
    child.on("error", (error) => finish({ error: error.message, stdout }));
    child.on("close", () => finish({ error: null, stdout }));
  });
}

/** The PATH printed between the two markers, ignoring banners and rc noise. */
function extractMarkedPath(stdout: string): string | null {
  const start = stdout.indexOf(MARKER);
  if (start < 0) {
    return null;
  }
  const valueStart = start + MARKER.length;
  const end = stdout.indexOf(MARKER, valueStart);
  if (end < 0) {
    return null;
  }
  const value = stdout.slice(valueStart, end).trim();
  return value.length > 0 ? value : null;
}

function splitPath(value: string | undefined): string[] {
  return (value ?? "").split(":").filter((entry) => entry.length > 0);
}

/** Login entries first, then inherited and extra entries not yet present. */
function mergePathEntries(...groups: string[][]): string {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const entry of groups.flat()) {
    if (!seen.has(entry)) {
      seen.add(entry);
      merged.push(entry);
    }
  }
  return merged.join(":");
}

function defaultShell(env: NodeJS.ProcessEnv, platform: NodeJS.Platform) {
  const configured = env.SHELL?.trim();
  if (configured) {
    return configured;
  }
  return platform === "darwin" ? "/bin/zsh" : "/bin/bash";
}

/**
 * Merges the user's login shell PATH into `env.PATH` (process.env by
 * default) once at Core start. Never rejects: a failed or slow shell keeps
 * the inherited PATH and logs one diagnostic line. Windows is skipped.
 */
export async function applyLoginShellPath(
  options: LoginPathOptions = {}
): Promise<LoginPathOutcome> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    return { path: env.PATH, status: "skipped" };
  }
  const run = options.run ?? runLoginShell;
  const directoryExists = options.directoryExists ?? existsSync;
  const log = options.log ?? ((line: string) => console.error(line));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const shell = defaultShell(env, platform);

  let loginPath: string | null = null;
  let reason = "no PATH between the markers";
  try {
    const result = await run(shell, ["-ilc", PRINT_PATH_COMMAND], timeoutMs);
    loginPath = extractMarkedPath(result.stdout);
    reason = result.error ?? reason;
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }

  const wellKnown =
    platform === "darwin"
      ? DARWIN_WELL_KNOWN_DIRS.filter((directory) => directoryExists(directory))
      : [];
  const path = mergePathEntries(
    splitPath(loginPath ?? undefined),
    splitPath(env.PATH),
    wellKnown
  );
  if (path.length > 0) {
    env.PATH = path;
  }
  if (loginPath === null) {
    log(
      `Harness AI Core: login shell PATH unavailable from ${shell} (${reason}); keeping the inherited PATH`
    );
    return { path, status: "fallback" };
  }
  return { path, status: "merged" };
}
