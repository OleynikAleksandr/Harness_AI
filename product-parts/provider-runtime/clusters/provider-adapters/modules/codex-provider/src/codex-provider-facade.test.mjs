import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./codex-provider-facade.ts", import.meta.url),
  "utf8"
);

assert.match(
  source,
  /const reasoningEffort = readReasoningEffort\(turnOptions\)/u
);
assert.match(
  source,
  /\.\.\.\(reasoningEffort \? \{ effort: reasoningEffort \} : \{\}\)/u
);
assert.match(
  source,
  /summary: resolveReasoningSummary\(selectedModel, turnOptions\)/u
);
assert.match(source, /CODEX_MODELS_WITHOUT_REASONING_SUMMARY/u);
assert.match(source, /"gpt-5\.3-codex-spark"/u);
assert.match(source, /return "none"/u);
assert.match(source, /turnOptions\?\.reasoningEffort === "string"/u);
assert.match(source, /turnOptions\?\.reasoningSummaryEnabled !== false/u);
