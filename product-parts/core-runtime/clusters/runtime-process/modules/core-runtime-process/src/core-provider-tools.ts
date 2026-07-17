import { exec } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  readKimiCliVersionStatus,
  upgradeKimiCli,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-native-capture/src/kimi-native-capture-facade.js";
import {
  ensureLocalModelContext,
  type LocalModelEntry,
  listLocalModelEntries,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/local-models-client-provider/src/local-models-management.js";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";

const execAsync = promisify(exec);
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const EXEC_MAX_BUFFER_BYTES = 10 * 1_048_576;
const TOOL_PATH_ENTRIES = [
  join(process.env.HOME ?? "", ".local", "bin"),
  join(process.env.HOME ?? "", ".npm-global", "bin"),
  join(process.env.HOME ?? "", ".bun", "bin"),
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
} as const;
const PROVIDER_CLI_VERSION_COMMANDS = {
  claude:
    process.platform === "win32" ? "claude.cmd --version" : "claude --version",
  codex:
    process.platform === "win32" ? "codex.cmd --version" : "codex --version",
} as const;
const PROVIDER_CLI_UPDATE_COMMANDS = {
  claude: process.platform === "win32" ? "claude.cmd update" : "claude update",
  codex: process.platform === "win32" ? "codex.cmd update" : "codex update",
} as const;
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/u;

type ProviderVersionKey = keyof typeof PROVIDER_PACKAGE_MAP;
type ProviderUpdateTarget = keyof (typeof PROVIDER_PACKAGE_MAP)["claude"];

// The live Local Models catalog comes from the CONFIGURED base URL (Core
// settings + env fallbacks); the structured entries carry per-model
// max/loaded context and tool capability from the LM Studio management API.
const configuredLocalModelsBaseUrl = (): string =>
  providerAuthStoreFacade.getBaseUrl("local-models-client") ??
  settingsStoreFacade.getSettings().providers.localModels.baseUrl;

export async function loadLocalModelEntries(): Promise<LocalModelEntry[]> {
  return await listLocalModelEntries({
    baseUrl: configuredLocalModelsBaseUrl(),
  });
}

// Apply a per-model context wish through the management API (reload
// semantics; 0 leaves the running instance alone) and return the applied
// window (null when the reload did not complete) plus the refreshed catalog
// for the Settings UI.
export async function applyLocalModelContext(
  model: string,
  contextLength: number
): Promise<{ applied: number | null; entries: LocalModelEntry[] }> {
  const applied = await ensureLocalModelContext({
    baseUrl: configuredLocalModelsBaseUrl(),
    desiredContextLength: contextLength,
    model,
  });
  return { applied, entries: await loadLocalModelEntries() };
}

export async function loadProviderVersions(): Promise<unknown> {
  const [claudeCli, claudeSdk, codexCli, codexSdk, kimiCli] = await Promise.all(
    [
      readCliPackageVersion("claude"),
      readPackageVersion(PROVIDER_PACKAGE_MAP.claude.sdk),
      readCliPackageVersion("codex"),
      readPackageVersion(PROVIDER_PACKAGE_MAP.codex.sdk),
      readKimiCliVersionStatus(),
    ]
  );
  return {
    checkedAt: new Date().toISOString(),
    claude: { cli: claudeCli, sdk: claudeSdk },
    codex: { cli: codexCli, sdk: codexSdk },
    // Kimi has no SDK (the universal client talks plain HTTP); the CLI is a
    // standalone binary versioned through its own `kimi upgrade` channel.
    kimi: { cli: kimiCli },
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

export async function updateProviderCli(provider: unknown): Promise<void> {
  if (provider === "kimi") {
    await upgradeKimiCli();
    return;
  }
  const command = PROVIDER_CLI_UPDATE_COMMANDS[provider as ProviderVersionKey];
  if (!command) {
    throw new Error("Unknown provider CLI update target.");
  }
  await execAsync(command, {
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
  const [globalVersion, latestVersion] = await Promise.all([
    readInstalledVersion(packageName),
    readLatestVersion(packageName),
  ]);
  return {
    currentVersion: globalVersion,
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
