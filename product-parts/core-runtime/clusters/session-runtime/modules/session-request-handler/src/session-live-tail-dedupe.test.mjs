import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-live-tail-dedupe.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { resolveLiveAssistantTail } = await import(moduleUrl);

const liveMessage = (text) => ({
  id: `live-${text.length}`,
  role: "assistant",
  sessionId: "session-1",
  tag: "live",
  text,
  timestamp: "2026-06-28T00:00:00.000Z",
});

assert.equal(
  resolveLiveAssistantTail(
    [liveMessage("Hello"), liveMessage(", world.")],
    "Hello, world."
  ),
  null
);
assert.deepEqual(
  resolveLiveAssistantTail([liveMessage("Hello")], "Hello again."),
  { tag: "live", text: " again." }
);
assert.deepEqual(resolveLiveAssistantTail([], "Final answer."), {
  text: "Final answer.",
});
