import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./provider-turn-options.ts", import.meta.url),
  "utf8"
);

assert.match(
  source,
  /settingsStoreFacade\.getSettings\(session\.workspacePath\)/u
);
assert.match(source, /session\.providerId === "claude"/u);
assert.match(
  source,
  /thinkingByModel\[session\.model\] \?\? claude\.thinking\.effort/u
);
assert.match(source, /session\.providerId === "kimi"/u);
assert.match(source, /session\.providerId === "glm-native"/u);
assert.match(source, /reasoningEffort: glmNative\.reasoningEffort/u);
assert.doesNotMatch(source, /glm-opencode/u);
assert.doesNotMatch(source, /glmOpenCode/u);
assert.match(source, /session\.providerId === "openrouter"/u);
assert.match(
  source,
  /endpointTag: settings\.providers\.openRouter\.endpointTag/u
);
assert.match(
  source,
  /resolveCodexReasoningEffort\(\s*session\.model,\s*codex\.reasoningByModel\[session\.model\]\s*\)/u
);
assert.match(
  source,
  /\.\.\.\(reasoningEffort \? \{ reasoningEffort \} : \{\}\)/u
);
assert.doesNotMatch(
  source,
  /reasoningByModel\[session\.model\] \?\? "medium"/u
);
assert.match(
  source,
  /reasoningSummaryEnabled: codex\.reasoningSummaryEnabled/u
);
