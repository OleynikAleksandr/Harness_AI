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

// Codex rows come from the live catalog Core serves; the renderer keeps no
// model list and computes no effort of its own.
assert.doesNotMatch(source, /CODEX_REASONING_EFFORTS_BY_MODEL/u);
assert.doesNotMatch(source, /resolveCodexReasoningEffort/u);
assert.doesNotMatch(source, /settings-normalization/u);
assert.match(source, /models: readonly SettingsModelOption\[\]/u);
assert.match(source, /\{models\.map\(\(option\) =>/u);
assert.match(
  source,
  /provider\.reasoningByModel\[option\.id\] \?\?\s+option\.defaultReasoningEffort/u
);
assert.match(source, /values=\{option\.reasoningEfforts\}/u);
assert.match(source, /useTranslatedModelDescriptions\(models\)/u);
assert.match(source, /Not adjustable/u);
assert.doesNotMatch(source, /reasoningByModel\[option\.id\] \?\? "medium"/u);
assert.doesNotMatch(modelOptionsSource, /codex: \[/u);
assert.doesNotMatch(modelOptionsSource, /claude: \[/u);
assert.match(modelOptionsSource, /label: "Ultra", value: "ultra"/u);
assert.doesNotMatch(modelOptionsSource, /gpt-5\.2/u);

const claudeSource = readFileSync(
  new URL("./claude-default-model-card.tsx", import.meta.url),
  "utf8"
);
assert.doesNotMatch(claudeSource, /CLAUDE_REASONING_EFFORTS_BY_MODEL/u);
assert.match(claudeSource, /\{models\.map\(\(option\) =>/u);
assert.match(
  claudeSource,
  /provider\.thinkingByModel\[option\.id\] \?\?\s+option\.defaultReasoningEffort/u
);
assert.match(claudeSource, /values=\{option\.reasoningEfforts\}/u);

console.log("codex default model card tests passed");
