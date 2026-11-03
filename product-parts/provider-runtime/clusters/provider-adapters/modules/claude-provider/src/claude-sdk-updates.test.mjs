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
  // The install is the global npm prefix (`npm prefix -g`, which follows
  // `npm_config_prefix`), resolved once per process.
  const globalPrefix = path.join(buildDir, "npm-global");
  process.env.npm_config_prefix = globalPrefix;
  const {
    claudeSdkDirectory,
    claudeSdkPrefix,
    readClaudeSdkVersion,
    updateClaudeSdk,
  } = await import(
    pathToFileURL(path.join(buildDir, "claude-sdk-updates.js")).href
  );
  const prefix = claudeSdkPrefix();
  assert.equal(prefix, globalPrefix);
  process.env.npm_config_prefix = path.join(buildDir, "changed");
  assert.equal(claudeSdkPrefix(), globalPrefix);
  assert.equal(
    claudeSdkDirectory(prefix),
    path.join(
      prefix,
      "lib",
      "node_modules",
      "@anthropic-ai",
      "claude-agent-sdk"
    )
  );
  assert.equal(readClaudeSdkVersion(), null);

  const writeVersion = (version) => {
    const directory = claudeSdkDirectory(prefix);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ name: "@anthropic-ai/claude-agent-sdk", version }),
      "utf8"
    );
  };
  writeVersion("0.3.316");
  assert.equal(readClaudeSdkVersion(), "0.3.316");

  // The update installs the latest package into that prefix and reports the
  // version now on disk.
  const calls = [];
  const installed = await updateClaudeSdk({
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
    updateClaudeSdk({
      runNpm: () => Promise.reject(new Error("registry down")),
    }),
    /registry down/u
  );

  console.log("claude sdk update tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
