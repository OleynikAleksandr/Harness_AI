import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ES2022,
  target: ts.ScriptTarget.ES2022,
};
const buildDir = await mkdtemp(path.join(tmpdir(), "claude-model-catalog-"));

try {
  writeFileSync(
    path.join(buildDir, "provider-descriptor-facade.js"),
    ts.transpileModule(
      readFileSync(
        new URL(
          "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts",
          import.meta.url
        ),
        "utf8"
      ),
      { compilerOptions }
    ).outputText,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "sdk-executable-path.js"),
    ts.transpileModule(
      readFileSync(
        new URL(
          "./reference/installer/sdk-executable-path.ts",
          import.meta.url
        ),
        "utf8"
      ),
      { compilerOptions }
    ).outputText,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "claude-model-catalog.js"),
    ts
      .transpileModule(
        readFileSync(
          new URL("./claude-model-catalog.ts", import.meta.url),
          "utf8"
        ),
        { compilerOptions }
      )
      .outputText.replace(
        "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
        "./provider-descriptor-facade.js"
      )
      .replace(
        "./reference/installer/sdk-executable-path.js",
        "./sdk-executable-path.js"
      ),
    "utf8"
  );
  const {
    fetchClaudeModelCatalog,
    parseClaudeModelCatalog,
    refreshClaudeModelCatalog,
  } = await import(
    pathToFileURL(path.join(buildDir, "claude-model-catalog.js")).href
  );
  const { CLAUDE_MODELS, providerDescriptorFacade } = await import(
    pathToFileURL(path.join(buildDir, "provider-descriptor-facade.js")).href
  );

  // Rows replayed from the live 2026-11-02 `supportedModels()` probe: the
  // `default` alias row is not offered, Haiku has no effort selection.
  const liveRows = [
    {
      description:
        "Opus 4.8 with 1M context · Best for everyday, complex tasks",
      displayName: "Default (recommended)",
      supportedEffortLevels: ["low", "medium", "high", "xhigh", "max"],
      value: "default",
    },
    {
      description:
        "Opus 4.8 with 1M context · Best for everyday, complex tasks",
      displayName: "Opus",
      supportedEffortLevels: ["low", "medium", "high", "xhigh", "max"],
      value: "opus[1m]",
    },
    {
      description: "Fable 5.1 · Most capable for your hardest tasks",
      displayName: "Fable",
      supportedEffortLevels: ["low", "high", "max"],
      value: "claude-fable-5-1[1m]",
    },
    {
      description: "Haiku 4.5 · Fastest for quick answers",
      displayName: "Haiku",
      value: "haiku",
    },
  ];
  const liveModels = [
    {
      description:
        "Opus 4.8 with 1M context · Best for everyday, complex tasks",
      id: "opus[1m]",
      label: "Opus",
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    },
    {
      description: "Fable 5.1 · Most capable for your hardest tasks",
      id: "claude-fable-5-1[1m]",
      label: "Fable",
      reasoningEfforts: ["low", "high", "max"],
    },
    {
      description: "Haiku 4.5 · Fastest for quick answers",
      id: "haiku",
      label: "Haiku",
    },
  ];
  assert.deepEqual(parseClaudeModelCatalog(liveRows), liveModels);
  assert.deepEqual(parseClaudeModelCatalog("junk"), []);
  assert.deepEqual(parseClaudeModelCatalog([{ value: "bare" }, {}, "x"]), [
    { id: "bare", label: "bare" },
  ]);

  assert.deepEqual(
    await fetchClaudeModelCatalog({
      listModels: () => Promise.resolve(liveRows),
    }),
    liveModels
  );
  assert.equal(
    await fetchClaudeModelCatalog({
      listModels: () => Promise.reject(new Error("sdk missing")),
    }),
    null
  );
  // The default reader fails closed when the Harness SDK is not installed.
  process.env.HARNESS_AI_HOME = path.join(buildDir, "empty-harness-home");
  assert.equal(await fetchClaudeModelCatalog(), null);

  // Offline first start serves the verified fallback (Fable included); a
  // live read replaces the served catalog (capture follows it), persists it
  // and memoizes for the TTL; a failed read after expiry keeps it.
  assert.ok(CLAUDE_MODELS.some((model) => model.label === "Fable"));
  const offline = () => Promise.reject(new Error("offline"));
  const catalogPath = path.join(buildDir, "home", "model-catalog.json");
  assert.deepEqual(
    await refreshClaudeModelCatalog({
      catalogPath,
      listModels: offline,
      now: 1,
    }),
    CLAUDE_MODELS
  );
  let reads = 0;
  const countingReader = () => {
    reads += 1;
    return Promise.resolve(liveRows);
  };
  assert.deepEqual(
    await refreshClaudeModelCatalog({
      catalogPath,
      listModels: countingReader,
      now: 1000,
    }),
    liveModels
  );
  await refreshClaudeModelCatalog({
    catalogPath,
    listModels: countingReader,
    now: 2000,
  });
  assert.equal(reads, 1);
  assert.deepEqual(providerDescriptorFacade.getCapturableModels("claude"), [
    {
      defaultReasoningEffort: "medium",
      id: "opus[1m]",
      label: "Opus",
      reasoningEfforts: [
        { id: "low", label: "Low" },
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
        { id: "xhigh", label: "x-High" },
        { id: "max", label: "Max" },
      ],
    },
    {
      defaultReasoningEffort: null,
      id: "claude-fable-5-1[1m]",
      label: "Fable",
      reasoningEfforts: [
        { id: "low", label: "Low" },
        { id: "high", label: "High" },
        { id: "max", label: "Max" },
      ],
    },
    {
      defaultReasoningEffort: null,
      id: "haiku",
      label: "Haiku",
      reasoningEfforts: [],
    },
  ]);
  await refreshClaudeModelCatalog({
    catalogPath,
    listModels: offline,
    now: 1000 + 16 * 60 * 1000,
  });
  assert.deepEqual(providerDescriptorFacade.getClaudeModels(), liveModels);

  // The persisted catalog round-trips: an offline restart serves it.
  const persisted = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.equal(persisted.fetchedAt, new Date(1000).toISOString());
  providerDescriptorFacade.setClaudeModels(CLAUDE_MODELS);
  const restartPath = path.join(buildDir, "restart", "model-catalog.json");
  await mkdir(path.dirname(restartPath), { recursive: true });
  writeFileSync(restartPath, JSON.stringify(persisted), "utf8");
  assert.deepEqual(
    await refreshClaudeModelCatalog({
      catalogPath: restartPath,
      listModels: offline,
      now: 5000,
    }),
    liveModels
  );

  console.log("claude model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
