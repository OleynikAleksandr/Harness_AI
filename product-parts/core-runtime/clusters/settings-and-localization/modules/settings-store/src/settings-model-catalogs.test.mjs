import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ES2022,
  target: ts.ScriptTarget.ES2022,
};
const buildDir = await mkdtemp(path.join(tmpdir(), "settings-model-catalogs-"));
const transpile = (url) =>
  ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions }).outputText;

try {
  writeFileSync(
    path.join(buildDir, "provider-descriptor-facade.js"),
    transpile(
      new URL(
        "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts",
        import.meta.url
      )
    ),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "settings-model-catalogs.js"),
    transpile(new URL("./settings-model-catalogs.ts", import.meta.url)).replace(
      "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
      "./provider-descriptor-facade.js"
    ),
    "utf8"
  );
  const { providerDescriptorFacade } = await import(
    pathToFileURL(path.join(buildDir, "provider-descriptor-facade.js")).href
  );
  const {
    listProviderModelCatalogs,
    normalizeCatalogDefaultModel,
    normalizeCatalogEfforts,
  } = await import(
    pathToFileURL(path.join(buildDir, "settings-model-catalogs.js")).href
  );

  // Live rows replace the served catalogs; Settings options follow them with
  // each model's own effort list and default.
  providerDescriptorFacade.setClaudeModels([
    {
      description: "Opus with 1M context",
      id: "opus[1m]",
      label: "Opus",
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    },
    {
      id: "claude-fable-5-1[1m]",
      label: "Fable",
      reasoningEfforts: ["low", "high", "max"],
    },
    { id: "haiku", label: "Haiku" },
  ]);
  providerDescriptorFacade.setCodexModels([
    {
      defaultReasoningEffort: "low",
      id: "gpt-7-sol",
      label: "GPT-7 Sol",
      reasoningEfforts: ["low", "medium", "high", "ultra", "unknown"],
    },
  ]);
  providerDescriptorFacade.setKimiClientModels([
    {
      id: "k3.1-pro",
      label: "K3.1 Pro",
      reasoningEfforts: ["low", "high", "max"],
    },
    { id: "kimi-for-coding", label: "Kimi for Coding" },
  ]);
  const catalogs = listProviderModelCatalogs();
  assert.deepEqual(catalogs.claude, [
    {
      defaultReasoningEffort: "medium",
      description: "Opus with 1M context",
      id: "opus[1m]",
      label: "Opus",
      reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
    },
    {
      defaultReasoningEffort: "high",
      id: "claude-fable-5-1[1m]",
      label: "Fable",
      reasoningEfforts: ["low", "high", "max"],
    },
    {
      defaultReasoningEffort: null,
      id: "haiku",
      label: "Haiku",
      reasoningEfforts: [],
    },
  ]);
  assert.deepEqual(catalogs.codex, [
    {
      defaultReasoningEffort: "low",
      id: "gpt-7-sol",
      label: "GPT-7 Sol",
      reasoningEfforts: ["low", "medium", "high", "ultra"],
    },
  ]);
  assert.equal(catalogs.kimiClient[0].defaultReasoningEffort, "high");
  assert.equal(catalogs.kimiClient[1].defaultReasoningEffort, null);

  // Default model: stored id, legacy bare Claude alias, preferred id, first.
  assert.equal(
    normalizeCatalogDefaultModel(catalogs.claude, "opus", "sonnet"),
    "opus[1m]"
  );
  assert.equal(
    normalizeCatalogDefaultModel(catalogs.claude, "haiku", "sonnet"),
    "haiku"
  );
  // A catalog alias without the suffix accepts a saved suffixed id.
  const aliasCatalog = [
    { ...catalogs.claude[0], id: "opus" },
    ...catalogs.claude.slice(1),
  ];
  assert.equal(
    normalizeCatalogDefaultModel(aliasCatalog, "opus[1m]", "sonnet"),
    "opus"
  );
  assert.deepEqual(
    normalizeCatalogEfforts(aliasCatalog, { "opus[1m]": "max" }),
    { "claude-fable-5-1[1m]": "high", opus: "max" }
  );
  assert.equal(
    normalizeCatalogDefaultModel(catalogs.claude, "sonnet", "sonnet"),
    "opus[1m]"
  );
  assert.equal(
    normalizeCatalogDefaultModel(catalogs.codex, "gpt-5.4-mini", null),
    "gpt-7-sol"
  );
  assert.equal(
    normalizeCatalogDefaultModel(catalogs.kimiClient, 42, "kimi-for-coding"),
    "kimi-for-coding"
  );
  assert.equal(normalizeCatalogDefaultModel([], "x", "fallback"), "fallback");

  // Efforts: one level per effort-capable catalog model; supported stored
  // levels survive (also under an id differing by the context suffix),
  // others reset to the model default, and entries outside the catalog are
  // dropped.
  assert.deepEqual(
    normalizeCatalogEfforts(catalogs.claude, {
      haiku: "high",
      opus: "xhigh",
      "claude-fable-5-1[1m]": "medium",
      sonnet: "max",
    }),
    { "claude-fable-5-1[1m]": "high", "opus[1m]": "xhigh" }
  );
  assert.deepEqual(normalizeCatalogEfforts(catalogs.codex, "junk"), {
    "gpt-7-sol": "low",
  });
  assert.deepEqual(
    normalizeCatalogEfforts(catalogs.kimiClient, { "k3.1-pro": "max" }),
    { "k3.1-pro": "max" }
  );

  console.log("settings model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
