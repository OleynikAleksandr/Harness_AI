import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-usage-limit-readers.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { readCodexUsageLimits } = await import(moduleUrl);

const event = readCodexUsageLimits({
  primary: { usedPercent: 22, resetsAt: 1_787_000_000 },
  secondary: { usedPercent: 7, resetsAt: "2026-07-01T10:00:00Z" },
});

assert.equal(event.type, "stream_event");
assert.equal(event.data.kind, "usage_limits");
assert.equal(event.providerScopeKey, "codex:global");
assert.equal(event.usageLimits.currentSession.percentUsed, 22);
assert.equal(event.usageLimits.currentWeekAllModels.percentUsed, 7);
assert.equal(
  event.usageLimits.currentWeekAllModels.resetsAt,
  "2026-07-01T10:00:00.000Z"
);
