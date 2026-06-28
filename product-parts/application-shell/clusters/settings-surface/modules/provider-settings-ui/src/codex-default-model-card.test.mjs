import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./codex-default-model-card.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(source, /values=\{efforts\}/u);
assert.match(source, /Not adjustable/u);
assert.doesNotMatch(source, /reasoningByModel\[option\.id\] \?\? "medium"/u);
