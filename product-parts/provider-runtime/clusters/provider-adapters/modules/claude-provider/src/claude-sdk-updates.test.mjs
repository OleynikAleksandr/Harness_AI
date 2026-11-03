import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ES2022,
  target: ts.ScriptTarget.ES2022,
};
const buildDir = await mkdtemp(path.join(tmpdir(), "claude-sdk-updates-"));
const transpile = (url) =>
  ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions }).outputText;

try {
  writeFileSync(
    path.join(buildDir, "npm-runner.js"),
    transpile(new URL("./reference/installer/npm-runner.ts", import.meta.url)),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "claude-sdk-updates.js"),
    transpile(new URL("./claude-sdk-updates.ts", import.meta.url)).replace(
      "./reference/installer/npm-runner.js",
      "./npm-runner.js"
    ),
    "utf8"
  );
  process.env.HARNESS_AI_HOME = path.join(buildDir, "harness-home");
  const {
    harnessClaudeSdkDirectory,
    harnessClaudeSdkPrefix,
    readHarnessClaudeSdkVersion,
    updateHarnessClaudeSdk,
  } = await import(
    pathToFileURL(path.join(buildDir, "claude-sdk-updates.js")).href
  );

  // The Harness prefix lives under the product home, not the global npm one.
  const prefix = harnessClaudeSdkPrefix();
  assert.equal(
    prefix,
    path.join(buildDir, "harness-home", "providers", "claude", "sdk")
  );
  assert.equal(
    harnessClaudeSdkDirectory(prefix),
    path.join(
      prefix,
      "lib",
      "node_modules",
      "@anthropic-ai",
      "claude-agent-sdk"
    )
  );
  assert.equal(readHarnessClaudeSdkVersion(), null);

  const writeVersion = (version) => {
    const directory = harnessClaudeSdkDirectory(prefix);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "@anthropic-ai/claude-agent-sdk", version }),
      "utf8"
    );
  };
  writeVersion("0.3.207");
  assert.equal(readHarnessClaudeSdkVersion(), "0.3.207");

  // The update installs the latest package into the Harness prefix and
  // reports the version now on disk.
  const calls = [];
  const installed = await updateHarnessClaudeSdk({
    runNpm: (args, env) => {
      calls.push({ args, prefix: env.NPM_CONFIG_PREFIX });
      writeVersion("0.3.317");
      return Promise.resolve();
    },
  });
  assert.equal(installed, "0.3.317");
  assert.deepEqual(calls, [
    {
      args: [
        "install",
        "-g",
        "@anthropic-ai/claude-agent-sdk@latest",
        "--force",
      ],
      prefix,
    },
  ]);

  // npm failures propagate to the caller.
  await assert.rejects(
    updateHarnessClaudeSdk({
      runNpm: () => Promise.reject(new Error("registry down")),
    }),
    /registry down/u
  );

  console.log("claude sdk update tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
