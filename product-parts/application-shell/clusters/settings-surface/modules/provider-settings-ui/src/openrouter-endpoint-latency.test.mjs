import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./openrouter-endpoint-latency.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { testOpenRouterEndpointLatency } = await import(moduleUrl);

const calls = [];
const okFetch = (url, options) => {
  calls.push({ options, url });
  return Promise.resolve({
    json: async () => ({
      choices: [
        {
          message: {
            content: "ok __HARNESS_OPENROUTER_LATENCY_MARKER__",
          },
        },
      ],
    }),
    ok: true,
    status: 200,
  });
};

const okResult = await testOpenRouterEndpointLatency({
  apiKey: "sk-test",
  baseUrl: "https://openrouter.ai/api/v1/",
  endpointTag: "google-ai-studio",
  fetchImplementation: okFetch,
  model: "google/gemini-test",
});
assert.equal(okResult.ok, true);
assert.equal(okResult.endpointTag, "google-ai-studio");
assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
const okHeaders = calls[0].options.headers;
assert.equal(okHeaders.Authorization, "Bearer sk-test");
assert.equal(okHeaders["Content-Type"], "application/json");
const okBody = JSON.parse(calls[0].options.body);
assert.equal(okBody.model, "google/gemini-test");
assert.deepEqual(okBody.provider, {
  allow_fallbacks: false,
  order: ["google-ai-studio"],
});
assert.deepEqual(okBody.reasoning, { enabled: false, exclude: true });

let retryCalls = 0;
const retryFetch = (_url, options) => {
  retryCalls += 1;
  const body = JSON.parse(options.body);
  if (retryCalls === 1) {
    assert.ok(body.reasoning);
    return Promise.resolve({
      json: async () => ({
        error: {
          message:
            "Reasoning is mandatory for this endpoint and cannot be disabled.",
        },
      }),
      ok: false,
      status: 400,
    });
  }
  assert.equal(body.reasoning, undefined);
  return Promise.resolve({
    json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    ok: true,
    status: 200,
  });
};

const retryResult = await testOpenRouterEndpointLatency({
  endpointTag: "reasoning-provider",
  fetchImplementation: retryFetch,
  model: "provider/model",
});
assert.equal(retryResult.ok, true);
assert.equal(retryCalls, 2);
