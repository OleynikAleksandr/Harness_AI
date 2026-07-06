import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./usage-context-telemetry-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { usageContextTelemetryFacade } = await import(moduleUrl);

const codex = usageContextTelemetryFacade.createTelemetry({
  model: "gpt-5.4-mini",
  provider: "Codex",
  providerId: "codex",
});
assert.equal(codex.providerScopeKey, "codex:global");
assert.equal(codex.tokenDisplay.value, "0 (100%)");
assert.equal(codex.cacheDisplay?.value, "0");
assert.equal(codex.limitRows[0].text, "Session ...");
assert.equal(codex.limitRows[1].text, "Weekly ...");

const codexUc = usageContextTelemetryFacade.createTelemetry({
  model: "gpt-5.4-mini",
  provider: "CodexUC",
  providerId: "codex-uc",
});
assert.equal(codexUc.providerScopeKey, "codex:global");
assert.equal(codexUc.cacheDisplay?.value, "0");
assert.equal(codexUc.limitRows[0].text, "Session ...");
assert.equal(codexUc.limitRows[1].text, "Weekly ...");

const withTokens = usageContextTelemetryFacade.applyProviderEvent(codex, {
  data: {
    kind: "token_usage",
    tokenUsage: { cachedTokens: 15_744, limit: 200_000, used: 22_328 },
  },
  type: "stream_event",
});
assert.equal(withTokens.tokenDisplay.value, "22,328 (89%)");
assert.equal(withTokens.cacheDisplay?.value, "15,744");

const withTokensNoLimit = usageContextTelemetryFacade.applyProviderEvent(
  codex,
  {
    data: { kind: "token_usage", tokenUsage: { used: 1000 } },
    type: "stream_event",
  }
);
assert.equal(withTokensNoLimit.tokenUsage.limit, 200_000);
assert.equal(withTokensNoLimit.tokenDisplay.value, "1,000 (99%)");

// The universal-client GLM (`glm-client`) keeps the five-hour-window limit
// and labels via the `glm-` prefix. The ACP Kimi that first needed this path
// left with the kimi-provider retirement (2026-07-05 user order); retired ids
// no longer contribute a provider usage scope, so client telemetry stays
// session-scoped (scope key null).
const glmClient = usageContextTelemetryFacade.createTelemetry({
  model: "glm-5.2",
  provider: "GLM",
  providerId: "glm-client",
});
assert.equal(glmClient.providerScopeKey, null);
assert.equal(glmClient.tokenUsage.limit, 262_144);
assert.equal(glmClient.limitRows[0].text, "5h unavailable");

const withLimits = usageContextTelemetryFacade.applyProviderEvent(glmClient, {
  data: {
    usageLimits: {
      currentSession: { percentUsed: 9, resetsAt: "2026-05-19T12:50:12.630Z" },
      currentWeekAllModels: { percentUsed: 13 },
      currentWeekSonnetOnly: { percentUsed: 0 },
    },
  },
  type: "stream_event",
});
assert.equal(withLimits.limitRows[0].text.includes("5h 9%"), true);
assert.equal(withLimits.limitRows[1].text, "Weekly 13%");
assert.equal(withLimits.limitRows[2].text, "Parallel 0%");

const openRouter = usageContextTelemetryFacade.createTelemetry({
  model: "google/gemini-3.1-flash-lite",
  provider: "OpenRouter",
  providerId: "openrouter-client",
});
assert.equal(openRouter.providerScopeKey, null);
assert.equal(openRouter.limitRows[0].text, "Session unavailable");
assert.equal(openRouter.limitRows[1].text, "Weekly unavailable");

const openRouterWithTokens = usageContextTelemetryFacade.applyProviderEvent(
  openRouter,
  {
    data: { kind: "token_usage", tokenUsage: { total_tokens: 512 } },
    type: "stream_event",
  }
);
assert.equal(openRouterWithTokens.tokenDisplay.value, "512 (100%)");
