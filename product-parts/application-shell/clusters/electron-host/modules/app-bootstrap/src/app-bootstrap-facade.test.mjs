import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./app-bootstrap-facade.mjs", import.meta.url),
  "utf8"
);

assert.match(source, /const detachedSessionWindows = new Map\(\)/u);
assert.match(source, /JSON\.stringify\(\[workspaceId, sessionId\]\)/u);
assert.match(source, /detachedSessionWindows\.get\(windowKey\)/u);
assert.match(
  source,
  /detachedSessionWindows\.set\(windowKey, windowPromise\)/u
);
assert.match(source, /existing\.isDestroyed\(\)/u);
assert.match(source, /focusDetachedWindow\(existing\)/u);
assert.match(source, /window\.once\("closed"/u);
assert.match(source, /detachedSessionWindows\.delete\(windowKey\)/u);
assert.match(source, /window\.isMinimized\(\)/u);
assert.match(source, /window\.restore\(\)/u);
assert.match(source, /window\.show\(\)/u);
assert.match(source, /window\.focus\(\)/u);
assert.doesNotMatch(source, /turn_completed[\s\S]*window\.close/u);
