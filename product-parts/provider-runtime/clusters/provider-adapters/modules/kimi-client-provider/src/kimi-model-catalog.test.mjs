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

// The auth store behind the shared key resolver is mocked before
// transpilation (same pattern as kimi-usage-limits.test.mjs).
const usageLimitsCompiled = ts.transpileModule(
  readFileSync(
    new URL("./kimi-usage-limits.ts", import.meta.url),
    "utf8"
  ).replace(
    /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => globalThis.__kimiCatalogTestStoreKey ?? null };\n"
  ),
  { compilerOptions }
).outputText;

const descriptorCompiled = ts.transpileModule(
  readFileSync(
    new URL(
      "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts",
      import.meta.url
    ),
    "utf8"
  ),
  { compilerOptions }
).outputText;

const catalogCompiled = ts.transpileModule(
  readFileSync(
    new URL("./kimi-model-catalog.ts", import.meta.url),
    "utf8"
  ).replace(
    "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
    "./provider-descriptor-facade.js"
  ),
  { compilerOptions }
).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "kimi-model-catalog-"));

try {
  writeFileSync(
    path.join(buildDir, "kimi-usage-limits.js"),
    usageLimitsCompiled,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "provider-descriptor-facade.js"),
    descriptorCompiled,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "kimi-model-catalog.js"),
    catalogCompiled,
    "utf8"
  );
  const {
    fetchKimiModelCatalog,
    parseKimiModelCatalog,
    refreshKimiModelCatalog,
    resolveKimiModelContexts,
  } = await import(
    pathToFileURL(path.join(buildDir, "kimi-model-catalog.js")).href
  );
  const { KIMI_CLIENT_MODELS, providerDescriptorFacade } = await import(
    pathToFileURL(path.join(buildDir, "provider-descriptor-facade.js")).href
  );
  globalThis.__kimiCatalogTestStoreKey = "sk-test";

  // Rows replayed from the live 2026-11-02 endpoint probe (trimmed): the
  // efforts come from `think_efforts`, older servers expose them under
  // `reasoning.effort`, and a model without efforts has none.
  const livePayload = {
    data: [
      {
        context_length: 1_048_576,
        display_name: "K2.8 Preview",
        id: "kimi-for-coding",
        think_efforts: {
          default_effort: "max",
          support: true,
          valid_efforts: ["low", "high", "max"],
        },
      },
      {
        context_length: 262_144,
        display_name: "K2.7 Code Highspeed",
        id: "kimi-for-coding-highspeed",
        reasoning: { type: "only" },
      },
      {
        context_length: 1_048_576,
        display_name: "K3.1 Pro",
        id: "k3.1-pro",
        reasoning: {
          effort: { default: "high", valid: ["low", "high", "max"] },
          type: "only",
        },
      },
    ],
    object: "list",
  };
  const liveModels = [
    {
      contextLength: 1_048_576,
      defaultReasoningEffort: "max",
      id: "kimi-for-coding",
      label: "K2.8 Preview",
      reasoningEfforts: ["low", "high", "max"],
    },
    {
      contextLength: 262_144,
      id: "kimi-for-coding-highspeed",
      label: "K2.7 Code Highspeed",
    },
    {
      contextLength: 1_048_576,
      defaultReasoningEffort: "high",
      id: "k3.1-pro",
      label: "K3.1 Pro",
      reasoningEfforts: ["low", "high", "max"],
    },
  ];
  assert.deepEqual(parseKimiModelCatalog(livePayload), liveModels);
  // Malformed payloads and rows are skipped; a row without a display name or
  // context keeps its id as the label and no window.
  assert.deepEqual(parseKimiModelCatalog("junk"), []);
  assert.deepEqual(
    parseKimiModelCatalog({
      data: [{ context_length: -5, id: "bare" }, { id: " " }, "junk"],
    }),
    [{ id: "bare", label: "bare" }]
  );

  const okFetch = (url, init) => {
    assert.equal(url, "https://api.kimi.com/coding/v1/models");
    assert.equal(init.headers.Authorization, "Bearer sk-test");
    globalThis.__kimiCatalogTestFetchCount =
      (globalThis.__kimiCatalogTestFetchCount ?? 0) + 1;
    return Promise.resolve({
      json: () => Promise.resolve(livePayload),
      ok: true,
    });
  };
  assert.deepEqual(
    await fetchKimiModelCatalog({ fetchImpl: okFetch }),
    liveModels
  );
  // A non-ok response and a thrown fetch both degrade to null.
  assert.equal(
    await fetchKimiModelCatalog({
      fetchImpl: () => Promise.resolve({ ok: false }),
    }),
    null
  );
  assert.equal(
    await fetchKimiModelCatalog({
      fetchImpl: () => Promise.reject(new Error("offline")),
    }),
    null
  );

  // Offline first start: nothing persisted, so the verified fallback stays
  // served and the next call retries the live read.
  const offlineFetch = () => Promise.reject(new Error("offline"));
  const catalogPath = path.join(buildDir, "home", "model-catalog.json");
  globalThis.__kimiCatalogTestFetchCount = 0;
  assert.deepEqual(
    await refreshKimiModelCatalog({
      catalogPath,
      fetchImpl: offlineFetch,
      now: 1000,
    }),
    KIMI_CLIENT_MODELS
  );
  assert.equal(
    providerDescriptorFacade.getClientModels("kimi-client"),
    KIMI_CLIENT_MODELS
  );

  // A live read replaces the served catalog (capture and client models
  // follow it), persists it and memoizes for the TTL.
  const first = await resolveKimiModelContexts({
    catalogPath,
    fetchImpl: okFetch,
    now: 1000,
  });
  assert.deepEqual(first, {
    "k3.1-pro": 1_048_576,
    "kimi-for-coding": 1_048_576,
    "kimi-for-coding-highspeed": 262_144,
  });
  assert.equal(globalThis.__kimiCatalogTestFetchCount, 1);
  assert.deepEqual(
    providerDescriptorFacade.getClientModels("kimi-client"),
    liveModels
  );
  assert.deepEqual(
    providerDescriptorFacade
      .getCapturableModels("kimi")
      .map((model) => model.id),
    ["kimi-for-coding", "kimi-for-coding-highspeed", "k3.1-pro"]
  );
  await resolveKimiModelContexts({
    catalogPath,
    fetchImpl: okFetch,
    now: 2000,
  });
  assert.equal(globalThis.__kimiCatalogTestFetchCount, 1);
  // After expiry a failed read keeps the served live catalog.
  await refreshKimiModelCatalog({
    catalogPath,
    fetchImpl: offlineFetch,
    now: 1000 + 16 * 60 * 1000,
  });
  assert.deepEqual(providerDescriptorFacade.getKimiClientModels(), liveModels);

  // The persisted catalog round-trips through the same parser: a restart
  // (fresh descriptor state) that is offline serves the last live catalog.
  const persisted = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.equal(persisted.fetchedAt, new Date(1000).toISOString());
  assert.deepEqual(parseKimiModelCatalog(persisted), liveModels);
  providerDescriptorFacade.setKimiClientModels(KIMI_CLIENT_MODELS);
  const restartPath = path.join(buildDir, "restart", "model-catalog.json");
  await mkdir(path.dirname(restartPath), { recursive: true });
  writeFileSync(restartPath, JSON.stringify(persisted), "utf8");
  assert.deepEqual(
    await refreshKimiModelCatalog({
      catalogPath: restartPath,
      fetchImpl: offlineFetch,
      now: 5000,
    }),
    liveModels
  );
  // An empty catalog never removes every model.
  providerDescriptorFacade.setKimiClientModels([]);
  assert.deepEqual(providerDescriptorFacade.getKimiClientModels(), liveModels);

  console.log("kimi model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
