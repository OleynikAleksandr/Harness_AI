import { spawn } from "node:child_process";
import { join } from "node:path";

const DEFAULT_CORE_HOST = "127.0.0.1";
const DEFAULT_CORE_PORT = 38_971;
const HEALTH_PATH = "/api/v1/health";
const SHUTDOWN_PATH = "/api/v1/shutdown";
const START_ATTEMPTS = 30;
const START_DELAY_MS = 250;

export function createCoreProcessSupervisor(repositoryRoot, options = {}) {
  const host = options.host ?? process.env.CORE_HOST ?? DEFAULT_CORE_HOST;
  const port =
    Number(options.port ?? process.env.CORE_PORT) || DEFAULT_CORE_PORT;
  const baseUrl = `http://${host}:${port}`;
  const entryPoint = join(
    repositoryRoot,
    "dist/runtime/product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-entry.js"
  );

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
      const response = await fetch(`${baseUrl}${SHUTDOWN_PATH}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Core shutdown failed with status ${response.status}.`);
      }
      await waitForStopped(baseUrl);
      return { ok: true, stopped: true };
    },
    async restart() {
      await this.stop();
      await delay(START_DELAY_MS);
      return this.start();
    },
  };
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

async function waitForStopped(baseUrl) {
  for (let attempt = 0; attempt < START_ATTEMPTS; attempt += 1) {
    if (!(await readHealth(baseUrl))) {
      return;
    }
    await delay(START_DELAY_MS);
  }
  throw new Error("Core process did not stop.");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
