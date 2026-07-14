import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-token-usage-snapshot.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { buildTokenUsageSnapshot, computeSdkUsed } = await import(moduleUrl);

const sdkUsage = {
  cacheCreationInputTokens: 113,
  cacheReadInputTokens: 27_280,
  contextWindow: 200_000,
  inputTokens: 8,
  outputTokens: 58,
};

// The used figure sums the last API call's input + cache_read +
// cache_creation, matching the Agent SDK's documented current-context-size
// formula.
assert.equal(computeSdkUsed(sdkUsage), 8 + 27_280 + 113);

// The panel snapshot comes straight from the tracker (the legacy /context
// probe retired 2026-07-14): used = context size, cached = last-call cache
// read (Codex parity), limit = the reported context window.
assert.deepEqual(buildTokenUsageSnapshot(sdkUsage), {
  cached: 27_280,
  limit: 200_000,
  used: 27_401,
});

// Before result.modelUsage reports the window, limit is 0 so the telemetry
// facade keeps its previous limit.
assert.deepEqual(
  buildTokenUsageSnapshot({ ...sdkUsage, contextWindow: null }),
  {
    cached: 27_280,
    limit: 0,
    used: 27_401,
  }
);

// No SDK usage yet (before the first assistant message) -> no snapshot.
assert.equal(buildTokenUsageSnapshot(undefined), null);

console.log("claude-token-usage-snapshot tests passed");
