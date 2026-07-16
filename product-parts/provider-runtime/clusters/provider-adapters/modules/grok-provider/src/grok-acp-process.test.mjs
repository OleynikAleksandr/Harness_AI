import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-acp-process-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-acp-router.ts",
    "grok-acp-process.ts",
  ]) {
    const source = readFileSync(new URL(filename, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }
  const { GrokAcpProcess } = await import(
    pathToFileURL(path.join(buildDir, "grok-acp-process.js")).href
  );
  const fakeAgentPath = new URL("./grok-fake-agent.mjs", import.meta.url)
    .pathname;
  const exits = [];
  const processRuntime = new GrokAcpProcess({
    binaryPath: process.execPath,
    commandArgs: [fakeAgentPath],
    cwd: root,
    onExit: (exit) => exits.push(exit),
    onReverseRequest: ({ params }) => ({ outcome: "selected", params }),
    requestTimeoutMs: 100,
    shutdownTimeoutMs: 100,
    stderrLimitBytes: 256,
  });

  await Promise.all([processRuntime.start(), processRuntime.start()]);
  assert.equal(processRuntime.isRunning, true);
  assert.deepEqual(await processRuntime.request("test/echo", { value: 1 }), {
    value: 1,
  });
  assert.deepEqual(await processRuntime.request("test/reverse"), {
    outcome: "selected",
    params: { options: ["allow", "deny"] },
  });
  assert.equal(await processRuntime.request("test/stderr"), true);
  await waitFor(() => processRuntime.stderrSnapshot.length === 256);
  assert.equal(processRuntime.stderrSnapshot, "x".repeat(256));

  const orphan = processRuntime.request("test/hold");
  await processRuntime.stop();
  await assert.rejects(orphan, /stopped/u);
  assert.equal(processRuntime.isRunning, false);
  assert.equal(exits.at(-1).expected, true);

  const crashExits = [];
  const crashRuntime = new GrokAcpProcess({
    binaryPath: process.execPath,
    commandArgs: [fakeAgentPath],
    cwd: root,
    onExit: (exit) => crashExits.push(exit),
  });
  await assert.rejects(crashRuntime.request("test/exit"), /code 7/u);
  await waitFor(() => crashExits.length === 1);
  assert.equal(crashExits[0].expected, false);
  assert.equal(crashExits[0].code, 7);

  console.log("grok-acp-process tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("Timed out waiting for Grok ACP process state.");
}
