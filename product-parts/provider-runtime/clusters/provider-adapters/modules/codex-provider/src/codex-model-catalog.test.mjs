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
const buildDir = await mkdtemp(path.join(tmpdir(), "codex-model-catalog-"));

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
  // The app-server process is replaced by a recorder: the default reader is
  // exercised without spawning `codex`.
  writeFileSync(
    path.join(buildDir, "codex-app-server-process.js"),
    "export class CodexAppServerProcess { constructor(options) { globalThis.__codexCatalogProcess = { options, stopped: false }; } request(method, params) { globalThis.__codexCatalogProcess.request = { method, params }; return Promise.resolve({ data: [{ displayName: 'Stub', model: 'stub-model' }], nextCursor: null }); } stop() { globalThis.__codexCatalogProcess.stopped = true; return Promise.resolve(); } }\n",
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "codex-model-catalog.js"),
    ts
      .transpileModule(
        readFileSync(
          new URL("./codex-model-catalog.ts", import.meta.url),
          "utf8"
        ),
        { compilerOptions }
      )
      .outputText.replace(
        "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
        "./provider-descriptor-facade.js"
      )
      .replace(
        "./reference/app-server/process/codex-app-server-process.js",
        "./codex-app-server-process.js"
      ),
    "utf8"
  );
  const {
    fetchCodexModelCatalog,
    parseCodexModelCatalog,
    refreshCodexModelCatalog,
  } = await import(
    pathToFileURL(path.join(buildDir, "codex-model-catalog.js")).href
  );
  const { CODEX_MODELS, providerDescriptorFacade } = await import(
    pathToFileURL(path.join(buildDir, "provider-descriptor-facade.js")).href
  );

  // Rows replayed from the live 2026-11-02 `model/list` probe (trimmed):
  // hidden review/reserve models are not offered.
  const firstPage = {
    data: [
      {
        defaultReasoningEffort: "low",
        description: "Latest workhorse model for coding and everyday work.",
        displayName: "GPT-6.1-Sol",
        hidden: false,
        id: "gpt-6.1-sol",
        isDefault: true,
        model: "gpt-6.1-sol",
        supportedReasoningEfforts: [
          { description: "", reasoningEffort: "low" },
          { description: "", reasoningEffort: "ultra" },
        ],
      },
      {
        defaultReasoningEffort: "medium",
        displayName: "GPT-Reserve",
        hidden: true,
        model: "gpt-reserve",
        supportedReasoningEfforts: [{ reasoningEffort: "medium" }],
      },
    ],
    nextCursor: "page-2",
  };
  const secondPage = {
    data: [
      {
        defaultReasoningEffort: "medium",
        description: "Fast and affordable model for easier tasks.",
        displayName: "GPT-6-Luna",
        hidden: false,
        model: "gpt-6-luna",
        supportedReasoningEfforts: [
          { reasoningEffort: "medium" },
          { reasoningEffort: "max" },
        ],
      },
    ],
    nextCursor: null,
  };
  const liveModels = [
    {
      defaultReasoningEffort: "low",
      description: "Latest workhorse model for coding and everyday work.",
      id: "gpt-6.1-sol",
      label: "GPT-6.1-Sol",
      reasoningEfforts: ["low", "ultra"],
    },
    {
      defaultReasoningEffort: "medium",
      description: "Fast and affordable model for easier tasks.",
      id: "gpt-6-luna",
      label: "GPT-6-Luna",
      reasoningEfforts: ["medium", "max"],
    },
  ];
  assert.deepEqual(
    parseCodexModelCatalog([...firstPage.data, ...secondPage.data]),
    liveModels
  );
  assert.deepEqual(parseCodexModelCatalog("junk"), []);
  assert.deepEqual(
    parseCodexModelCatalog([{ id: "bare" }, { model: " " }, "junk"]),
    [{ id: "bare", label: "bare" }]
  );

  // Pagination follows `nextCursor`; a failed or malformed page is null.
  const cursors = [];
  const pagedReader = (cursor) => {
    cursors.push(cursor);
    return Promise.resolve(cursor === null ? firstPage : secondPage);
  };
  assert.deepEqual(
    await fetchCodexModelCatalog({ listModels: pagedReader }),
    liveModels
  );
  assert.deepEqual(cursors, [null, "page-2"]);
  assert.equal(
    await fetchCodexModelCatalog({
      listModels: () => Promise.reject(new Error("codex missing")),
    }),
    null
  );
  assert.equal(
    await fetchCodexModelCatalog({ listModels: () => Promise.resolve({}) }),
    null
  );

  // The default reader starts one app-server under the Harness Codex home,
  // asks for visible models and stops the process after the read.
  process.env.HARNESS_AI_HOME = path.join(buildDir, "harness-home");
  assert.deepEqual(await fetchCodexModelCatalog(), [
    { id: "stub-model", label: "Stub" },
  ]);
  assert.deepEqual(globalThis.__codexCatalogProcess.options, {
    environment: {
      CODEX_HOME: path.join(
        buildDir,
        "harness-home",
        "providers",
        "codex",
        "home"
      ),
    },
  });
  assert.deepEqual(globalThis.__codexCatalogProcess.request, {
    method: "model/list",
    params: { cursor: null, includeHidden: false },
  });
  assert.equal(globalThis.__codexCatalogProcess.stopped, true);

  // Offline first start serves the verified fallback; a live read replaces
  // the served catalog (capture follows it), persists it and memoizes for
  // the TTL; a failed read after expiry keeps it.
  const offline = () => Promise.reject(new Error("offline"));
  const catalogPath = path.join(buildDir, "home", "model-catalog.json");
  assert.deepEqual(
    await refreshCodexModelCatalog({
      catalogPath,
      listModels: offline,
      now: 1,
    }),
    CODEX_MODELS
  );
  let reads = 0;
  const countingReader = (cursor) => {
    reads += 1;
    return pagedReader(cursor);
  };
  assert.deepEqual(
    await refreshCodexModelCatalog({
      catalogPath,
      listModels: countingReader,
      now: 1000,
    }),
    liveModels
  );
  assert.equal(reads, 2);
  await refreshCodexModelCatalog({
    catalogPath,
    listModels: countingReader,
    now: 2000,
  });
  assert.equal(reads, 2);
  assert.deepEqual(providerDescriptorFacade.getCapturableModels("codex"), [
    {
      defaultReasoningEffort: "low",
      id: "gpt-6.1-sol",
      label: "GPT-6.1-Sol",
      reasoningEfforts: [
        { id: "low", label: "Low" },
        { id: "ultra", label: "Ultra" },
      ],
    },
    {
      defaultReasoningEffort: "medium",
      id: "gpt-6-luna",
      label: "GPT-6-Luna",
      reasoningEfforts: [
        { id: "medium", label: "Medium" },
        { id: "max", label: "Max" },
      ],
    },
  ]);
  await refreshCodexModelCatalog({
    catalogPath,
    listModels: offline,
    now: 1000 + 16 * 60 * 1000,
  });
  assert.deepEqual(providerDescriptorFacade.getCodexModels(), liveModels);

  // `force` re-reads inside the TTL (right after a Codex CLI update).
  const forcedAt = 1000 + 17 * 60 * 1000;
  await refreshCodexModelCatalog({
    catalogPath,
    listModels: countingReader,
    now: forcedAt,
  });
  const readsBeforeForce = reads;
  await refreshCodexModelCatalog({
    catalogPath,
    listModels: countingReader,
    now: forcedAt + 1000,
  });
  assert.equal(reads, readsBeforeForce);
  await refreshCodexModelCatalog({
    catalogPath,
    force: true,
    listModels: countingReader,
    now: forcedAt + 2000,
  });
  assert.ok(reads > readsBeforeForce);

  // The persisted catalog round-trips: an offline restart serves it.
  const persisted = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.equal(persisted.fetchedAt, new Date(forcedAt + 2000).toISOString());
  providerDescriptorFacade.setCodexModels(CODEX_MODELS);
  const restartPath = path.join(buildDir, "restart", "model-catalog.json");
  await mkdir(path.dirname(restartPath), { recursive: true });
  writeFileSync(restartPath, JSON.stringify(persisted), "utf8");
  assert.deepEqual(
    await refreshCodexModelCatalog({
      catalogPath: restartPath,
      listModels: offline,
      now: 5000,
    }),
    liveModels
  );

  console.log("codex model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
