import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./reference-session-panels.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(source, /return effort \? `\(\$\{effort\}\)` : null/u);
assert.doesNotMatch(
  source,
  /providers\.codex\.reasoningByModel\[session\.model\] \?\? "medium"/u
);
