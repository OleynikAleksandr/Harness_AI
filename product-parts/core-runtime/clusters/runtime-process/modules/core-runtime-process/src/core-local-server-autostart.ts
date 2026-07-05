// Unconditional LM Studio autostart (user order 2026-07-05): when the
// configured local server does not answer on Core startup, spawn the lms CLI
// service (the CLI ships with LM Studio at ~/.lmstudio/bin/lms) or open the
// LM Studio app in the background as the last resort, then re-run the
// local-models liveness so the picker sees the models. Machines without
// LM Studio skip silently — an idle LM Studio holds no models in memory, so
// the background service is cheap.

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { resolveLocalModelsV1BaseUrl } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/local-models-client-provider/src/local-models-client-provider-facade.js";

const execAsync = promisify(exec);
const PING_TIMEOUT_MS = 1500;
const READY_POLL_ATTEMPTS = 15;
const READY_POLL_INTERVAL_MS = 1000;

export interface LocalServerAutostartDeps {
  readonly execCommand?: (command: string) => Promise<unknown>;
  readonly fetchImplementation?: typeof fetch;
  readonly fileExists?: (path: string) => boolean;
  readonly log?: (message: string) => void;
  // Re-runs the local-models liveness once the server answers.
  readonly onReady?: () => void;
  readonly platform?: NodeJS.Platform;
  readonly pollIntervalMs?: number;
  // The CONFIGURED base URL (settings + env fallbacks), root or /v1 form.
  readonly resolveBaseUrl: () => string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const pingModels = async (
  v1BaseUrl: string,
  fetchImplementation: typeof fetch
): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(`${v1BaseUrl}/models`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

// Start the LM Studio service: the bundled lms CLI first (absolute path,
// then PATH), the background app launch as the macOS last resort.
const startServer = async (
  deps: Required<
    Pick<LocalServerAutostartDeps, "execCommand" | "fileExists" | "platform">
  > &
    Pick<LocalServerAutostartDeps, "log">
): Promise<boolean> => {
  const bundledLms = join(homedir(), ".lmstudio", "bin", "lms");
  const commands = [
    ...(deps.fileExists(bundledLms) ? [`"${bundledLms}" server start`] : []),
    "lms server start",
    ...(deps.platform === "darwin" ? ['open -g -a "LM Studio"'] : []),
  ];
  for (const command of commands) {
    try {
      await deps.execCommand(command);
      deps.log?.(`Local models autostart: launched via ${command}`);
      return true;
    } catch {
      // Try the next launcher; absence is normal on machines without LM Studio.
    }
  }
  deps.log?.("Local models autostart: LM Studio not found, skipping.");
  return false;
};

// Fire-and-forget on Core startup: ping the configured server, launch the
// LM Studio service when silent, poll briefly and refresh liveness once it
// answers. Never throws.
export const ensureLocalModelsServer = async (
  deps: LocalServerAutostartDeps
): Promise<void> => {
  const fetchImplementation = deps.fetchImplementation ?? fetch;
  const v1BaseUrl = resolveLocalModelsV1BaseUrl(deps.resolveBaseUrl());
  if (!v1BaseUrl) {
    return;
  }
  if (await pingModels(v1BaseUrl, fetchImplementation)) {
    return;
  }
  const started = await startServer({
    execCommand:
      deps.execCommand ?? (async (command) => await execAsync(command)),
    fileExists: deps.fileExists ?? existsSync,
    log: deps.log,
    platform: deps.platform ?? process.platform,
  });
  if (!started) {
    return;
  }
  const pollIntervalMs = deps.pollIntervalMs ?? READY_POLL_INTERVAL_MS;
  for (let attempt = 0; attempt < READY_POLL_ATTEMPTS; attempt += 1) {
    await sleep(pollIntervalMs);
    if (await pingModels(v1BaseUrl, fetchImplementation)) {
      deps.log?.("Local models autostart: server is ready.");
      deps.onReady?.();
      return;
    }
  }
  deps.log?.("Local models autostart: server did not answer after launch.");
};
