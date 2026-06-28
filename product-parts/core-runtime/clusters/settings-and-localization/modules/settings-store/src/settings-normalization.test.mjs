import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./settings-normalization.ts", import.meta.url),
  "utf8"
);

assert.match(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.match(source, /"gpt-5\.2": \["low", "medium", "high", "xhigh"\]/u);
assert.match(
  source,
  /"gpt-5\.3-codex-spark": \["low", "medium", "high", "xhigh"\]/u
);
assert.match(source, /"gpt-5\.3-codex-spark": "medium"/u);
assert.match(source, /supportsCodexReasoningSummary/u);
assert.match(source, /CODEX_MODELS_WITHOUT_REASONING_SUMMARY/u);
assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(source, /return null/u);
assert.match(
  source,
  /next\.providers\.codex\.reasoningByModel = Object\.fromEntries/u
);
