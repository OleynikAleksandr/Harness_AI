import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./codex-default-model-card.tsx", import.meta.url),
  "utf8"
);
const modelOptionsSource = readFileSync(
  new URL("./settings-model-options.ts", import.meta.url),
  "utf8"
);

assert.match(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(source, /values=\{efforts\}/u);
assert.match(source, /Not adjustable/u);
assert.doesNotMatch(source, /reasoningByModel\[option\.id\] \?\? "medium"/u);
assert.match(modelOptionsSource, /id: "gpt-5\.6-sol"/u);
assert.match(modelOptionsSource, /id: "gpt-5\.6-terra"/u);
assert.match(modelOptionsSource, /id: "gpt-5\.6-luna"/u);
assert.match(modelOptionsSource, /label: "Ultra", value: "ultra"/u);
assert.doesNotMatch(modelOptionsSource, /gpt-5\.2/u);
