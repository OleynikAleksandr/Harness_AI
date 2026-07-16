import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-model-billing-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-billing-client.ts",
    "grok-model-catalog.ts",
  ]) {
    const source = readFileSync(new URL(filename, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }

  const { normalizeGrokModelCatalog } = await import(
    pathToFileURL(path.join(buildDir, "grok-model-catalog.js")).href
  );
  const { GrokBillingClient, normalizeGrokBillingSnapshot } = await import(
    pathToFileURL(path.join(buildDir, "grok-billing-client.js")).href
  );

  const catalog = normalizeGrokModelCatalog({
    _meta: {
      modelState: {
        currentModelId: "grok-4.5",
        availableModels: [
          {
            modelId: "grok-4.5",
            name: "Grok 4.5",
            description: "Flagship",
            _meta: {
              reasoningEffort: "medium",
              reasoningEfforts: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Balanced", default: true },
                { id: "deep", value: "xhigh", label: "Deep" },
              ],
              supportsReasoningEffort: true,
              totalContextTokens: 500_000,
            },
          },
          {
            modelId: "grok-composer-2.5-fast",
            name: "Composer Fast",
            _meta: { totalContextTokens: 200_000 },
          },
          { name: "Invalid without id" },
        ],
      },
    },
  });
  assert.equal(catalog.currentModelId, "grok-4.5");
  assert.equal(catalog.models.length, 2);
  assert.equal(catalog.models[0].contextWindowTokens, 500_000);
  assert.equal(catalog.models[0].isDefault, true);
  assert.equal(catalog.models[0].reasoningEfforts[1].isDefault, true);
  assert.equal(catalog.models[0].reasoningEfforts[2].id, "xhigh");
  assert.equal(catalog.models[1].supportsReasoningSelection, false);

  const billingPayload = {
    config: {
      creditUsagePercent: 42.5,
      currentPeriod: {
        end: "2026-06-08T00:00:00Z",
        start: "2026-06-01T00:00:00Z",
        type: "USAGE_PERIOD_TYPE_WEEKLY",
      },
      isUnifiedBillingUser: true,
      onDemandCap: { val: 5000 },
      onDemandUsed: {},
      prepaidBalance: { val: 1250 },
    },
    onDemandEnabled: true,
    subscriptionTier: "SuperGrok",
  };
  const billing = normalizeGrokBillingSnapshot(
    billingPayload,
    new Date("2026-07-16T10:00:00Z")
  );
  assert.equal(billing.subscriptionTier, "SuperGrok");
  assert.equal(billing.usagePercent, 42.5);
  assert.equal(billing.currentPeriod.kind, "weekly");
  assert.equal(billing.resetAt, "2026-06-08T00:00:00.000Z");
  assert.equal(billing.onDemandUsedCents, 0);

  const unknownUsage = normalizeGrokBillingSnapshot({
    config: {
      currentPeriod: {
        end: "2026-07-20T00:00:00Z",
        type: "USAGE_PERIOD_TYPE_WEEKLY",
      },
    },
    subscriptionTier: "SuperGrok",
  });
  assert.equal(unknownUsage.usagePercent, null);
  assert.equal(unknownUsage.resetAt, "2026-07-20T00:00:00.000Z");

  const legacy = normalizeGrokBillingSnapshot({
    config: {
      billingPeriodEnd: "2026-08-01T00:00:00Z",
      monthlyLimit: { val: 5000 },
      used: { val: 1250 },
    },
  });
  assert.equal(legacy.usagePercent, 25);
  assert.equal(legacy.currentPeriod.kind, "monthly");

  const calls = [];
  const client = new GrokBillingClient({
    now: () => new Date("2026-07-16T11:00:00Z"),
    transport: {
      request(method, params) {
        calls.push({ method, params });
        return Promise.resolve(billingPayload);
      },
    },
  });
  const fetched = await client.read();
  assert.deepEqual(calls, [{ method: "_x.ai/billing", params: {} }]);
  assert.equal(fetched.collectedAt, "2026-07-16T11:00:00.000Z");

  console.log("grok model and billing tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
