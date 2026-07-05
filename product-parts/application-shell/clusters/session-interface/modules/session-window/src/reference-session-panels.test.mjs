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

// Dialog bubble class mapping: provider tint + thinking branches stay intact.
// The visible Kimi tint follows the universal-client `kimi-client` id (the
// ACP `kimi` id left with the kimi-provider retirement, 2026-07-05).
assert.match(source, /providerId === "claude"/u);
assert.match(source, /providerId === "codex"/u);
assert.match(source, /providerId === "kimi-client"/u);
assert.doesNotMatch(source, /providerId === "kimi"\b/u);
assert.match(
  source,
  /session-dialog__message--assistant session-dialog__message--assistant-\$\{tint\}/u
);
assert.match(
  source,
  /session-dialog__message--assistant-thinking session-dialog__message--assistant-\$\{tint\}/u
);
assert.match(source, /session-dialog__message--thinking/u);
assert.match(
  source,
  /message\.role === "assistant" && message\.tag === "thinking"/u
);
