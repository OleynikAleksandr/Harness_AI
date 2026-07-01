import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const reactUrl = `data:text/javascript;base64,${Buffer.from(`
  export function useEffect() {}
  export function useState(initialValue) {
    return [initialValue, () => undefined];
  }
`).toString("base64")}`;
const coalescerUrl = `data:text/javascript;base64,${Buffer.from(`
  export function coalesceLiveAssistantMessages(messages) {
    return messages;
  }
`).toString("base64")}`;
const source = compile("translated-text-reveal.ts")
  .replace('from "react";', `from "${reactUrl}";`)
  .replace(
    'from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/live-assistant-message-coalescer.js";',
    `from "${coalescerUrl}";`
  );
const {
  appendSessionMessageToState,
  applySessionTranslationPatchToState,
  mergeThinkingMessagesForDisplay,
  resolveTranslatedDisplayText,
} = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const sessionId = "session-1";
const firstPending = appendSessionMessageToState(
  {},
  {
    id: "reasoning-1",
    role: "thinking",
    sessionId,
    tag: "thinking",
    text: "I am checking the plan.",
    timestamp: "2026-07-01T00:00:00.000Z",
    translationState: "pending",
  }
);
const firstTranslated = applySessionTranslationPatchToState(firstPending, {
  localizedContent: "Проверяю план.",
  messageId: "reasoning-1",
  sessionId,
  sourceHash: "hash-1",
  targetLanguage: "ru",
});
const growingPending = appendSessionMessageToState(firstTranslated, {
  id: "reasoning-1",
  role: "thinking",
  sessionId,
  tag: "thinking",
  text: "I am checking the plan. Now I am reading the module.",
  timestamp: "2026-07-01T00:00:01.000Z",
  translationState: "pending",
});

assert.equal(growingPending[sessionId].length, 1);
assert.equal(
  growingPending[sessionId][0].text,
  "I am checking the plan. Now I am reading the module."
);
assert.equal(growingPending[sessionId][0].localizedContent, "Проверяю план.");
assert.equal(
  resolveTranslatedDisplayText(growingPending[sessionId][0], true),
  "Проверяю план."
);

const merged = mergeThinkingMessagesForDisplay(growingPending[sessionId]);
assert.equal(merged.length, 1);
assert.equal(merged[0].localizedContent, "Проверяю план.");
