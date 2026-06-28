import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-event-normalizer-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ProviderEventNormalizerFacade } = await import(moduleUrl);

const normalizer = new ProviderEventNormalizerFacade();

normalizer.normalizeCodexNotification("item/reasoning/summaryTextDelta", {
  delta: "first ",
  itemId: "reasoning-1",
  summaryIndex: 0,
  threadId: "thread-1",
});
normalizer.normalizeCodexNotification("item/reasoning/summaryTextDelta", {
  delta: "block",
  itemId: "reasoning-1",
  summaryIndex: 0,
  threadId: "thread-1",
});

assert.deepEqual(
  normalizer
    .normalizeCodexNotification("item/reasoning/summaryPartAdded", {
      itemId: "reasoning-1",
      summaryIndex: 1,
      threadId: "thread-1",
    })
    .map(({ content, tag, type, uuid }) => ({ content, tag, type, uuid })),
  [
    {
      content: "first block",
      tag: "thinking",
      type: "dialog_message",
      uuid: "reasoning-1::summary-block::0",
    },
  ]
);

normalizer.normalizeCodexNotification("item/reasoning/textDelta", {
  delta: "fallback ",
  itemId: "reasoning-2",
  threadId: "thread-1",
});
normalizer.normalizeCodexNotification("item/reasoning/textDelta", {
  delta: "text",
  itemId: "reasoning-2",
  threadId: "thread-1",
});

assert.deepEqual(
  normalizer
    .normalizeCodexNotification("item/completed", {
      item: { id: "reasoning-2", type: "reasoning" },
      threadId: "thread-1",
    })
    .map(({ content, tag, type, uuid }) => ({ content, tag, type, uuid })),
  [
    {
      content: "fallback text",
      tag: "thinking",
      type: "dialog_message",
      uuid: "reasoning-2::summary-block::0",
    },
  ]
);
