import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { runNpmCommand } from "./reference/installer/npm-runner.js";

// The Claude Agent SDK Harness sessions and the live model catalog run on is
// installed once into the Harness provider prefix
// (`~/.harness-ai/providers/claude/sdk`), not into the global npm prefix. Its
// bundled CLI decides which models the `opus`/`sonnet`/`haiku` aliases mean
// and the `supportedModels()` descriptions, so keeping model labels current
// means updating this copy in place.

const PACKAGE_NAME = "@anthropic-ai/claude-agent-sdk";

type NpmRunner = (
  args: readonly string[],
  env: NodeJS.ProcessEnv
) => Promise<unknown>;

interface ClaudeSdkUpdateOverrides {
  readonly prefix?: string;
  readonly runNpm?: NpmRunner;
}

export function harnessClaudeSdkPrefix(): string {
  const home =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(home, "providers", "claude", "sdk");
}

// `<prefix>/lib/node_modules/@anthropic-ai/claude-agent-sdk` (no `lib` on
// Windows), matching where the session installer puts the package.
export function harnessClaudeSdkDirectory(
  prefix: string = harnessClaudeSdkPrefix()
): string {
  return path.join(
    prefix,
    ...(process.platform === "win32" ? [] : ["lib"]),
    "node_modules",
    "@anthropic-ai",
    "claude-agent-sdk"
  );
}

export function readHarnessClaudeSdkVersion(
  prefix: string = harnessClaudeSdkPrefix()
): string | null {
  try {
    const manifest: unknown = JSON.parse(
      readFileSync(
        path.join(harnessClaudeSdkDirectory(prefix), "package.json"),
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

// Installs the latest published SDK into the Harness prefix (the same
// `npm install -g` with a prefix override the session installer uses) and
// returns the installed version. Errors propagate to the caller.
export async function updateHarnessClaudeSdk(
  overrides: ClaudeSdkUpdateOverrides = {}
): Promise<string | null> {
  const prefix = overrides.prefix ?? harnessClaudeSdkPrefix();
  await mkdir(path.join(prefix, "lib", "node_modules"), { recursive: true });
  const env = {
    ...process.env,
    NPM_CONFIG_PREFIX: prefix,
    npm_config_prefix: prefix,
  };
  await (overrides.runNpm ?? runNpm)(
    ["install", "-g", `${PACKAGE_NAME}@latest`, "--force"],
    env
  );
  return readHarnessClaudeSdkVersion(prefix);
}

function runNpm(
  args: readonly string[],
  env: NodeJS.ProcessEnv
): Promise<unknown> {
  return runNpmCommand(args, {
    env,
    npmExecutable: process.platform === "win32" ? "npm.cmd" : "npm",
  });
}
