import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./local-models-context-length.ts", import.meta.url),
  "utf8"
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(
  path.join(tmpdir(), "local-models-context-length-")
);

const jsonResponse = (payload) => ({
  json: () => Promise.resolve(payload),
  ok: true,
});
const failedResponse = {
  json: () => Promise.reject(new Error("no body")),
  ok: false,
};

// A fetch stub keyed by URL suffix; unknown URLs report a connection error
// the way an absent local server would.
const stubFetch = (routes) => {
  const calls = [];
  const fetchImplementation = (url, init) => {
    calls.push({ init, url });
    for (const [suffix, payload] of Object.entries(routes)) {
      if (url.endsWith(suffix)) {
        return Promise.resolve(
          payload === null ? failedResponse : jsonResponse(payload)
        );
      }
    }
    return Promise.reject(new Error(`connect ECONNREFUSED ${url}`));
  };
  return { calls, fetchImplementation };
};

try {
  writeFileSync(
    path.join(buildDir, "local-models-context-length.js"),
    compiled,
    "utf8"
  );
  const { detectLocalModelsContextLength } = await import(
    pathToFileURL(path.join(buildDir, "local-models-context-length.js")).href
  );

  // The settings override wins without touching the network.
  const overrideProbe = stubFetch({});
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "http://127.0.0.1:1234",
      contextLengthOverride: 4096,
      fetchImplementation: overrideProbe.fetchImplementation,
      model: "qwen-coder",
    }),
    4096
  );
  assert.equal(overrideProbe.calls.length, 0);

  // LM Studio answers first; the loaded context beats the model maximum, and
  // the /v1 suffix is stripped before probing.
  const lmStudio = stubFetch({
    "/api/v0/models": {
      data: [
        { id: "other", max_context_length: 4096 },
        {
          id: "qwen-coder",
          loaded_context_length: 8192,
          max_context_length: 32_768,
        },
      ],
    },
  });
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "http://127.0.0.1:1234/v1",
      contextLengthOverride: 0,
      fetchImplementation: lmStudio.fetchImplementation,
      model: "qwen-coder",
    }),
    8192
  );
  assert.equal(lmStudio.calls[0].url, "http://127.0.0.1:1234/api/v0/models");

  // Ollama: the LM Studio probe fails, /api/show reports the family-prefixed
  // context_length key.
  const ollama = stubFetch({
    "/api/show": { model_info: { "qwen2.context_length": 131_072 } },
  });
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "http://127.0.0.1:11434",
      contextLengthOverride: 0,
      fetchImplementation: ollama.fetchImplementation,
      model: "qwen2",
    }),
    131_072
  );
  const ollamaShowCall = ollama.calls.find((call) =>
    call.url.endsWith("/api/show")
  );
  assert.equal(ollamaShowCall.init.method, "POST");
  assert.deepEqual(JSON.parse(ollamaShowCall.init.body), { model: "qwen2" });

  // llama.cpp: earlier probes fail, /props reports the allocated n_ctx.
  const llamaCpp = stubFetch({
    "/props": { default_generation_settings: { n_ctx: 16_384 } },
  });
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "http://127.0.0.1:8080",
      contextLengthOverride: 0,
      fetchImplementation: llamaCpp.fetchImplementation,
      model: "deepseek",
    }),
    16_384
  );

  // Nothing answers: null keeps the telemetry default.
  const silent = stubFetch({});
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "http://127.0.0.1:9999",
      contextLengthOverride: 0,
      fetchImplementation: silent.fetchImplementation,
      model: "qwen-coder",
    }),
    null
  );
  assert.equal(silent.calls.length, 3);

  // An empty base URL never probes.
  assert.equal(
    await detectLocalModelsContextLength({
      baseUrl: "   ",
      contextLengthOverride: 0,
      fetchImplementation: silent.fetchImplementation,
      model: "qwen-coder",
    }),
    null
  );

  console.log("local-models-context-length tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
