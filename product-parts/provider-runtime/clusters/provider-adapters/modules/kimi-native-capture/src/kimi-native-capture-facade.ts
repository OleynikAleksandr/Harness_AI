import { execFile, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ProviderNativeCaptureOptions } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { KimiAcpClient, type KimiCaptureAcpClient } from "./kimi-acp-client.js";
import { prepareKimiCaptureConfig } from "./kimi-capture-config-rewrite.js";

const KIMI_CONFIG_DIRNAME = ".kimi-code";
const CLONE_ENTRIES = ["config.toml", "credentials", "device_id", "tui.toml"];
const CAPTURE_SETTLE_MS = 12_000;
const KIMI_VERSION_TIMEOUT_MS = 5000;
const KIMI_UPGRADE_TIMEOUT_MS = 300_000;
const KIMI_UPGRADE_MAX_BUFFER_BYTES = 10 * 1_048_576;
const execFileAsync = promisify(execFile);

interface KimiNativeCaptureDependencies {
  readonly baseEnv: NodeJS.ProcessEnv;
  readonly clientFactory: (options: {
    readonly command: string;
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
    readonly onDiagnostic: (record: unknown) => void;
  }) => KimiCaptureAcpClient;
  readonly kimiCommand: string;
  readonly sourceConfigDir: string;
}

// Diagnostic-only facade for the original Kimi CLI wrapping. It never serves
// normal Harness sessions: Kimi remains on the universal client. Capture uses
// a temporary native CLI home, the CLI default agent, and a reverse bridge.
export class KimiNativeCaptureFacade {
  private readonly deps: KimiNativeCaptureDependencies;

  constructor(deps: Partial<KimiNativeCaptureDependencies> = {}) {
    this.deps = {
      baseEnv: deps.baseEnv ?? process.env,
      clientFactory:
        deps.clientFactory ?? ((options) => new KimiAcpClient(options)),
      kimiCommand: deps.kimiCommand ?? resolveKimiCommand(),
      sourceConfigDir:
        deps.sourceConfigDir ?? path.join(homedir(), KIMI_CONFIG_DIRNAME),
    };
  }

  async captureNativeRequest(
    options: ProviderNativeCaptureOptions
  ): Promise<void> {
    const selectedModelId = options.selectedModelId?.trim();
    if (!selectedModelId) {
      throw new Error("Kimi native capture requires a selected model");
    }
    const tempHome = await mkdtemp(path.join(tmpdir(), "kimi-capture-"));
    try {
      await this.prepareClonedHome(tempHome, options.proxyUrl, selectedModelId);
      await options.recordDiagnosticContext?.({
        kind: "kimi_cli_capture",
        payload: {
          captureId: options.captureId,
          cliVersion: readKimiVersion(this.deps.kimiCommand),
          mode: "acp_default_agent",
          selectedModelId,
        },
      });
      await options.recordAppliedInputEnvelope?.({
        bridgeUrl: options.proxyUrl,
        kind: "kimi",
        mode: "acp_default_agent",
        selectedModelId,
        sourceConfigDir: this.deps.sourceConfigDir,
      });
      await this.runProbeTurn(tempHome, options, selectedModelId);
    } finally {
      await rm(tempHome, { force: true, recursive: true });
    }
  }

  private async prepareClonedHome(
    tempHome: string,
    bridgeUrl: string,
    selectedModelId: string
  ): Promise<void> {
    const destination = path.join(tempHome, KIMI_CONFIG_DIRNAME);
    await mkdir(destination, { recursive: true });
    for (const entry of CLONE_ENTRIES) {
      await cp(
        path.join(this.deps.sourceConfigDir, entry),
        path.join(destination, entry),
        { force: true, recursive: true }
      ).catch(() => undefined);
    }
    const configPath = path.join(destination, "config.toml");
    const source = await readFile(configPath, "utf8");
    await writeFile(
      configPath,
      prepareKimiCaptureConfig(source, bridgeUrl, selectedModelId),
      "utf8"
    );
  }

  private async runProbeTurn(
    tempHome: string,
    options: ProviderNativeCaptureOptions,
    selectedModelId: string
  ): Promise<void> {
    const diagnostics: unknown[] = [];
    const client = this.deps.clientFactory({
      command: this.deps.kimiCommand,
      cwd: options.workspacePath,
      env: {
        ...this.deps.baseEnv,
        HOME: tempHome,
        KIMI_CLI_NO_AUTO_UPDATE: "1",
      },
      onDiagnostic: (record) => diagnostics.push(record),
    });
    await client.start();
    try {
      await client.initialize();
      const sessionId = await client.startSession();
      await client.setModel(sessionId, selectedModelId).catch(() => undefined);
      const prompt = client.prompt(sessionId, options.probePrompt);
      await Promise.race([
        prompt.catch(() => undefined),
        delay(CAPTURE_SETTLE_MS),
      ]);
    } finally {
      await client.stop();
      if (diagnostics.length > 0) {
        await options.recordDiagnosticContext?.({
          kind: "kimi_acp_process",
          payload: diagnostics,
        });
      }
    }
  }
}

function resolveKimiCommand(): string {
  const userInstall = path.join(homedir(), KIMI_CONFIG_DIRNAME, "bin", "kimi");
  return existsSync(userInstall) ? userInstall : "kimi";
}

export interface KimiCliVersionStatus {
  currentVersion: null | string;
  latestVersion: null | string;
}

// Kimi CLI version tooling for the provider-versions surface. The CLI is a
// standalone binary (no npm package): the current version comes from
// `kimi --version`, the latest version from the update-state file the CLI
// itself refreshes against its CDN channel on every launch, and updates run
// the native `kimi upgrade` command.
export async function readKimiCliVersionStatus(
  overrides: {
    readonly kimiCommand?: string;
    readonly updateStatePath?: string;
  } = {}
): Promise<KimiCliVersionStatus> {
  const command = overrides.kimiCommand ?? resolveKimiCommand();
  const updateStatePath =
    overrides.updateStatePath ??
    path.join(homedir(), KIMI_CONFIG_DIRNAME, "updates", "latest.json");
  const currentVersion = await execFileAsync(command, ["--version"], {
    timeout: KIMI_VERSION_TIMEOUT_MS,
  })
    .then(({ stdout }) => stdout.trim() || null)
    .catch(() => null);
  return {
    currentVersion,
    latestVersion: readKimiLatestKnownVersion(updateStatePath),
  };
}

export async function upgradeKimiCli(kimiCommand?: string): Promise<void> {
  await execFileAsync(kimiCommand ?? resolveKimiCommand(), ["upgrade"], {
    maxBuffer: KIMI_UPGRADE_MAX_BUFFER_BYTES,
    timeout: KIMI_UPGRADE_TIMEOUT_MS,
  });
}

function readKimiLatestKnownVersion(updateStatePath: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(updateStatePath, "utf8")) as {
      latest?: unknown;
    };
    return typeof parsed.latest === "string" && parsed.latest.trim()
      ? parsed.latest.trim()
      : null;
  } catch {
    return null;
  }
}

function readKimiVersion(command: string): string | null {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref();
  });
}

export const kimiNativeCaptureFacade = new KimiNativeCaptureFacade();
