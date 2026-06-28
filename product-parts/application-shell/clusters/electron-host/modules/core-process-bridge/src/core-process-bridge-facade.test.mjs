import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./core-process-bridge-facade.mjs", import.meta.url),
  "utf8"
);

assert.match(source, /harness-ai:core:get-session-events/u);
assert.match(source, /sessionRequestHandlerFacade\s*\.\s*refreshUsageLimits/u);
assert.match(source, /catch\(\(\) => undefined\)/u);
