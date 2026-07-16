import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./grok-interaction-panel.tsx", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const executable = compiled
  .replace(/^import .*;$/gmu, "")
  .replace(/^export /gmu, "");
const { applyGrokInteractionEvent } = new Function(
  `${executable}\nreturn { applyGrokInteractionEvent };`
)();

const request = {
  payload: {
    interactionId: "grok-interaction:7",
    kind: "permission",
    message: "Run tests",
    options: [],
    provider: "grok",
    questions: [],
    sessionId: "session-1",
    timestamp: "2026-07-16T12:00:00.000Z",
    title: "Tool permission",
    type: "provider_interaction_requested",
  },
  timestamp: "2026-07-16T12:00:00.000Z",
  type: "session:provider-interaction",
};
const pending = applyGrokInteractionEvent({}, request);
assert.equal(pending["session-1"].message, "Run tests");
assert.equal(
  applyGrokInteractionEvent(pending, {
    payload: { sessionId: "session-1", state: "running" },
    timestamp: request.timestamp,
    type: "session:turn-state",
  }),
  pending
);
assert.equal(
  applyGrokInteractionEvent(pending, {
    payload: {
      interactionId: "another-interaction",
      provider: "grok",
      reason: "submitted",
      sessionId: "session-1",
      timestamp: request.timestamp,
      type: "provider_interaction_resolved",
    },
    timestamp: request.timestamp,
    type: "session:provider-interaction-resolved",
  }),
  pending
);
const resolved = applyGrokInteractionEvent(pending, {
  payload: {
    interactionId: "grok-interaction:7",
    provider: "grok",
    reason: "submitted",
    sessionId: "session-1",
    timestamp: request.timestamp,
    type: "provider_interaction_resolved",
  },
  timestamp: request.timestamp,
  type: "session:provider-interaction-resolved",
});
assert.equal(resolved["session-1"], undefined);

assert.match(source, /interaction\.kind === "permission"/u);
assert.match(source, /interaction\.kind === "ask_user"/u);
assert.match(source, /interaction\.kind === "plan_approval"/u);
assert.match(source, /respondProviderInteraction/u);
assert.match(source, /role="dialog"/u);
assert.doesNotMatch(source, /window\.(?:alert|confirm|prompt)/u);

console.log("grok interaction panel tests passed");
