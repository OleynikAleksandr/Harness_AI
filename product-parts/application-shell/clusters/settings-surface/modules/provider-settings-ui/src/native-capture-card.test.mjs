import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./native-capture-card.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /defaultReasoningEffort/u);
assert.match(source, /reasoningEfforts/u);
assert.match(
  source,
  /setReasoningEffort\(firstModel\?\.defaultReasoningEffort \?\? ""\)/u
);
assert.match(source, /selectedModel\?\.reasoningEfforts \?\? \[\]/u);
assert.match(
  source,
  /captureNativeRequest\(\{[\s\S]*?reasoningEffort: reasoningEffort \|\| undefined/u
);
assert.match(source, /settings\.nativeCapture\.reasoning/u);
assert.doesNotMatch(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.doesNotMatch(source, /CLAUDE_REASONING_EFFORTS_BY_MODEL/u);
assert.doesNotMatch(source, /settings-normalization/u);

console.log("native capture card tests passed");
