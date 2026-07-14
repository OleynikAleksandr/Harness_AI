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
const {
  areTokenUsageSnapshotsEqual,
  buildSdkOnlyTokenUsage,
  buildTokenUsageSnapshot,
  computeSdkUsed,
} = await import(moduleUrl);

const sdkUsage = {
  cacheCreationInputTokens: 113,
  cacheReadInputTokens: 27_280,
  contextWindow: 200_000,
  inputTokens: 8,
  outputTokens: 58,
};

// sdkUsed sums the last API call's input + cache_read + cache_creation,
// matching the Agent SDK's documented current-context-size formula.
assert.equal(computeSdkUsed(sdkUsage), 8 + 27_280 + 113);

// With an SDK snapshot, the legacy /context figures merge with cached (=
// cache_read_input_tokens, Codex parity) and the sdkUsed diagnostic figure.
assert.deepEqual(
  buildTokenUsageSnapshot({ used: 40_000, limit: 200_000 }, sdkUsage),
  {
    cached: 27_280,
    limit: 200_000,
    sdkUsed: 8 + 27_280 + 113,
    used: 40_000,
  }
);

// Without an SDK snapshot yet (e.g. before the first assistant message),
// the legacy used/limit pass through unchanged and cached/sdkUsed stay
// absent rather than fabricated as zero.
const legacyOnly = buildTokenUsageSnapshot(
  { used: 40_000, limit: 200_000 },
  undefined
);
assert.deepEqual(legacyOnly, { used: 40_000, limit: 200_000 });
assert.equal("cached" in legacyOnly, false);
assert.equal("sdkUsed" in legacyOnly, false);

// Equality holds when every field matches, including the new optional ones.
assert.equal(
  areTokenUsageSnapshotsEqual(
    { used: 1, limit: 2, cached: 3, sdkUsed: 4 },
    { used: 1, limit: 2, cached: 3, sdkUsed: 4 }
  ),
  true
);

// A cached-only change (legacy used/limit unchanged) must still be treated
// as a change, so a fresh SDK usage reading is not suppressed as a
// redundant /context-probe repeat.
assert.equal(
  areTokenUsageSnapshotsEqual(
    { used: 1, limit: 2, cached: 3, sdkUsed: 4 },
    { used: 1, limit: 2, cached: 30, sdkUsed: 4 }
  ),
  false
);

// A snapshot with no SDK fields differs from one that has gained them.
assert.equal(
  areTokenUsageSnapshotsEqual(
    { used: 1, limit: 2 },
    { used: 1, limit: 2, cached: 0, sdkUsed: 0 }
  ),
  false
);

// Probe-less emission (2026-07-14 acceptance): the SDK figures stand on
// their own when the legacy /context probe yields nothing.
assert.deepEqual(buildSdkOnlyTokenUsage(sdkUsage), {
  cached: 27_280,
  sdkUsed: 8 + 27_280 + 113,
});
assert.equal(buildSdkOnlyTokenUsage(undefined), null);

console.log("claude-token-usage-snapshot tests passed");
