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
assert.match(source, /session\.providerId === "grok"/u);
assert.match(
  source,
  /session\.reasoningEffort \?\? grok\.reasoningByModel\[session\.model\]/u
);
assert.match(
  source,
  /thinkingByModel\[session\.model\] \?\? claude\.thinking\.effort/u
);
assert.doesNotMatch(source, /glm-opencode/u);
assert.doesNotMatch(source, /glmOpenCode/u);
// Only the native vendor channels (Claude/Codex) derive turn options here.
// The retired legacy `glm-native`/`openrouter` branches (2026-07-05 legacy
// cleanup) and the ACP `kimi` branch (kimi-provider retirement, same day)
// left — the universal-client endpoints resolve their own settings per turn
// inside the adapters.
assert.doesNotMatch(source, /"glm-native"/u);
assert.doesNotMatch(source, /"openrouter"/u);
assert.doesNotMatch(source, /session\.providerId === "kimi"/u);
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
assert.match(source, /model: session\.model/u);
assert.match(source, /\{ reasoningEffort \}/u);
