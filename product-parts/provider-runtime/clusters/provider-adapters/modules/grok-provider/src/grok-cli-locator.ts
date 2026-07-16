import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export interface GrokCliLocationOptions {
  readonly binaryPath?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly homeDirectory?: string;
  readonly platform?: NodeJS.Platform;
}

export interface GrokCliProbe {
  readonly authStatus: "login_required" | "ready" | "unknown";
  readonly binaryPath: string | null;
  readonly message: string;
  readonly status: "login_required" | "missing" | "ready" | "unavailable";
  readonly version: string | null;
}

const PROBE_TIMEOUT_MS = 15_000;
const LINE_BREAK_PATTERN = /\r?\n/u;
const LOGIN_REQUIRED_PATTERN =
  /no cached credentials|not authenticated|run [`']?grok login|unauthorized/iu;

export function resolveGrokCliCandidates(
  options: GrokCliLocationOptions = {}
): readonly string[] {
  const environment = options.environment ?? process.env;
  const homeDirectory = options.homeDirectory ?? homedir();
  const platform = options.platform ?? process.platform;
  const binaryName = platform === "win32" ? "grok.exe" : "grok";
  const candidates = [
    options.binaryPath,
    environment.GROK_HOME
      ? path.join(environment.GROK_HOME, "bin", binaryName)
      : undefined,
    path.join(homeDirectory, ".grok", "bin", binaryName),
    ...String(environment.PATH ?? "")
      .split(path.delimiter)
      .filter(Boolean)
      .map((entry) => path.join(entry, binaryName)),
  ];
  return [
    ...new Set(candidates.filter((value): value is string => Boolean(value))),
  ];
}

export async function locateGrokCli(
  options: GrokCliLocationOptions = {}
): Promise<string | null> {
  for (const candidate of resolveGrokCliCandidates(options)) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue through the deterministic candidate order.
    }
  }
  return null;
}

export async function probeGrokCli(
  options: GrokCliLocationOptions = {}
): Promise<GrokCliProbe> {
  const binaryPath = await locateGrokCli(options);
  if (!binaryPath) {
    return {
      authStatus: "unknown",
      binaryPath: null,
      message: "Grok CLI was not found.",
      status: "missing",
      version: null,
    };
  }
  const versionResult = await runGrok(binaryPath, ["--version"]);
  if (!versionResult.ok) {
    return {
      authStatus: "unknown",
      binaryPath,
      message: "Grok CLI could not report its version.",
      status: "unavailable",
      version: null,
    };
  }
  const version = firstNonEmptyLine(versionResult.stdout);
  const modelResult = await runGrok(binaryPath, ["--no-auto-update", "models"]);
  if (modelResult.ok) {
    return {
      authStatus: "ready",
      binaryPath,
      message: "Grok CLI and cached subscription authentication are ready.",
      status: "ready",
      version,
    };
  }
  if (isLoginRequired(modelResult.stderr)) {
    return {
      authStatus: "login_required",
      binaryPath,
      message: "Grok login is required. Run grok login once in Terminal.",
      status: "login_required",
      version,
    };
  }
  return {
    authStatus: "unknown",
    binaryPath,
    message: "Grok CLI is installed but its model catalog is unavailable.",
    status: "unavailable",
    version,
  };
}

function runGrok(
  binaryPath: string,
  args: readonly string[]
): Promise<{ ok: boolean; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    execFile(
      binaryPath,
      [...args],
      {
        encoding: "utf8",
        timeout: PROBE_TIMEOUT_MS,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: error === null,
          stderr: String(stderr ?? ""),
          stdout: String(stdout ?? ""),
        });
      }
    );
  });
}

function firstNonEmptyLine(value: string): string | null {
  return (
    value
      .split(LINE_BREAK_PATTERN)
      .map((line) => line.trim())
      .find(Boolean) ?? null
  );
}

function isLoginRequired(stderr: string): boolean {
  return LOGIN_REQUIRED_PATTERN.test(stderr);
}
