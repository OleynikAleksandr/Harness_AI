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
assert.match(source, /session\.providerId !== "codex"/u);
assert.match(
  source,
  /codex\.reasoningByModel\[session\.model\] \?\? "medium"/u
);
assert.match(
  source,
  /reasoningSummaryEnabled: codex\.reasoningSummaryEnabled/u
);
