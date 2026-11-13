#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";

const rendererUrl = "http://127.0.0.1:5173";

// Development must never reuse a previous release descriptor.
const devEnv = { ...process.env, HARNESS_RELEASE_TAG: undefined };
for (const task of [
  "build:release-info",
  "build:runtime",
  "build:workflow-kit",
]) {
  const build = spawn("npm", ["run", task], { env: devEnv, stdio: "inherit" });
  const status = await new Promise((resolve) => {
    build.on("exit", (code) => resolve(code ?? 1));
  });
  if (status !== 0) {
    process.exit(status);
  }
}

const vite = spawn("npm", ["run", "dev:renderer", "--", "--port", "5173"], {
  env: devEnv,
  stdio: "inherit",
});

async function waitForRenderer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await canReach(rendererUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Renderer did not start at ${rendererUrl}`);
}

function canReach(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function stopVite() {
  if (!vite.killed) {
    vite.kill("SIGTERM");
  }
}

try {
  await waitForRenderer();
  const electron = spawn(
    "npx",
    [
      "electron",
      "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/main.mjs",
    ],
    {
      env: { ...devEnv, HARNESS_AI_RENDERER_URL: rendererUrl },
      stdio: "inherit",
    }
  );
  electron.on("exit", (code) => {
    stopVite();
    process.exit(code ?? 0);
  });
} catch (error) {
  stopVite();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
