import { exec } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const EXEC_MAX_BUFFER_BYTES = 10 * 1_048_576;
const TOOL_PATH_ENTRIES = [
  join(process.env.HOME ?? "", ".local", "bin"),
  join(process.env.HOME ?? "", ".npm-global", "bin"),
  join(process.env.HOME ?? "", ".bun", "bin"),
  join(process.env.HOME ?? "", ".opencode", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
];
const PROVIDER_PACKAGE_MAP = {
  claude: {
    cli: "@anthropic-ai/claude-code",
    sdk: "@anthropic-ai/claude-agent-sdk",
  },
  codex: {
    cli: "@openai/codex",
    sdk: "@openai/codex-sdk",
  },
  glmOpenCode: {
    cli: "opencode-ai",
    sdk: "@opencode-ai/sdk",
  },
};
const PROVIDER_CLI_VERSION_COMMANDS = {
  claude:
    process.platform === "win32" ? "claude.cmd --version" : "claude --version",
  codex:
    process.platform === "win32" ? "codex.cmd --version" : "codex --version",
  glmOpenCode:
    process.platform === "win32"
      ? "opencode.cmd --version"
      : "opencode --version",
};
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/u;

export async function loadProviderVersions() {
  const [claudeCli, claudeSdk, codexCli, codexSdk, openCodeCli, openCodeSdk] =
    await Promise.all([
      readCliPackageVersion("claude"),
      readPackageVersion(PROVIDER_PACKAGE_MAP.claude.sdk),
      readCliPackageVersion("codex"),
      readPackageVersion(PROVIDER_PACKAGE_MAP.codex.sdk),
      readCliPackageVersion("glmOpenCode"),
      readPackageVersion(PROVIDER_PACKAGE_MAP.glmOpenCode.sdk),
    ]);
  return {
    checkedAt: new Date().toISOString(),
    claude: { cli: claudeCli, sdk: claudeSdk },
    codex: { cli: codexCli, sdk: codexSdk },
    glmOpenCode: { cli: openCodeCli, sdk: openCodeSdk },
  };
}

export async function installLatestGlobalPackage(packageName) {
  await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
    env: buildExecEnv(),
    maxBuffer: EXEC_MAX_BUFFER_BYTES,
  });
}

export function resolveProviderPackage(provider, target) {
  const packageName = PROVIDER_PACKAGE_MAP[provider]?.[target];
  if (!packageName) {
    throw new Error("Unknown provider update target.");
  }
  return packageName;
}

async function readCliPackageVersion(providerId) {
  const [currentVersion, latestVersion] = await Promise.all([
    readCommandVersion(PROVIDER_CLI_VERSION_COMMANDS[providerId]),
    readLatestVersion(PROVIDER_PACKAGE_MAP[providerId].cli),
  ]);
  return {
    currentVersion,
    latestVersion,
    packageName: PROVIDER_PACKAGE_MAP[providerId].cli,
  };
}

async function readPackageVersion(packageName) {
  const [currentVersion, latestVersion] = await Promise.all([
    readInstalledVersion(packageName),
    readLatestVersion(packageName),
  ]);
  return {
    currentVersion,
    latestVersion,
    packageName,
  };
}

async function readCommandVersion(command) {
  try {
    const { stdout } = await execAsync(command, {
      env: buildExecEnv(),
      maxBuffer: EXEC_MAX_BUFFER_BYTES,
    });
    return stdout.match(VERSION_PATTERN)?.[0] ?? null;
  } catch {
    return null;
  }
}

async function readInstalledVersion(packageName) {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { env: buildExecEnv(), maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return extractInstalledVersion(packageName, stdout);
  } catch (error) {
    return extractInstalledVersion(packageName, error?.stdout ?? "");
  }
}

async function readLatestVersion(packageName) {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} view ${packageName} version --json`,
      {
        env: buildExecEnv(),
        maxBuffer: EXEC_MAX_BUFFER_BYTES,
      }
    );
    const trimmed = stdout.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return parsed.trim();
      }
      if (Array.isArray(parsed)) {
        return parsed.at(-1) ?? null;
      }
    } catch {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

function extractInstalledVersion(packageName, output) {
  try {
    const parsed = JSON.parse(output);
    return parsed.dependencies?.[packageName]?.version ?? null;
  } catch {
    return null;
  }
}

function buildExecEnv() {
  const existingPathEntries = (process.env.PATH ?? "")
    .split(":")
    .filter(Boolean);
  return {
    ...process.env,
    PATH: Array.from(
      new Set([...existingPathEntries, ...TOOL_PATH_ENTRIES.filter(Boolean)])
    ).join(":"),
  };
}
