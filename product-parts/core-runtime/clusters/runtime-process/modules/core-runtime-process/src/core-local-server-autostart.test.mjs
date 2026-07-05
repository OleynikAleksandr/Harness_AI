import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./core-local-server-autostart.ts", import.meta.url),
  "utf8"
).replace(
  /import \{ resolveLocalModelsV1BaseUrl \}[^\n]*\n/u,
  'const resolveLocalModelsV1BaseUrl = (baseUrl) => { const trimmed = baseUrl.trim().replace(/\\/+$/u, ""); if (!trimmed) { return ""; } return /\\/v1$/u.test(trimmed) ? trimmed : trimmed + "/v1"; };\n'
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "local-server-autostart-"));

try {
  writeFileSync(
    path.join(buildDir, "core-local-server-autostart.js"),
    compiled,
    "utf8"
  );
  const { ensureLocalModelsServer } = await import(
    pathToFileURL(path.join(buildDir, "core-local-server-autostart.js")).href
  );

  // Server already answers: nothing is launched.
  const idleCommands = [];
  await ensureLocalModelsServer({
    execCommand: (command) => {
      idleCommands.push(command);
      return Promise.resolve();
    },
    fetchImplementation: () => Promise.resolve({ ok: true }),
    fileExists: () => true,
    platform: "darwin",
    pollIntervalMs: 1,
    resolveBaseUrl: () => "http://127.0.0.1:1234",
  });
  assert.deepEqual(idleCommands, []);

  // Server down: the bundled lms CLI launches the service, readiness polling
  // sees it answer and liveness refreshes.
  let pings = 0;
  const commands = [];
  let ready = 0;
  await ensureLocalModelsServer({
    execCommand: (command) => {
      commands.push(command);
      return Promise.resolve();
    },
    fetchImplementation: () => {
      pings += 1;
      return Promise.resolve({ ok: pings > 2 });
    },
    fileExists: (candidate) => candidate.endsWith("/.lmstudio/bin/lms"),
    onReady: () => {
      ready += 1;
    },
    platform: "darwin",
    pollIntervalMs: 1,
    resolveBaseUrl: () => "http://127.0.0.1:1234",
  });
  assert.equal(commands.length, 1);
  assert.match(commands[0], /\.lmstudio\/bin\/lms" server start$/u);
  assert.equal(ready, 1);

  // No bundled CLI: PATH lms fails, the macOS background app launch is the
  // last resort; machines without LM Studio skip silently after it fails.
  const fallbackCommands = [];
  const logs = [];
  await ensureLocalModelsServer({
    execCommand: (command) => {
      fallbackCommands.push(command);
      return Promise.reject(new Error("not found"));
    },
    fetchImplementation: () => Promise.resolve({ ok: false }),
    fileExists: () => false,
    log: (message) => logs.push(message),
    platform: "darwin",
    pollIntervalMs: 1,
    resolveBaseUrl: () => "http://127.0.0.1:1234",
  });
  assert.deepEqual(fallbackCommands, [
    "lms server start",
    'open -g -a "LM Studio"',
  ]);
  assert.ok(logs.some((message) => message.includes("skipping")));

  console.log("core-local-server-autostart tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
