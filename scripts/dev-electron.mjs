#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";

const rendererUrl = "http://127.0.0.1:5173";

const runtimeBuild = spawn("npm", ["run", "build:runtime"], {
  stdio: "inherit"
});
const runtimeBuildStatus = await new Promise((resolve) => {
  runtimeBuild.on("exit", (code) => resolve(code ?? 1));
});
if (runtimeBuildStatus !== 0) {
  process.exit(runtimeBuildStatus);
}

const vite = spawn("npm", ["run", "dev:renderer", "--", "--port", "5173"], {
  stdio: "inherit"
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
      "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/main.mjs"
    ],
    {
      env: { ...process.env, HARNESS_AI_RENDERER_URL: rendererUrl },
      stdio: "inherit"
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
