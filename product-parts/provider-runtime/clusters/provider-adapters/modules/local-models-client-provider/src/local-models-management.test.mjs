import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./local-models-management.ts", import.meta.url),
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "local-models-management-"));

const jsonResponse = (payload) => ({
  json: () => Promise.resolve(payload),
  ok: true,
});

// URL-suffix keyed fetch stub; unrouted URLs behave like an absent endpoint.
const stubFetch = (routes) => {
  const calls = [];
  const fetchImplementation = (url, init) => {
    calls.push({ init, url });
    for (const [suffix, handler] of Object.entries(routes)) {
      if (url.endsWith(suffix)) {
        const payload = typeof handler === "function" ? handler(init) : handler;
        return Promise.resolve(jsonResponse(payload));
      }
    }
    return Promise.reject(new Error(`connect ECONNREFUSED ${url}`));
  };
  return { calls, fetchImplementation };
};

const V1_CATALOG = {
  models: [
    {
      type: "llm",
      key: "qwen-coder",
      display_name: "Qwen Coder",
      max_context_length: 262_144,
      loaded_instances: [
        { id: "qwen-coder", config: { context_length: 8192 } },
      ],
      capabilities: { trained_for_tool_use: true, vision: false },
    },
    {
      type: "embedding",
      key: "embed-mini",
      display_name: "Embed Mini",
      max_context_length: 2048,
    },
    {
      type: "llm",
      key: "gemma-local",
      display_name: "Gemma Local",
      max_context_length: 131_072,
      loaded_instances: [],
      capabilities: { trained_for_tool_use: false },
    },
  ],
};

try {
  writeFileSync(
    path.join(buildDir, "local-models-management.js"),
    compiled,
    "utf8"
  );
  const {
    ensureLocalModelContext,
    listLocalModelEntries,
    loadLocalModel,
    unloadLocalModel,
  } = await import(
    pathToFileURL(path.join(buildDir, "local-models-management.js")).href
  );

  // v1 catalog: structured entries, embeddings skipped, /v1 suffix stripped.
  const v1 = stubFetch({ "/api/v1/models": V1_CATALOG });
  const entries = await listLocalModelEntries({
    baseUrl: "http://127.0.0.1:1234/v1",
    fetchImplementation: v1.fetchImplementation,
  });
  assert.equal(v1.calls[0].url, "http://127.0.0.1:1234/api/v1/models");
  assert.deepEqual(entries, [
    {
      displayName: "Qwen Coder",
      key: "qwen-coder",
      loadedContextLength: 8192,
      loadedInstanceId: "qwen-coder",
      maxContextLength: 262_144,
      supportsTools: true,
    },
    {
      displayName: "Gemma Local",
      key: "gemma-local",
      loadedContextLength: null,
      loadedInstanceId: null,
      maxContextLength: 131_072,
      supportsTools: false,
    },
  ]);

  // v0 fallback for older LM Studio.
  const v0 = stubFetch({
    "/api/v0/models": {
      data: [
        {
          id: "old-model",
          type: "llm",
          max_context_length: 32_768,
          loaded_context_length: 4096,
        },
      ],
    },
  });
  const v0Entries = await listLocalModelEntries({
    baseUrl: "http://127.0.0.1:1234",
    fetchImplementation: v0.fetchImplementation,
  });
  assert.equal(v0Entries[0].maxContextLength, 32_768);
  assert.equal(v0Entries[0].loadedContextLength, 4096);

  // Plain /v1/models ids (Ollama / llama.cpp): detection-only entries.
  const plain = stubFetch({
    "/v1/models": { data: [{ id: "qwen2" }, { id: "deepseek" }] },
  });
  const plainEntries = await listLocalModelEntries({
    baseUrl: "http://127.0.0.1:11434",
    fetchImplementation: plain.fetchImplementation,
  });
  assert.deepEqual(
    plainEntries.map((entry) => entry.key),
    ["qwen2", "deepseek"]
  );
  assert.equal(plainEntries[0].maxContextLength, null);

  // load: posts the wish and returns the echoed applied window.
  const loader = stubFetch({
    "/api/v1/models/load": (init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.model, "qwen-coder");
      assert.equal(body.context_length, 16_384);
      assert.equal(body.echo_load_config, true);
      return {
        instance_id: "qwen-coder",
        status: "loaded",
        load_config: { context_length: 16_384 },
      };
    },
  });
  assert.equal(
    await loadLocalModel({
      baseUrl: "http://127.0.0.1:1234",
      contextLength: 16_384,
      fetchImplementation: loader.fetchImplementation,
      model: "qwen-coder",
    }),
    16_384
  );

  // unload posts the instance id.
  const unloader = stubFetch({
    "/api/v1/models/unload": (init) => {
      assert.deepEqual(JSON.parse(init.body), { instance_id: "qwen-coder" });
      return { instance_id: "qwen-coder" };
    },
  });
  assert.equal(
    await unloadLocalModel({
      baseUrl: "http://127.0.0.1:1234",
      fetchImplementation: unloader.fetchImplementation,
      instanceId: "qwen-coder",
    }),
    true
  );

  // ensure: already matching -> no load/unload calls fired.
  const matching = stubFetch({ "/api/v1/models": V1_CATALOG });
  assert.equal(
    await ensureLocalModelContext({
      baseUrl: "http://127.0.0.1:1234",
      desiredContextLength: 8192,
      fetchImplementation: matching.fetchImplementation,
      model: "qwen-coder",
    }),
    8192
  );
  assert.equal(
    matching.calls.some((call) => call.url.includes("/load")),
    false
  );

  // ensure: differing wish -> unload the instance, load with the new window.
  const reload = stubFetch({
    "/api/v1/models": V1_CATALOG,
    "/api/v1/models/load": {
      instance_id: "qwen-coder",
      status: "loaded",
      load_config: { context_length: 32_768 },
    },
    "/api/v1/models/unload": { instance_id: "qwen-coder" },
  });
  assert.equal(
    await ensureLocalModelContext({
      baseUrl: "http://127.0.0.1:1234",
      desiredContextLength: 32_768,
      fetchImplementation: reload.fetchImplementation,
      model: "qwen-coder",
    }),
    32_768
  );
  const reloadUrls = reload.calls.map((call) => call.url);
  assert.ok(reloadUrls.some((url) => url.endsWith("/api/v1/models/unload")));
  assert.ok(reloadUrls.some((url) => url.endsWith("/api/v1/models/load")));

  // ensure: no wish or a plain-id server (no management surface) -> null.
  assert.equal(
    await ensureLocalModelContext({
      baseUrl: "http://127.0.0.1:1234",
      desiredContextLength: 0,
      fetchImplementation: matching.fetchImplementation,
      model: "qwen-coder",
    }),
    null
  );
  assert.equal(
    await ensureLocalModelContext({
      baseUrl: "http://127.0.0.1:11434",
      desiredContextLength: 4096,
      fetchImplementation: plain.fetchImplementation,
      model: "qwen2",
    }),
    null
  );

  console.log("local-models-management tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
