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
  /summary: readReasoningSummaryEnabled\(turnOptions\) \? "detailed" : "none"/u
);
assert.match(source, /turnOptions\?\.reasoningEffort === "string"/u);
assert.match(source, /turnOptions\?\.reasoningSummaryEnabled !== false/u);
