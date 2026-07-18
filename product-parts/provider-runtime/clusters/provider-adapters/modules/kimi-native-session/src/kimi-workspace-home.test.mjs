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
    readKimiThinkingEffort,
    recordKimiSessionMapping,
    writeKimiThinkingEffort,
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
  writeFileSync(
    path.join(realConfigDir, "config.toml"),
    [
      'default_model = "kimi-for-coding"',
      "default_thinking = false",
      "",
      "[models.kimi-for-coding]",
      'provider = "kimi-prov"',
      'model = "kimi-for-coding"',
      "max_context_size = 262144",
      "",
    ].join("\n"),
    "utf8"
  );
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

  // The Core-catalog models get appended [models.*] sections (the CLI only
  // accepts model selection for ids declared in config.toml); the provider
  // is inherited from the user's own model section.
  const configText = readFileSync(path.join(configDir, "config.toml"), "utf8");
  const sectionCount = (name) =>
    configText.split("\n").filter((line) => line.trim() === `[models.${name}]`)
      .length;
  assert.equal(sectionCount("kimi-for-coding"), 1);
  assert.equal(sectionCount("kimi-for-coding-highspeed"), 1);
  assert.equal(sectionCount("k3"), 1);
  assert.match(
    configText,
    /\[models\.k3\]\nprovider = "kimi-prov"\nmodel = "k3"\nmax_context_size = 262144\ncapabilities = \["thinking", "tool_use"\]\nsupport_efforts = \["low", "high", "max"\]\ndefault_effort = "high"/u
  );

  // Thinking declarations: the deprecated key is stripped, the user's own
  // model section gains capabilities right below its header, and a
  // [thinking] section exists with the default effort.
  assert.doesNotMatch(configText, /default_thinking/u);
  assert.match(
    configText,
    /\[models\.kimi-for-coding\]\ncapabilities = \["thinking", "tool_use"\]\nsupport_efforts = \["low", "high", "max"\]\nprovider = "kimi-prov"/u
  );
  assert.match(
    configText,
    /\[thinking\]\nenabled = true\neffort = "high"\nkeep = "all"/u
  );

  // The per-session effort writer replaces only the effort line and rejects
  // unsupported levels; the reader mirrors the configured level.
  assert.equal(readKimiThinkingEffort(home), "high");
  assert.equal(writeKimiThinkingEffort(home, "max"), true);
  assert.equal(readKimiThinkingEffort(home), "max");
  assert.match(
    readFileSync(path.join(configDir, "config.toml"), "utf8"),
    /\[thinking\]\nenabled = true\neffort = "max"\nkeep = "all"/u
  );
  assert.equal(writeKimiThinkingEffort(home, "weird"), false);
  assert.match(
    readFileSync(path.join(configDir, "config.toml"), "utf8"),
    /effort = "max"/u
  );
  assert.equal(writeKimiThinkingEffort(home, "low"), true);

  // Re-preparing is idempotent (no duplicate sections) and keeps local
  // config edits.
  writeFileSync(
    path.join(configDir, "config.toml"),
    `${configText}# local tweak\n`,
    "utf8"
  );
  prepareKimiWorkspaceHome(workspacePath, { realKimiConfigDir: realConfigDir });
  const reprepared = readFileSync(path.join(configDir, "config.toml"), "utf8");
  assert.match(reprepared, /# local tweak/u);
  assert.equal(
    reprepared.split("\n").filter((line) => line.trim() === "[models.k3]")
      .length,
    1
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
