import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runNpmCommand } from "./reference/installer/npm-runner.js";

// Claude runs like Codex (user decision 2026-11-03): sessions and the live
// model catalog use the user's global npm Claude Agent SDK (`npm prefix -g`),
// one shared install updated once, while session data stays in the Harness
// provider homes. The SDK's bundled CLI decides what the `opus`/`fable`/
// `sonnet`/`haiku` aliases mean and the `supportedModels()` labels, so
// keeping model labels current means updating this install.

const PACKAGE_NAME = "@anthropic-ai/claude-agent-sdk";
const NPM_EXECUTABLE = process.platform === "win32" ? "npm.cmd" : "npm";
const NPM_PREFIX_TIMEOUT_MS = 15_000;
// macOS GUI apps start without the shell PATH; same candidates as the npm
// runner.
const GUI_NPM_PATHS =
  process.platform === "darwin"
    ? ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"]
    : [];

type NpmRunner = (
  args: readonly string[],
  env: NodeJS.ProcessEnv
) => Promise<unknown>;

interface ClaudeSdkUpdateOverrides {
  readonly prefix?: string;
  readonly runNpm?: NpmRunner;
}

let resolvedPrefix: string | null = null;

// The global npm prefix (`npm prefix -g`, honouring the user's `.npmrc` and
// `npm_config_prefix`), resolved once per process. When npm cannot answer
// there is no global SDK to run: the call throws and the next call asks npm
// again.
export function claudeSdkPrefix(): string {
  resolvedPrefix ??= readGlobalNpmPrefix();
  if (resolvedPrefix === null) {
    throw new Error(
      "Claude Agent SDK is unavailable: `npm prefix -g` did not answer."
    );
  }
  return resolvedPrefix;
}

// `<prefix>/lib/node_modules/@anthropic-ai/claude-agent-sdk` (no `lib` on
// Windows), where `npm install -g` puts the package.
export function claudeSdkDirectory(prefix: string = claudeSdkPrefix()): string {
  return path.join(
    prefix,
    ...(process.platform === "win32" ? [] : ["lib"]),
    "node_modules",
    "@anthropic-ai",
    "claude-agent-sdk"
  );
}

// `null` when the SDK is not installed or npm cannot resolve its prefix.
export function readClaudeSdkVersion(prefix?: string): string | null {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(
        path.join(
          claudeSdkDirectory(prefix ?? claudeSdkPrefix()),
          "package.json"
        ),
        "utf8"
      )
    );
    const version =
      typeof manifest === "object" && manifest !== null
        ? (manifest as { version?: unknown }).version
        : null;
    return typeof version === "string" && version.trim()
      ? version.trim()
      : null;
  } catch {
    return null;
  }
}

// Installs the latest published SDK into that prefix (`npm install -g` with
// the prefix pinned, the route the session installer uses for a first
// install) and returns the installed version. Errors propagate.
export async function updateClaudeSdk(
  overrides: ClaudeSdkUpdateOverrides = {}
): Promise<string | null> {
  const prefix = overrides.prefix ?? claudeSdkPrefix();
  await mkdir(path.dirname(claudeSdkDirectory(prefix)), { recursive: true });
  const env = {
    ...process.env,
    NPM_CONFIG_PREFIX: prefix,
    npm_config_prefix: prefix,
  };
  await (overrides.runNpm ?? runNpm)(
    ["install", "-g", `${PACKAGE_NAME}@latest`, "--force"],
    env
  );
  return readClaudeSdkVersion(prefix);
}

function readGlobalNpmPrefix(): string | null {
  try {
    const pathEntries = (process.env.PATH ?? "")
      .split(path.delimiter)
      .filter(Boolean);
    const prefix = execFileSync(NPM_EXECUTABLE, ["prefix", "-g"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: [...new Set([...pathEntries, ...GUI_NPM_PATHS])].join(
          path.delimiter
        ),
      },
      stdio: ["ignore", "pipe", "ignore"],
      timeout: NPM_PREFIX_TIMEOUT_MS,
      windowsHide: true,
    }).trim();
    return prefix.length > 0 ? prefix : null;
  } catch {
    return null;
  }
}

function runNpm(
  args: readonly string[],
  env: NodeJS.ProcessEnv
): Promise<unknown> {
  return runNpmCommand(args, { env, npmExecutable: NPM_EXECUTABLE });
}
