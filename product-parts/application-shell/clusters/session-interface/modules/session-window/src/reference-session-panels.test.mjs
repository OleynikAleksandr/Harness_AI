import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./reference-session-panels.tsx", import.meta.url),
  "utf8"
);
const dialogSource = readFileSync(
  new URL("./session-dialog-panel.tsx", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./session-window-facade.tsx", import.meta.url),
  "utf8"
);
const providerPickerSource = readFileSync(
  new URL("./provider-picker.tsx", import.meta.url),
  "utf8"
);
const coreEventsSource = readFileSync(
  new URL("./session-window-core-events.ts", import.meta.url),
  "utf8"
);

assert.match(source, /resolveCodexReasoningEffort/u);
assert.match(
  source,
  /session\.reasoningEffort \?\?\s+settings\.providers\.grok\.reasoningByModel\[session\.model\]/u
);
assert.match(
  source,
  /session\.reasoningEffort \?\?\s+settings\.providers\.kimiClient\.reasoningByModel\[session\.model\]/u
);
assert.match(
  providerPickerSource,
  /case "grok":\s+return settings\.providers\.grok\.defaultModel/u
);
assert.match(
  providerPickerSource,
  /case "kimi-client":\s+return settings\.providers\.kimiClient\.defaultModel/u
);
assert.match(source, /return effort \? `\(\$\{effort\}\)` : null/u);
assert.match(source, /telemetry\.cacheDisplay/u);
assert.match(source, /session\.status\.cache/u);
assert.match(source, /telemetry\.turnCount > preserveFirstUserTurns/u);
assert.match(source, /capabilities\.rollbackPreserveFirstUserTurns/u);
assert.match(source, /onRollbackTurns\?\.\(preserveFirstUserTurns \?\? 0\)/u);
assert.match(source, /telemetry\.status === "idle"/u);
assert.match(source, /capabilities\.showTurns/u);
assert.match(source, /capabilities\.showCache/u);
assert.match(facadeSource, /rollbackSessionTurns\(\{/u);
assert.match(facadeSource, /preserveFirstUserTurns,/u);
assert.match(facadeSource, /-turn anchor/u);
assert.match(coreEventsSource, /session:messages-replaced/u);
assert.doesNotMatch(
  source,
  /providers\.codex\.reasoningByModel\[session\.model\] \?\? "medium"/u
);
assert.match(
  source,
  /export \{ DialogPanel \} from "\.\/session-dialog-panel\.js"/u
);
assert.equal(source.split("\n").length <= 500, true);
assert.equal(dialogSource.split("\n").length <= 500, true);

// Dialog bubble class mapping: provider tint + thinking branches stay intact.
// The visible Kimi tint follows the universal-client `kimi-client` id (the
// ACP `kimi` id left with the kimi-provider retirement, 2026-07-05).
assert.match(dialogSource, /providerId === "claude"/u);
assert.match(dialogSource, /providerId === "codex"/u);
assert.match(dialogSource, /providerId === "kimi-client"/u);
assert.doesNotMatch(dialogSource, /providerId === "kimi"\b/u);
assert.match(
  dialogSource,
  /session-dialog__message--assistant session-dialog__message--assistant-\$\{tint\}/u
);
assert.match(
  dialogSource,
  /session-dialog__message--assistant-thinking session-dialog__message--assistant-\$\{tint\}/u
);
assert.match(dialogSource, /session-dialog__message--thinking/u);
assert.match(
  dialogSource,
  /message\.role === "assistant" && message\.tag === "thinking"/u
);
