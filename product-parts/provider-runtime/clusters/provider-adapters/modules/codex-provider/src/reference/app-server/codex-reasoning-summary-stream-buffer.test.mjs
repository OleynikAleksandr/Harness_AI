import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(
    new URL("./codex-reasoning-summary-stream-buffer.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;
const { CodexReasoningSummaryStreamBuffer } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const item = { itemId: "rs_1", itemKey: "thread:rs_1" };
const contents = (blocks) => blocks.map((block) => block.content);

// Streamed headline parts (2026-11-03 Codex summaries) lose their Markdown
// bold markers when a later part starts or the item completes.
const streamed = new CodexReasoningSummaryStreamBuffer();
streamed.startSummaryPart({ ...item, summaryIndex: 0 });
streamed.appendSummaryDelta({
  ...item,
  delta: "**Придумываю задачу для проверки.**",
  summaryIndex: 0,
});
assert.deepEqual(
  contents(streamed.startSummaryPart({ ...item, summaryIndex: 1 })),
  ["Придумываю задачу для проверки."]
);
streamed.appendSummaryDelta({
  ...item,
  delta: "**Checking the plan**\n\nThen I compare **both** options.",
  summaryIndex: 1,
});
assert.deepEqual(contents(streamed.flushRemaining(item)), [
  "Checking the plan\n\nThen I compare both options.",
]);

// Completed item blocks and the text fallback are cleaned the same way;
// unpaired or spaced asterisks stay untouched.
const completed = new CodexReasoningSummaryStreamBuffer();
assert.deepEqual(
  contents(
    completed.flushRemaining({
      ...item,
      finalSummaryBlocks: ["**Подбираю задачу о монетах.**", "2 ** 3 = 8"],
    })
  ),
  ["Подбираю задачу о монетах.", "2 ** 3 = 8"]
);
const fallback = new CodexReasoningSummaryStreamBuffer();
assert.deepEqual(
  contents(fallback.flushRemaining({ ...item, textFallback: "**Done.**" })),
  ["Done."]
);

console.log("codex reasoning summary stream buffer tests passed");
