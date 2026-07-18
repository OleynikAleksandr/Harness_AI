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
    fetchKimiModelContexts,
    parseKimiModelContexts,
    resolveKimiModelContexts,
  } = await import(
    pathToFileURL(path.join(buildDir, "kimi-model-catalog.js")).href
  );
  globalThis.__kimiCatalogTestStoreKey = "sk-test";

  // Payload replayed from the live 2026-07-18 endpoint probe.
  const livePayload = {
    data: [
      { context_length: 262_144, id: "kimi-for-coding" },
      { context_length: 262_144, id: "kimi-for-coding-highspeed" },
      { context_length: 1_048_576, id: "k3" },
    ],
    object: "list",
  };
  assert.deepEqual(parseKimiModelContexts(livePayload), {
    k3: 1_048_576,
    "kimi-for-coding": 262_144,
    "kimi-for-coding-highspeed": 262_144,
  });
  // Malformed rows and payloads degrade to an empty map.
  assert.deepEqual(parseKimiModelContexts("junk"), {});
  assert.deepEqual(
    parseKimiModelContexts({
      data: [{ context_length: -5, id: "bad" }, { id: "no-length" }, "junk"],
    }),
    {}
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
  assert.deepEqual(await fetchKimiModelContexts({ fetchImpl: okFetch }), {
    k3: 1_048_576,
    "kimi-for-coding": 262_144,
    "kimi-for-coding-highspeed": 262_144,
  });
  // A non-ok response and a thrown fetch both degrade to null.
  assert.equal(
    await fetchKimiModelContexts({
      fetchImpl: () => Promise.resolve({ ok: false }),
    }),
    null
  );
  assert.equal(
    await fetchKimiModelContexts({
      fetchImpl: () => Promise.reject(new Error("offline")),
    }),
    null
  );

  // Offline resolve returns the Core-catalog fallback without caching it, so
  // the next call retries the live read.
  globalThis.__kimiCatalogTestFetchCount = 0;
  const offline = await resolveKimiModelContexts({
    fetchImpl: () => Promise.reject(new Error("offline")),
    now: 1000,
  });
  assert.deepEqual(offline, {
    k3: 1_048_576,
    "kimi-for-coding": 262_144,
    "kimi-for-coding-highspeed": 262_144,
  });
  // A successful resolve memoizes for the TTL: the second call inside the
  // window performs no fetch, a call after expiry fetches again.
  const bumpedPayload = {
    data: [
      { context_length: 2_097_152, id: "k3" },
      { context_length: 262_144, id: "kimi-for-coding" },
    ],
  };
  const bumpedFetch = () => {
    globalThis.__kimiCatalogTestFetchCount += 1;
    return Promise.resolve({
      json: () => Promise.resolve(bumpedPayload),
      ok: true,
    });
  };
  const first = await resolveKimiModelContexts({
    fetchImpl: bumpedFetch,
    now: 1000,
  });
  assert.equal(first.k3, 2_097_152);
  // The live rows merge OVER the fallback: models the endpoint omitted keep
  // their Core-catalog windows.
  assert.equal(first["kimi-for-coding-highspeed"], 262_144);
  assert.equal(globalThis.__kimiCatalogTestFetchCount, 1);
  const second = await resolveKimiModelContexts({
    fetchImpl: bumpedFetch,
    now: 2000,
  });
  assert.equal(second.k3, 2_097_152);
  assert.equal(globalThis.__kimiCatalogTestFetchCount, 1);
  const expired = await resolveKimiModelContexts({
    fetchImpl: bumpedFetch,
    now: 1000 + 16 * 60 * 1000,
  });
  assert.equal(expired.k3, 2_097_152);
  assert.equal(globalThis.__kimiCatalogTestFetchCount, 2);

  console.log("kimi model catalog tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
