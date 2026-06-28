import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
} as const;
const PROVIDER_CLI_VERSION_COMMANDS = {
  claude:
    process.platform === "win32" ? "claude.cmd --version" : "claude --version",
  codex:
    process.platform === "win32" ? "codex.cmd --version" : "codex --version",
  glmOpenCode:
    process.platform === "win32"
      ? "opencode.cmd --version"
      : "opencode --version",
} as const;
const BUNDLED_PACKAGE_RESOLVERS: Record<string, () => string> = {
  "@opencode-ai/sdk": () => import.meta.resolve("@opencode-ai/sdk"),
};
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/u;

type ProviderVersionKey = keyof typeof PROVIDER_PACKAGE_MAP;
type ProviderUpdateTarget = keyof (typeof PROVIDER_PACKAGE_MAP)["claude"];

export async function loadLocalModels(): Promise<string[]> {
  const response = await fetch("http://127.0.0.1:1234/v1/models");
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { data?: unknown[] };
  return Array.isArray(payload.data)
    ? payload.data
        .map((model) =>
          typeof (model as { id?: unknown })?.id === "string"
            ? ((model as { id: string }).id ?? null)
            : null
        )
        .filter((modelId): modelId is string => Boolean(modelId))
    : [];
}

export async function loadProviderVersions(): Promise<unknown> {
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

export async function installLatestGlobalPackage(
  packageName: string
): Promise<void> {
  await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
    env: buildExecEnv(),
    maxBuffer: EXEC_MAX_BUFFER_BYTES,
  });
}

export function resolveProviderPackage(
  provider: unknown,
  target: unknown
): string {
  const packageMap = PROVIDER_PACKAGE_MAP[provider as ProviderVersionKey];
  const packageName = packageMap?.[target as ProviderUpdateTarget];
  if (!packageName) {
    throw new Error("Unknown provider update target.");
  }
  return packageName;
}

async function readCliPackageVersion(providerId: ProviderVersionKey) {
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

async function readPackageVersion(packageName: string) {
  const [globalVersion, bundledVersion, latestVersion] = await Promise.all([
    readInstalledVersion(packageName),
    readBundledPackageVersion(packageName),
    readLatestVersion(packageName),
  ]);
  return {
    currentVersion: globalVersion ?? bundledVersion,
    latestVersion,
    packageName,
  };
}

async function readCommandVersion(command: string): Promise<string | null> {
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

async function readInstalledVersion(
  packageName: string
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { env: buildExecEnv(), maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return extractInstalledVersion(packageName, stdout);
  } catch (error) {
    return extractInstalledVersion(
      packageName,
      (error as { stdout?: string })?.stdout ?? ""
    );
  }
}

async function readLatestVersion(packageName: string): Promise<string | null> {
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
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === "string") {
        return parsed.trim();
      }
      if (Array.isArray(parsed)) {
        return typeof parsed.at(-1) === "string" ? parsed.at(-1) : null;
      }
    } catch {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

function extractInstalledVersion(
  packageName: string,
  output: string
): string | null {
  try {
    const parsed = JSON.parse(output) as {
      dependencies?: Record<string, { version?: string }>;
    };
    return parsed.dependencies?.[packageName]?.version ?? null;
  } catch {
    return null;
  }
}

async function readBundledPackageVersion(
  packageName: string
): Promise<string | null> {
  const resolvePackage = BUNDLED_PACKAGE_RESOLVERS[packageName];
  if (!resolvePackage) {
    return null;
  }
  try {
    let directory = dirname(fileURLToPath(resolvePackage()));
    for (let depth = 0; depth < 8; depth += 1) {
      const packageJsonPath = join(directory, "package.json");
      let parsed: { name?: string; version?: string } | null = null;
      try {
        parsed = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
          name?: string;
          version?: string;
        };
      } catch {
        parsed = null;
      }
      if (parsed?.name === packageName) {
        return parsed.version ?? null;
      }
      const nextDirectory = dirname(directory);
      if (nextDirectory === directory) {
        return null;
      }
      directory = nextDirectory;
    }
  } catch {
    return null;
  }
  return null;
}

function buildExecEnv(): NodeJS.ProcessEnv {
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
