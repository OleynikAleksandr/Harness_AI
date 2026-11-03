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
    path.join(buildDir, "npm-runner.js"),
    ts.transpileModule(
      readFileSync(
        new URL("./reference/installer/npm-runner.ts", import.meta.url),
        "utf8"
      ),
      { compilerOptions }
    ).outputText,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "claude-sdk-updates.js"),
    ts
      .transpileModule(
        readFileSync(
          new URL("./claude-sdk-updates.ts", import.meta.url),
          "utf8"
        ),
        { compilerOptions }
      )
      .outputText.replace(
        "./reference/installer/npm-runner.js",
        "./npm-runner.js"
      ),
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

  // Rows replayed from the live 2026-11-03 `supportedModels()` read of SDK
  // 0.3.317 in the packaged app: only the family aliases are served — the
  // `default` row and pinned versions (`claude-opus-4-8`, `opus-4-6[1m]`)
  // are skipped; a row without efforts keeps none.
  const opusDescription = "Best for everyday, complex tasks";
  const liveRows = [
    {
      description: opusDescription,
      displayName: "Default (recommended)",
      supportedEffortLevels: ["low", "medium", "high", "xhigh", "max"],
      value: "default",
    },
    {
      description: opusDescription,
      displayName: "Opus 5.5",
      supportedEffortLevels: ["low", "medium", "high", "xhigh", "max"],
      value: "opus",
    },
    {
      description: "Most capable for your hardest and longest-running tasks",
      displayName: "Fable 5.1",
      supportedEffortLevels: ["low", "high", "max"],
      value: "fable",
    },
    {
      description: "Fastest for quick answers",
      displayName: "Haiku 5.5",
      value: "haiku",
    },
    {
      description: opusDescription,
      displayName: "Opus 4.8",
      supportedEffortLevels: ["low", "medium", "high", "xhigh", "max"],
      value: "claude-opus-4-8",
    },
    {
      description: opusDescription,
      displayName: "Opus 4.6",
      value: "opus-4-6[1m]",
    },
  ];
  const liveModels = [
    {
      description: opusDescription,
      id: "opus",
      label: "Opus 5.5",
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    },
    {
      description: "Most capable for your hardest and longest-running tasks",
      id: "fable",
      label: "Fable 5.1",
      reasoningEfforts: ["low", "high", "max"],
    },
    {
      description: "Fastest for quick answers",
      id: "haiku",
      label: "Haiku 5.5",
    },
  ];
  // A 1M-context alias stays an alias.
  assert.deepEqual(
    parseClaudeModelCatalog([{ displayName: "Opus", value: "opus[1m]" }]),
    [{ id: "opus[1m]", label: "Opus" }]
  );
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

  // Offline first start serves the verified alias fallback; a
  // live read replaces the served catalog (capture follows it), persists it
  // and memoizes for the TTL; a failed read after expiry keeps it.
  assert.deepEqual(
    CLAUDE_MODELS.map((model) => model.id),
    ["opus", "fable", "sonnet", "haiku"]
  );
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
      id: "opus",
      label: "Opus 5.5",
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
      id: "fable",
      label: "Fable 5.1",
      reasoningEfforts: [
        { id: "low", label: "Low" },
        { id: "high", label: "High" },
        { id: "max", label: "Max" },
      ],
    },
    {
      defaultReasoningEffort: null,
      id: "haiku",
      label: "Haiku 5.5",
      reasoningEfforts: [],
    },
  ]);
  await refreshClaudeModelCatalog({
    catalogPath,
    listModels: offline,
    now: 1000 + 16 * 60 * 1000,
  });
  assert.deepEqual(providerDescriptorFacade.getClaudeModels(), liveModels);

  // `force` re-reads inside the TTL (right after a Harness SDK update) and
  // serves the new SDK's descriptions.
  const updatedRows = liveRows.map((row) =>
    row.value === "opus" ? { ...row, displayName: "Opus 5.6" } : row
  );
  const freshAt = 1000 + 17 * 60 * 1000;
  await refreshClaudeModelCatalog({
    catalogPath,
    listModels: () => Promise.resolve(liveRows),
    now: freshAt,
  });
  assert.equal(
    (
      await refreshClaudeModelCatalog({
        catalogPath,
        listModels: () => Promise.resolve(updatedRows),
        now: freshAt + 1000,
      })
    )[0].label,
    "Opus 5.5"
  );
  assert.equal(
    (
      await refreshClaudeModelCatalog({
        catalogPath,
        force: true,
        listModels: () => Promise.resolve(updatedRows),
        now: freshAt + 2000,
      })
    )[0].label,
    "Opus 5.6"
  );

  // The persisted catalog round-trips: an offline restart serves it.
  const persisted = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.equal(persisted.fetchedAt, new Date(freshAt + 2000).toISOString());
  providerDescriptorFacade.setClaudeModels(CLAUDE_MODELS);
  const restartPath = path.join(buildDir, "restart", "model-catalog.json");
  await mkdir(path.dirname(restartPath), { recursive: true });
  writeFileSync(restartPath, JSON.stringify(persisted), "utf8");
  const updatedModels = liveModels.map((model) =>
    model.id === "opus" ? { ...model, label: "Opus 5.6" } : model
  );
  assert.deepEqual(
    await refreshClaudeModelCatalog({
      catalogPath: restartPath,
      listModels: offline,
      now: 5000,
    }),
    updatedModels
  );

  console.log("claude model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
