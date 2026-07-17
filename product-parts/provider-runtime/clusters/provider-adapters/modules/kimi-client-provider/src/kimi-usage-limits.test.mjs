import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// The auth store is mocked before transpilation; behavior is steered via a
// globalThis knob so both key sources are covered.
const source = readFileSync(
  new URL("./kimi-usage-limits.ts", import.meta.url),
  "utf8"
).replace(
  /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
  "const providerAuthStoreFacade = { getApiKey: () => globalThis.__kimiLimitsTestStoreKey ?? null };\n"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const root = await mkdtemp(path.join(tmpdir(), "kimi-usage-limits-"));

try {
  const modulePath = path.join(root, "kimi-usage-limits.js");
  writeFileSync(modulePath, compiled, "utf8");
  const { buildKimiUsageLimitsEvent, readKimiUsageLimitsEvent } = await import(
    pathToFileURL(modulePath).href
  );

  // Payload replayed from the live 2026-07-17 endpoint probe (numeric
  // fields arrive as strings; limits[0] is the 300-minute window).
  const livePayload = {
    limits: [
      {
        detail: {
          limit: "100",
          remaining: "76",
          resetTime: "2026-07-17T13:13:18.805364Z",
          used: "24",
        },
        window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
      },
    ],
    usage: {
      limit: "100",
      remaining: "92",
      resetTime: "2026-07-23T17:13:18.805364Z",
      used: "8",
    },
  };
  const event = buildKimiUsageLimitsEvent(livePayload);
  assert.equal(event.type, "usage_limits");
  assert.equal(event.providerScopeKey, "kimi:global");
  assert.deepEqual(event.usageLimitLabels, {
    currentSession: "5h",
    currentWeekAllModels: "Weekly",
  });
  assert.deepEqual(event.usageLimits.currentSession, {
    percentUsed: 24,
    resetsAt: "2026-07-17T13:13:18.805364Z",
  });
  assert.deepEqual(event.usageLimits.currentWeekAllModels, {
    percentUsed: 8,
    resetsAt: "2026-07-23T17:13:18.805364Z",
  });
  assert.equal(event.usageLimits.currentWeekSonnetOnly, null);
  assert.equal(buildKimiUsageLimitsEvent({}), null);
  assert.equal(buildKimiUsageLimitsEvent("junk"), null);

  // Store key wins; the reader passes it as the Bearer header.
  globalThis.__kimiLimitsTestStoreKey = "sk-store";
  const seenAuth = [];
  const okFetch = (url, init) => {
    seenAuth.push(`${url}::${init.headers.Authorization}`);
    return Promise.resolve({
      json: () => Promise.resolve(livePayload),
      ok: true,
    });
  };
  const viaStore = await readKimiUsageLimitsEvent({ fetchImpl: okFetch });
  assert.equal(viaStore.usageLimits.currentSession.percentUsed, 24);
  assert.equal(
    seenAuth[0],
    "https://api.kimi.com/coding/v1/usages::Bearer sk-store"
  );

  // Without a store key the CLI config-TOML api_key is the fallback.
  globalThis.__kimiLimitsTestStoreKey = null;
  const configPath = path.join(root, "config.toml");
  await writeFile(
    configPath,
    'default_model = "kimi-for-coding"\n\n[providers.kimi-for-coding]\ntype = "kimi"\napi_key = "sk-from-toml"\n',
    "utf8"
  );
  await readKimiUsageLimitsEvent({ configPath, fetchImpl: okFetch });
  assert.equal(
    seenAuth[1],
    "https://api.kimi.com/coding/v1/usages::Bearer sk-from-toml"
  );

  // No key anywhere, HTTP failures and transport errors resolve to null.
  assert.equal(
    await readKimiUsageLimitsEvent({
      configPath: path.join(root, "absent.toml"),
      fetchImpl: okFetch,
    }),
    null
  );
  assert.equal(
    await readKimiUsageLimitsEvent({
      apiKey: "sk-x",
      fetchImpl: () => Promise.resolve({ ok: false }),
    }),
    null
  );
  assert.equal(
    await readKimiUsageLimitsEvent({
      apiKey: "sk-x",
      fetchImpl: () => Promise.reject(new Error("offline")),
    }),
    null
  );

  console.log("kimi usage limits tests passed");
} finally {
  globalThis.__kimiLimitsTestStoreKey = undefined;
  await rm(root, { force: true, recursive: true });
}
