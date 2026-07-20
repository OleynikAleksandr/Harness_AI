import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const surfaceSource = readFileSync(
  new URL("./session-surface-facade.tsx", import.meta.url),
  "utf8"
);
const windowSource = readFileSync(
  new URL(
    "../../session-window/src/session-window-facade.tsx",
    import.meta.url
  ),
  "utf8"
);

for (const component of [
  "SessionIdPanel",
  "SubagentSessionHeader",
  "DialogPanel",
  "ReferenceInputPanel",
  "ReferenceStatusPanel",
]) {
  assert.match(surfaceSource, new RegExp(`<${component}`, "u"));
}

assert.match(surfaceSource, /session\.sessionKind === "subagent"/u);
assert.match(surfaceSource, /className="session-empty-workspace"/u);
assert.match(windowSource, /<SessionSurfaceFacade/u);
assert.doesNotMatch(windowSource, /<DialogPanel/u);
assert.doesNotMatch(windowSource, /<ReferenceInputPanel/u);
assert.doesNotMatch(windowSource, /<ReferenceStatusPanel/u);

console.log("session-surface tests: OK");
