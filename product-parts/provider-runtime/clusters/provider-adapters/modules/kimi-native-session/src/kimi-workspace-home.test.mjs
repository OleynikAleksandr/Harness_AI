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
  // Core-served Kimi catalog stub (provider-descriptor): the models the
  // workspace home declares in the CLI config.
  writeFileSync(
    path.join(buildDir, "provider-descriptor-stub.js"),
    'export const providerDescriptorFacade = { getKimiClientModels: () => globalThis.__kimiTestCatalog ?? ["kimi-for-coding", "kimi-for-coding-highspeed", "k3"].map((id) => ({ defaultReasoningEffort: "high", id, label: id, reasoningEfforts: ["low", "high", "max"] })) };\n',
    "utf8"
  );
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
      compiled
        .replaceAll(
          "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js",
          "./provider-home-manager-facade.js"
        )
        .replaceAll(
          "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
          "./provider-descriptor-stub.js"
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

  // Passing the merged catalog contexts refreshes `max_context_size` on the
  // managed catalog-model sections in place (the 2026-07-17 bootstrap wrote
  // 262144 for k3, quartering its real 1M window); matching values and every
  // other field stay untouched, and the upsert is idempotent.
  prepareKimiWorkspaceHome(workspacePath, {
    modelContexts: { k3: 1_048_576, "kimi-for-coding": 262_144 },
    realKimiConfigDir: realConfigDir,
  });
  const contextUpserted = readFileSync(
    path.join(configDir, "config.toml"),
    "utf8"
  );
  assert.match(
    contextUpserted,
    /\[models\.k3\]\nprovider = "kimi-prov"\nmodel = "k3"\nmax_context_size = 1048576\n/u
  );
  assert.match(
    contextUpserted,
    /\[models\.kimi-for-coding-highspeed\]\nprovider = "kimi-prov"\nmodel = "kimi-for-coding-highspeed"\nmax_context_size = 262144\n/u
  );
  assert.match(contextUpserted, /# local tweak/u);
  prepareKimiWorkspaceHome(workspacePath, {
    modelContexts: { k3: 1_048_576 },
    realKimiConfigDir: realConfigDir,
  });
  assert.equal(
    readFileSync(path.join(configDir, "config.toml"), "utf8"),
    contextUpserted
  );

  // A fresh workspace prepared with the contexts generates the k3 section
  // at the honest 1M window right away.
  const workspaceFresh = path.join(root, "workspace-fresh");
  await mkdir(workspaceFresh, { recursive: true });
  const freshHome = prepareKimiWorkspaceHome(workspaceFresh, {
    modelContexts: { k3: 1_048_576 },
    realKimiConfigDir: realConfigDir,
  });
  assert.match(
    readFileSync(
      path.join(freshHome.homePath, ".kimi-code", "config.toml"),
      "utf8"
    ),
    /\[models\.k3\]\nprovider = "kimi-prov"\nmodel = "k3"\nmax_context_size = 1048576\n/u
  );

  // The Kimi CLI config migration of 2026-09-09 leaves `[thinking]` with only
  // `enabled = true`; the bootstrap adds the default effort into that section
  // so the runtime keeps owning the level instead of sending `thinking=on`.
  const migratedConfigDir = path.join(root, "real-kimi-code-migrated");
  await mkdir(migratedConfigDir, { recursive: true });
  writeFileSync(
    path.join(migratedConfigDir, "config.toml"),
    [
      'default_model = "kimi-code/kimi-for-coding"',
      "",
      '[models."kimi-code/kimi-for-coding"]',
      'provider = "managed:kimi-code"',
      'model = "kimi-for-coding"',
      'default_effort = "max"',
      "",
      "[thinking]",
      "enabled = true",
      "",
    ].join("\n"),
    "utf8"
  );
  const workspaceMigrated = path.join(root, "workspace-migrated");
  await mkdir(workspaceMigrated, { recursive: true });
  const migratedHome = prepareKimiWorkspaceHome(workspaceMigrated, {
    realKimiConfigDir: migratedConfigDir,
  });
  assert.match(
    readFileSync(
      path.join(migratedHome.homePath, ".kimi-code", "config.toml"),
      "utf8"
    ),
    /\[thinking\]\neffort = "high"\nenabled = true\n/u
  );
  assert.equal(readKimiThinkingEffort(migratedHome), "high");

  // Every model of the served live catalog gets a section: dotted ids are
  // quoted TOML keys, the catalog context and efforts are used, and a model
  // without efforts declares thinking only.
  globalThis.__kimiTestCatalog = [
    {
      contextLength: 1_048_576,
      defaultReasoningEffort: "high",
      id: "k3.1-pro",
      label: "K3.1 Pro",
      reasoningEfforts: ["low", "high", "max"],
    },
    { contextLength: 262_144, id: "kimi-for-coding-highspeed", label: "HS" },
  ];
  const workspaceLive = path.join(root, "workspace-live");
  await mkdir(workspaceLive, { recursive: true });
  const liveHome = prepareKimiWorkspaceHome(workspaceLive, {
    realKimiConfigDir: migratedConfigDir,
  });
  const liveConfig = readFileSync(
    path.join(liveHome.homePath, ".kimi-code", "config.toml"),
    "utf8"
  );
  assert.match(
    liveConfig,
    /\[models\."k3\.1-pro"\]\nprovider = "managed:kimi-code"\nmodel = "k3\.1-pro"\nmax_context_size = 1048576\ncapabilities = \["thinking", "tool_use"\]\nsupport_efforts = \["low", "high", "max"\]\ndefault_effort = "high"\n/u
  );
  assert.match(
    liveConfig,
    /\[models\.kimi-for-coding-highspeed\]\nprovider = "managed:kimi-code"\nmodel = "kimi-for-coding-highspeed"\nmax_context_size = 262144\ncapabilities = \["thinking", "tool_use"\]\n(?!support_efforts)/u
  );
  globalThis.__kimiTestCatalog = undefined;

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
