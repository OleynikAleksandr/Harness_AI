import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-workspace-home-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  const homeManagerSource = readFileSync(
    new URL(
      "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts",
      import.meta.url
    ),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "provider-home-manager-facade.js"),
    ts.transpileModule(homeManagerSource, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    "utf8"
  );
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-workspace-home.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
      "utf8"
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled.replaceAll(
        "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js",
        "./provider-home-manager-facade.js"
      ),
      "utf8"
    );
  }
  const {
    deleteKimiNativeSessionArtifacts,
    prepareKimiWorkspaceHome,
    recordKimiSessionMapping,
  } = await import(
    pathToFileURL(path.join(buildDir, "kimi-workspace-home.js")).href
  );

  // A fake real `~/.kimi-code`: credentials dir + device_id + configs.
  const realConfigDir = path.join(root, "real-kimi-code");
  await mkdir(path.join(realConfigDir, "credentials"), { recursive: true });
  writeFileSync(
    path.join(realConfigDir, "credentials", "token.json"),
    "{}",
    "utf8"
  );
  writeFileSync(path.join(realConfigDir, "device_id"), "device-1", "utf8");
  writeFileSync(path.join(realConfigDir, "config.toml"), "a = 1\n", "utf8");
  writeFileSync(path.join(realConfigDir, "tui.toml"), "b = 2\n", "utf8");

  const workspacePath = path.join(root, "workspace");
  await mkdir(workspacePath, { recursive: true });
  const home = prepareKimiWorkspaceHome(workspacePath, {
    realKimiConfigDir: realConfigDir,
  });
  assert.equal(
    home.homePath,
    path.join(workspacePath, ".harness", "runtime", "providers", "kimi", "home")
  );
  const configDir = path.join(home.homePath, ".kimi-code");
  assert.equal(home.sessionsRoot, path.join(configDir, "sessions"));

  // Auth material links to the real home; configs are one-time copies.
  assert.ok(lstatSync(path.join(configDir, "credentials")).isSymbolicLink());
  assert.ok(lstatSync(path.join(configDir, "device_id")).isSymbolicLink());
  assert.equal(
    readFileSync(path.join(configDir, "credentials", "token.json"), "utf8"),
    "{}"
  );
  assert.equal(
    readFileSync(path.join(configDir, "config.toml"), "utf8"),
    "a = 1\n"
  );
  // Re-preparing is idempotent and keeps a locally edited config copy.
  writeFileSync(path.join(configDir, "config.toml"), "a = 2\n", "utf8");
  prepareKimiWorkspaceHome(workspacePath, { realKimiConfigDir: realConfigDir });
  assert.equal(
    readFileSync(path.join(configDir, "config.toml"), "utf8"),
    "a = 2\n"
  );

  // Deletion resolves the CLI store id from the persisted mapping and
  // removes exactly that session directory.
  const sessionDir = path.join(
    home.sessionsRoot,
    "wd_workspace_hash",
    "session_abc"
  );
  await mkdir(path.join(sessionDir, "agents", "main"), { recursive: true });
  writeFileSync(
    path.join(sessionDir, "agents", "main", "wire.jsonl"),
    "",
    "utf8"
  );
  const otherSessionDir = path.join(
    home.sessionsRoot,
    "wd_workspace_hash",
    "session_other"
  );
  await mkdir(otherSessionDir, { recursive: true });
  recordKimiSessionMapping(home, "kimi-native-1", "session_abc");
  const mapPath = path.join(configDir, "harness-session-map.json");
  assert.equal(
    JSON.parse(readFileSync(mapPath, "utf8"))["kimi-native-1"],
    "session_abc"
  );
  deleteKimiNativeSessionArtifacts("kimi-native-1", workspacePath);
  assert.equal(existsSync(sessionDir), false);
  assert.equal(existsSync(otherSessionDir), true);
  assert.deepEqual(JSON.parse(readFileSync(mapPath, "utf8")), {});
  // Unknown ids are a no-op.
  deleteKimiNativeSessionArtifacts("kimi-native-unknown", workspacePath);

  console.log("kimi workspace home tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
