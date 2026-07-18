import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./usage-context-telemetry-facade.ts", import.meta.url),
  "utf8"
);
const statusPanelSource = readFileSync(
  new URL("./usage-context-status-panel.ts", import.meta.url),
  "utf8"
);
const descriptorCompiled = ts.transpileModule(
  readFileSync(
    new URL(
      "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.ts",
      import.meta.url
    ),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const descriptorUrl = `data:text/javascript;base64,${Buffer.from(descriptorCompiled).toString("base64")}`;
const statusPanelCompiled = ts
  .transpileModule(statusPanelSource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replaceAll(
    "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
    descriptorUrl
  );
const statusPanelUrl = `data:text/javascript;base64,${Buffer.from(statusPanelCompiled).toString("base64")}`;
const limitScopesCompiled = ts.transpileModule(
  readFileSync(
    new URL("./usage-context-limit-scopes.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const limitScopesUrl = `data:text/javascript;base64,${Buffer.from(limitScopesCompiled).toString("base64")}`;
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replaceAll("./usage-context-status-panel.js", statusPanelUrl)
  .replaceAll("./usage-context-limit-scopes.js", limitScopesUrl);
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
assert.equal(codex.turnCount, 0);
assert.equal(codex.statusPanelCapabilities.showTurns, true);
// Codex keeps the `Cache: 0` anchor and the Cache/Turns chips, but its panel
// no longer surfaces the Rollback action (hidden 2026-07-18 by user order;
// the Core rollback intent stays wired for Codex behind the capability).
assert.equal(codex.statusPanelCapabilities.showCache, true);
assert.equal(
  codex.statusPanelCapabilities.rollbackPreserveFirstUserTurns,
  null
);

const grok = usageContextTelemetryFacade.createTelemetry({
  model: "grok-4.5",
  provider: "Grok",
  providerId: "grok",
});
assert.equal(grok.providerScopeKey, "grok:subscription");
assert.equal(grok.tokenUsage.limit, 500_000);
assert.equal(grok.tokenDisplay.value, "0 (100%)");
assert.equal(grok.cacheDisplay?.value, "0");
assert.equal(grok.statusPanelCapabilities.showTurns, true);
// Grok keeps the full Rollback contract untouched.
assert.equal(grok.statusPanelCapabilities.rollbackPreserveFirstUserTurns, 2);
const grokCompleted = usageContextTelemetryFacade.applyProviderEvent(grok, {
  type: "turn_completed",
});
assert.equal(grokCompleted.turnCount, 1);
const grokBilling = usageContextTelemetryFacade.applyProviderEvent(
  grokCompleted,
  {
    type: "usage_limits",
    usageLimitLabels: {
      currentSession: "SuperGrok",
      currentWeekAllModels: "Weekly",
    },
    usageLimits: {
      currentSession: null,
      currentWeekAllModels: {
        percentUsed: null,
        resetsAt: "2026-07-20T00:00:00.000Z",
      },
    },
  }
);
assert.equal(grokBilling.limitRows[0].label, "SuperGrok");
assert.equal(grokBilling.limitRows[1].percentUsed, null);
assert.match(grokBilling.limitRows[1].text, /Weekly \(Resets/u);

const grokComposer = usageContextTelemetryFacade.createTelemetry({
  model: "grok-composer-2.5-fast",
  provider: "Grok",
  providerId: "grok",
});
assert.equal(grokComposer.tokenUsage.limit, 200_000);

// Kimi shows the full panel since the 2026-07-17 telemetry stream: the
// verified 262144 native context default, cache from the CLI session store
// and turn counting; rollback stays unavailable.
const kimi = usageContextTelemetryFacade.createTelemetry({
  model: "kimi-for-coding",
  provider: "Kimi",
  providerId: "kimi-client",
});
assert.equal(kimi.tokenUsage.limit, 262_144);
// Core-catalog per-model context: k3 is a 1M-context model (verified live
// 2026-07-18), unknown config-aliased ids fall back to the K2.7 window.
const kimiK3 = usageContextTelemetryFacade.createTelemetry({
  model: "k3",
  provider: "Kimi",
  providerId: "kimi-client",
});
assert.equal(kimiK3.tokenUsage.limit, 1_048_576);
const kimiCustom = usageContextTelemetryFacade.createTelemetry({
  model: "my-custom-alias",
  provider: "Kimi",
  providerId: "kimi-client",
});
assert.equal(kimiCustom.tokenUsage.limit, 262_144);
assert.equal(kimi.statusPanelCapabilities.showCache, true);
assert.equal(kimi.statusPanelCapabilities.showTurns, true);
assert.equal(kimi.statusPanelCapabilities.rollbackPreserveFirstUserTurns, null);
assert.equal(kimi.cacheDisplay?.value, "0");
const kimiUsage = usageContextTelemetryFacade.applyProviderEvent(kimi, {
  data: {
    kind: "token_usage",
    tokenUsage: { cached: 20_094, limit: 262_144, used: 20_235 },
  },
  type: "stream_event",
});
assert.equal(kimiUsage.cacheDisplay?.value, "20,094");
assert.equal(kimiUsage.tokenDisplay.value, "20,235 (92%)");
const kimiTurn = usageContextTelemetryFacade.applyProviderEvent(kimiUsage, {
  type: "turn_completed",
});
assert.equal(kimiTurn.turnCount, 1);

const codexCached = usageContextTelemetryFacade.applyProviderEvent(codex, {
  data: {
    kind: "token_usage",
    tokenUsage: { cached: 7440, limit: 200_000, used: 19_000 },
  },
  type: "stream_event",
});
assert.equal(codexCached.cacheDisplay?.value, "7,440");
const codexZeroAfterHit = usageContextTelemetryFacade.applyProviderEvent(
  codexCached,
  {
    data: {
      kind: "token_usage",
      tokenUsage: { cached: 0, limit: 200_000, used: 20_000 },
    },
    type: "stream_event",
  }
);
assert.equal(codexZeroAfterHit.cacheDisplay?.value, "7,440");
assert.equal(codexZeroAfterHit.tokenDisplay.value, "20,000 (90%)");
const codexLowerHitAfterHit = usageContextTelemetryFacade.applyProviderEvent(
  codexCached,
  {
    data: {
      kind: "token_usage",
      tokenUsage: { cached: 2432, limit: 200_000, used: 20_100 },
    },
    type: "stream_event",
  }
);
assert.equal(codexLowerHitAfterHit.cacheDisplay?.value, "7,440");
assert.equal(codexLowerHitAfterHit.tokenDisplay.value, "20,100 (90%)");

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

// Claude token usage streams live from the SDK usage tracker after every
// agent-loop API call (the legacy /context probe and the temporary
// dual-figure diagnostic retired 2026-07-14); the Cache chip reads `cached`
// the same generic way Codex does.
const claude = usageContextTelemetryFacade.createTelemetry({
  model: "claude-sonnet-5",
  provider: "Claude",
  providerId: "claude",
});
assert.equal(claude.providerScopeKey, "claude:global");
assert.equal(claude.tokenDisplay.value, "0 (100%)");
assert.equal(claude.cacheDisplay, null);
assert.equal(claude.statusPanelCapabilities.showCache, true);
assert.equal(claude.statusPanelCapabilities.showTurns, true);
assert.equal(
  claude.statusPanelCapabilities.rollbackPreserveFirstUserTurns,
  null
);

const claudeLiveUsage = usageContextTelemetryFacade.applyProviderEvent(claude, {
  data: {
    kind: "token_usage",
    tokenUsage: { cached: 27_280, limit: 200_000, used: 27_401 },
  },
  type: "stream_event",
});
assert.equal(claudeLiveUsage.tokenDisplay.value, "27,401 (86%)");
assert.equal(claudeLiveUsage.cacheDisplay?.value, "27,280");

// Mid-turn events carry limit 0 until result.modelUsage reports the context
// window; the previous limit is kept.
const claudeMidTurn = usageContextTelemetryFacade.applyProviderEvent(
  claudeLiveUsage,
  {
    data: {
      kind: "token_usage",
      tokenUsage: { cached: 27_500, limit: 0, used: 27_900 },
    },
    type: "stream_event",
  }
);
assert.equal(claudeMidTurn.tokenUsage.limit, 200_000);
assert.equal(claudeMidTurn.tokenDisplay.value, "27,900 (86%)");
assert.equal(claudeMidTurn.cacheDisplay?.value, "27,500");

// Claude turns count from structured turn_completed events exactly like the
// other providers (the adapter emits one per finished user turn).
const claudeTurn = usageContextTelemetryFacade.applyProviderEvent(
  claudeMidTurn,
  {
    type: "turn_completed",
  }
);
assert.equal(claudeTurn.turnCount, 1);

// Regression (2026-07-14 acceptance): telemetry restored from persisted
// session history written by an older build may miss newer token-usage keys
// entirely (undefined after the JSON round-trip). Every facade entry point
// must normalize instead of crashing with "Cannot read properties of
// undefined (reading 'toLocaleString')", which broke provider binding for
// every restored session.
const { cached: _droppedByOldBuild, ...preUpgradeTokenUsage } =
  codexCached.tokenUsage;
const restored = JSON.parse(
  JSON.stringify({ ...codexCached, tokenUsage: preUpgradeTokenUsage })
);
assert.equal("cached" in restored.tokenUsage, false);
const restoredBound = usageContextTelemetryFacade.applyBinding(restored, {
  providerSessionId: "thread-1",
  status: "ready",
});
assert.equal(restoredBound.tokenDisplay.value, "19,000 (90%)");
const restoredRunning = usageContextTelemetryFacade.applyStatus(
  restored,
  "running"
);
assert.equal(restoredRunning.status, "running");
const restoredRefreshed = usageContextTelemetryFacade.applyProviderEvent(
  restored,
  {
    data: {
      kind: "token_usage",
      tokenUsage: { cached: 8000, limit: 200_000, used: 21_000 },
    },
    type: "stream_event",
  }
);
assert.equal(restoredRefreshed.tokenDisplay.value, "21,000 (89%)");

console.log("usage-context-telemetry-facade tests passed");
