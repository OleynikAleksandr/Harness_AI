import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./codex-subagent-history-loader.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { CodexSubagentHistoryLoader } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const parentThread = {
  id: "parent-thread",
  parentThreadId: null,
  turns: [
    {
      completedAt: 1_783_794_800,
      id: "parent-turn",
      items: [
        { id: "parent-message", text: "Already in Core", type: "agentMessage" },
        {
          agentPath: "/root/provider_event_audit",
          agentThreadId: "child-thread",
          id: "call-spawn",
          kind: "started",
          type: "subAgentActivity",
        },
      ],
      startedAt: 1_783_794_698,
    },
  ],
};
const childSummary = {
  id: "child-reasoning",
  summary: [{ text: "Checked structured notifications" }],
  type: "reasoning",
};
const childThread = {
  agentNickname: "Archimedes",
  createdAt: 1_783_794_698,
  id: "child-thread",
  parentThreadId: "parent-thread",
  preview: "Audit provider events",
  source: {
    subAgent: {
      thread_spawn: {
        agent_path: "/root/provider_event_audit",
        depth: 1,
        parent_thread_id: "parent-thread",
      },
    },
  },
  status: { type: "notLoaded" },
  turns: [
    {
      completedAt: 1_783_794_760,
      id: "child-turn",
      items: [
        childSummary,
        {
          id: "child-answer",
          phase: "final_answer",
          text: "Provider event audit passed",
          type: "agentMessage",
        },
      ],
      startedAt: 1_783_794_700,
    },
  ],
};
const requests = [];
const notifications = [];
const loader = new CodexSubagentHistoryLoader({
  request: (method, params) => {
    requests.push({ method, params });
    if (method === "thread/list") {
      return Promise.resolve({
        data: [{ ...childThread, turns: [] }],
        nextCursor: null,
      });
    }
    return Promise.resolve({
      thread: params.threadId === "parent-thread" ? parentThread : childThread,
    });
  },
  routeNotification: (method, params) => notifications.push({ method, params }),
});

await loader.hydrate("parent-thread");

assert.deepEqual(
  requests.map(({ method, params }) => [method, params.threadId ?? null]),
  [
    ["thread/read", "parent-thread"],
    ["thread/list", null],
    ["thread/read", "child-thread"],
  ]
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "parent-message"
  ),
  false
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "call-spawn"
  ),
  true
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "thread/started" && params.thread.id === "child-thread"
  ),
  true
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "child-reasoning"
  ),
  true
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "child-answer"
  ),
  true
);

const requestCount = requests.length;
const notificationCount = notifications.length;
await loader.hydrate("parent-thread");
await loader.hydrate("child-thread");
assert.deepEqual(
  requests
    .slice(requestCount)
    .map(({ method, params }) => [method, params.threadId ?? null]),
  [["thread/list", null]]
);
assert.equal(notifications.length, notificationCount + 1);
assert.equal(notifications.at(-1).method, "thread/started");
assert.doesNotMatch(source, /readFile|jsonl|rollout/iu);
