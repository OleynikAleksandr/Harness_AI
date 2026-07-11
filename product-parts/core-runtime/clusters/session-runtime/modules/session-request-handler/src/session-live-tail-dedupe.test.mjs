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
const { resolveDisplayMessage, resolveLiveAssistantTail } = await import(
  moduleUrl
);

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

const restoredMessage = {
  id: "provider-item::assistant::0",
  role: "assistant",
  sessionId: "session-1",
  text: "Persisted child answer.",
  timestamp: "2026-07-11T18:31:40.000Z",
};
assert.equal(
  resolveDisplayMessage([restoredMessage], {
    ...restoredMessage,
    timestamp: "2026-07-11T19:00:00.000Z",
  }),
  null
);
assert.equal(
  resolveDisplayMessage(
    [
      {
        ...restoredMessage,
        id: "provider-reasoning::thinking::0",
        role: "thinking",
        tag: "thinking",
      },
    ],
    {
      ...restoredMessage,
      id: "provider-reasoning::thinking::0",
      role: "thinking",
      tag: "thinking",
    }
  ),
  null
);
assert.deepEqual(
  resolveDisplayMessage([restoredMessage], {
    ...restoredMessage,
    text: "Persisted child answer with a recovered tail.",
  }),
  {
    ...restoredMessage,
    text: "Persisted child answer with a recovered tail.",
  }
);
assert.equal(
  resolveDisplayMessage([{ ...restoredMessage, tag: "live" }], restoredMessage),
  null
);
