import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_CORE_HOST = "127.0.0.1";
const DEFAULT_CORE_PORT = 38_971;
const HEALTH_PATH = "/api/v1/health";
const SHUTDOWN_PATH = "/api/v1/shutdown";
const START_ATTEMPTS = 30;
const START_DELAY_MS = 250;
const STOP_ATTEMPTS = 40;
// Escalate to SIGKILL after this many SIGTERM attempts went unanswered.
const SIGKILL_AFTER_ATTEMPTS = 8;

export function createCoreProcessSupervisor(repositoryRoot, options = {}) {
  const host = options.host ?? process.env.CORE_HOST ?? DEFAULT_CORE_HOST;
  const port =
    Number(options.port ?? process.env.CORE_PORT) || DEFAULT_CORE_PORT;
  const baseUrl = `http://${host}:${port}`;
  const entryPoint = join(
    repositoryRoot,
    "dist/runtime/product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-entry.js"
  );
  const workflowKitBundle =
    options.workflowKitBundle ?? resolveWorkflowKitBundle(repositoryRoot);

  return {
    getConnectionInfo() {
      return { baseUrl, host, port };
    },
    health() {
      return readHealth(baseUrl);
    },
    async start() {
      const running = await readHealth(baseUrl);
      if (running?.status === "ok") {
        return { attached: true, ok: true, port };
      }
      const child = spawn(process.execPath, [entryPoint], {
        detached: true,
        env: {
          ...process.env,
          CORE_HOST: host,
          CORE_PORT: String(port),
          ELECTRON_RUN_AS_NODE: "1",
          // Core runs Workflow Kit commands with this Electron binary as Node.
          HARNESS_ELECTRON_NODE: process.execPath,
          HARNESS_WORKFLOW_KIT_BUNDLE: workflowKitBundle,
        },
        stdio: "ignore",
      });
      child.unref();
      await waitForHealthy(baseUrl);
      return { ok: true, pid: child.pid ?? null, port };
    },
    async stop() {
      const running = await readHealth(baseUrl);
      if (!running) {
        return { ok: true, stopped: false };
      }
      const pid = typeof running.pid === "number" ? running.pid : null;
      await requestShutdown(baseUrl);
      await ensureStopped(baseUrl, pid);
      return { ok: true, stopped: true };
    },
    async restart() {
      await this.stop();
      await delay(START_DELAY_MS);
      return this.start();
    },
  };
}

// Packaged apps ship the bundle in Resources/workflow-kit (extraResources);
// development uses the repository build output.
function resolveWorkflowKitBundle(repositoryRoot) {
  const packaged = process.resourcesPath
    ? join(process.resourcesPath, "workflow-kit")
    : null;
  return packaged && existsSync(packaged)
    ? packaged
    : join(repositoryRoot, "dist/workflow-kit");
}

async function readHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}${HEALTH_PATH}`);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function waitForHealthy(baseUrl) {
  for (let attempt = 0; attempt < START_ATTEMPTS; attempt += 1) {
    const health = await readHealth(baseUrl);
    if (health?.status === "ok") {
      return;
    }
    await delay(START_DELAY_MS);
  }
  throw new Error("Core process did not become healthy.");
}

async function requestShutdown(baseUrl) {
  // Best-effort graceful shutdown; a hung core is handled by signal escalation.
  try {
    await fetch(`${baseUrl}${SHUTDOWN_PATH}`, { method: "POST" });
  } catch {
    // Ignore; ensureStopped force-kills if the process is still alive.
  }
}

async function ensureStopped(baseUrl, pid) {
  for (let attempt = 0; attempt < STOP_ATTEMPTS; attempt += 1) {
    const httpAlive = Boolean(await readHealth(baseUrl));
    const processAlive = pid !== null && isProcessAlive(pid);
    if (!(httpAlive || processAlive)) {
      return;
    }
    if (pid !== null) {
      signalProcess(
        pid,
        attempt < SIGKILL_AFTER_ATTEMPTS ? "SIGTERM" : "SIGKILL"
      );
    }
    await delay(START_DELAY_MS);
  }
  if (pid !== null && isProcessAlive(pid)) {
    throw new Error("Core process did not stop.");
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalProcess(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch {
    // Process already gone or not permitted; nothing to do.
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
