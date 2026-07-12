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
      completedAt: null,
      id: "parent-turn",
      items: [
        {
          id: "parent-message",
          text: "Already in Core",
          type: "agentMessage",
        },
      ],
      startedAt: 1_783_794_698,
      status: "interrupted",
    },
    {
      completedAt: 1_783_794_760,
      id: "child-turn",
      items: [
        {
          agentPath: "/root/provider_event_audit",
          agentThreadId: "child-thread",
          id: "call-spawn",
          kind: "started",
          type: "subAgentActivity",
        },
        {
          agentPath: "/root/core_session_graph_audit",
          agentThreadId: "sibling-thread",
          id: "call-sibling",
          kind: "started",
          type: "subAgentActivity",
        },
        {
          agentPath: "/root/provider_event_audit/nested_audit",
          agentThreadId: "grandchild-thread",
          id: "call-grandchild",
          kind: "started",
          type: "subAgentActivity",
        },
        childSummary,
        {
          id: "child-answer",
          phase: "final_answer",
          text: "Provider event audit passed",
          type: "agentMessage",
        },
      ],
      startedAt: 1_783_794_700,
      status: "interrupted",
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
  notifications.filter(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "call-spawn"
  ).length,
  1
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "call-sibling"
  ),
  false
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "item/completed" && params.item.id === "call-grandchild"
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
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "turn/completed" &&
      params.threadId === "child-thread" &&
      params.turn.id === "parent-turn"
  ),
  false
);
assert.equal(
  notifications.some(
    ({ method, params }) =>
      method === "turn/completed" &&
      params.threadId === "child-thread" &&
      params.turn.id === "child-turn" &&
      params.turn.status === "interrupted"
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
// A child whose terminal status was already replayed is never re-announced:
// a late thread/started used to downgrade the restored terminal status.
assert.equal(notifications.length, notificationCount);

// Regression: concurrent hydrate(parent) + hydrate(child) runs through one
// serial chain, so the child's final notification stays terminal and no
// thread/started arrives after its terminal replay.
const concurrentNotifications = [];
const delayed = (value) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), 1);
  });
const raceLoader = new CodexSubagentHistoryLoader({
  request: (method, params) => {
    if (method === "thread/list") {
      return delayed({
        data: [{ ...childThread, turns: [] }],
        nextCursor: null,
      });
    }
    return delayed({
      thread: params.threadId === "parent-thread" ? parentThread : childThread,
    });
  },
  routeNotification: (method, params) =>
    concurrentNotifications.push({ method, params }),
});
await Promise.all([
  raceLoader.hydrate("parent-thread"),
  raceLoader.hydrate("child-thread"),
]);
const childStatusEvents = concurrentNotifications.filter(
  ({ method, params }) =>
    (method === "thread/started" && params.thread?.id === "child-thread") ||
    (["turn/started", "turn/completed"].includes(method) &&
      params.threadId === "child-thread")
);
assert.equal(childStatusEvents.length > 0, true);
assert.equal(childStatusEvents.at(-1).method, "turn/completed");
assert.equal(childStatusEvents.at(-1).params.turn.status, "interrupted");
const terminalIndex = concurrentNotifications.findIndex(
  ({ method, params }) =>
    method === "turn/completed" && params.threadId === "child-thread"
);
assert.equal(terminalIndex >= 0, true);
const lateStarted = concurrentNotifications
  .slice(terminalIndex + 1)
  .some(
    ({ method, params }) =>
      method === "thread/started" && params.thread?.id === "child-thread"
  );
assert.equal(lateStarted, false);

assert.match(source, /hydrationChain/u);
assert.match(source, /replayedTerminalStatuses\.has\(descendantId\)/u);
assert.doesNotMatch(source, /readFile|jsonl|rollout/iu);
