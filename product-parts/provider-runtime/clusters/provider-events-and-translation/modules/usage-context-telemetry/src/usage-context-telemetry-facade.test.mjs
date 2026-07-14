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

// Claude carries a temporary dual-figure Tokens diagnostic: the legacy
// /context scrape dash-separated with the SDK usage tracker's last-call
// sdkUsed figure, while the Cache chip reads `cached` the same generic way
// Codex does (Codex parity,
// docs/evidence/claude-cache-telemetry-research-2026-07-14.md).
const claude = usageContextTelemetryFacade.createTelemetry({
  model: "claude-sonnet-5",
  provider: "Claude",
  providerId: "claude",
});
assert.equal(claude.providerScopeKey, "claude:global");
assert.equal(claude.tokenDisplay.value, "0 (100%)");
assert.equal(claude.cacheDisplay, null);

const claudeWithSdkUsage = usageContextTelemetryFacade.applyProviderEvent(
  claude,
  {
    data: {
      kind: "token_usage",
      tokenUsage: {
        cached: 27_280,
        limit: 200_000,
        sdkUsed: 27_401,
        used: 27_500,
      },
    },
    type: "stream_event",
  }
);
assert.equal(claudeWithSdkUsage.tokenDisplay.value, "27,500 - 27,401 (86%)");
assert.equal(claudeWithSdkUsage.cacheDisplay?.value, "27,280");

// A later event without sdkUsed/cached (e.g. a raw /context-only refresh)
// keeps the last known values instead of collapsing back to the
// single-figure display or losing the Cache chip.
const claudeLegacyOnlyRefresh = usageContextTelemetryFacade.applyProviderEvent(
  claudeWithSdkUsage,
  {
    data: {
      kind: "token_usage",
      tokenUsage: { limit: 200_000, used: 27_600 },
    },
    type: "stream_event",
  }
);
assert.equal(
  claudeLegacyOnlyRefresh.tokenDisplay.value,
  "27,600 - 27,401 (86%)"
);
assert.equal(claudeLegacyOnlyRefresh.cacheDisplay?.value, "27,280");

// Claude without any SDK usage yet (e.g. the very first /context probe
// before the first assistant message streamed) keeps the single-figure
// format instead of fabricating a dash.
const claudeNoSdkYet = usageContextTelemetryFacade.applyProviderEvent(claude, {
  data: { kind: "token_usage", tokenUsage: { limit: 200_000, used: 1200 } },
  type: "stream_event",
});
assert.equal(claudeNoSdkYet.tokenDisplay.value, "1,200 (99%)");

// Regression (2026-07-14 acceptance): telemetry restored from persisted
// session history written by a pre-sdkUsed build has no `sdkUsed` key at all
// (undefined after the JSON round-trip). Every facade entry point must
// normalize instead of crashing with "Cannot read properties of undefined
// (reading 'toLocaleString')", which broke provider binding for every
// restored session.
const { sdkUsed: _droppedByOldBuild, ...preUpgradeTokenUsage } =
  codexCached.tokenUsage;
const restored = JSON.parse(
  JSON.stringify({ ...codexCached, tokenUsage: preUpgradeTokenUsage })
);
assert.equal("sdkUsed" in restored.tokenUsage, false);
const restoredBound = usageContextTelemetryFacade.applyBinding(restored, {
  providerSessionId: "thread-1",
  status: "ready",
});
assert.equal(restoredBound.tokenDisplay.value, "19,000 (90%)");
assert.equal(restoredBound.tokenUsage.sdkUsed, null);
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

// Probe-less Claude event (2026-07-14 acceptance): when the legacy /context
// probe is unavailable the provider still emits cached/sdkUsed without any
// legacy `used`; the facade keeps the previous `used` figure and shows the
// Cache chip instead of dropping the event.
const claudeProbeLess = usageContextTelemetryFacade.applyProviderEvent(claude, {
  data: {
    kind: "token_usage",
    tokenUsage: { cached: 26_500, sdkUsed: 27_400 },
  },
  type: "stream_event",
});
assert.equal(claudeProbeLess.tokenDisplay.value, "0 - 27,400 (100%)");
assert.equal(claudeProbeLess.cacheDisplay?.value, "26,500");
assert.equal(claudeProbeLess.tokenUsage.used, 0);

console.log("usage-context-telemetry-facade tests passed");
