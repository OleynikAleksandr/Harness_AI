import assert from "node:assert/strict";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./grok-cli-locator.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const root = await mkdtemp(path.join(tmpdir(), "grok-cli-locator-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  writeFileSync(path.join(buildDir, "grok-cli-locator.js"), compiled, "utf8");
  const { locateGrokCli, probeGrokCli, resolveGrokCliCandidates } =
    await import(
      pathToFileURL(path.join(buildDir, "grok-cli-locator.js")).href
    );

  const explicit = await createFakeGrok(root, "explicit", { ready: true });
  const grokHome = path.join(root, "grok-home");
  const homeBinary = await createFakeGrok(grokHome, "bin", { ready: true });
  const userHome = path.join(root, "user-home");
  const userBinary = await createFakeGrok(userHome, ".grok/bin", {
    ready: true,
  });
  const pathRoot = path.join(root, "path-bin");
  const pathBinary = await createFakeGrok(root, "path-bin", { ready: true });

  const options = {
    binaryPath: explicit,
    environment: { GROK_HOME: grokHome, PATH: pathRoot },
    homeDirectory: userHome,
    platform: "darwin",
  };
  assert.deepEqual(resolveGrokCliCandidates(options), [
    explicit,
    homeBinary,
    userBinary,
    pathBinary,
  ]);
  assert.equal(await locateGrokCli(options), explicit);

  const ready = await probeGrokCli(options);
  assert.equal(ready.status, "ready");
  assert.equal(ready.authStatus, "ready");
  assert.equal(ready.version, "grok 0.2.101 (test) [stable]");
  assert.equal(ready.binaryPath, explicit);

  const loginBinary = await createFakeGrok(root, "login", { ready: false });
  const login = await probeGrokCli({
    binaryPath: loginBinary,
    environment: { PATH: "" },
    homeDirectory: path.join(root, "missing-home"),
    platform: "darwin",
  });
  assert.equal(login.status, "login_required");
  assert.equal(login.authStatus, "login_required");
  assert.match(login.message, /grok login/u);

  const missing = await probeGrokCli({
    environment: { PATH: "" },
    homeDirectory: path.join(root, "missing-home"),
    platform: "darwin",
  });
  assert.equal(missing.status, "missing");
  assert.equal(missing.binaryPath, null);

  console.log("grok-cli-locator tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}

async function createFakeGrok(root, relativeDir, { ready }) {
  const directory = path.join(root, relativeDir);
  await mkdir(directory, { recursive: true });
  const binary = path.join(directory, "grok");
  writeFileSync(
    binary,
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then',
      "  echo 'grok 0.2.101 (test) [stable]'",
      "  exit 0",
      "fi",
      ready
        ? "echo 'grok-4.5 (default)'"
        : "echo 'No cached credentials found. Run `grok login`.' >&2",
      ready ? "exit 0" : "exit 1",
      "",
    ].join("\n"),
    "utf8"
  );
  chmodSync(binary, 0o755);
  return binary;
}
