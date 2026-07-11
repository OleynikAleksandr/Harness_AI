import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const normalizerSource = readFileSync(
  join(moduleDir, "codex-subagent-event-normalizer.ts"),
  "utf8"
);
const routerSource = readFileSync(
  join(moduleDir, "codex-app-server-event-router.ts"),
  "utf8"
);
const contractSource = readFileSync(
  join(
    moduleDir,
    "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.ts"
  ),
  "utf8"
);

for (const notification of [
  "item/started",
  "item/completed",
  "thread/started",
  "thread/status/changed",
  "turn/started",
  "turn/completed",
]) {
  assert.equal(normalizerSource.includes(notification), true, notification);
}

assert.match(normalizerSource, /collabAgentToolCall/u);
assert.match(normalizerSource, /subAgentActivity/u);
assert.match(normalizerSource, /agentThreadId/u);
assert.match(normalizerSource, /agentPath/u);
assert.match(normalizerSource, /thread_spawn/u);
assert.match(normalizerSource, /receiverThreadIds/u);
assert.match(normalizerSource, /agentsStates/u);
assert.match(normalizerSource, /agentNickname/u);
assert.match(normalizerSource, /agentRole/u);
assert.match(normalizerSource, /parentThreadId/u);
assert.match(
  normalizerSource,
  /childState\.workspacePath = parentState\.workspacePath/u
);
assert.match(normalizerSource, /errored: "failed"/u);
assert.match(normalizerSource, /notFound: "not_found"/u);
assert.doesNotMatch(
  normalizerSource,
  /type === "notLoaded"[\s\S]{0,80}return "pending"/u
);
assert.match(
  routerSource,
  /routeCodexSubagentNotification\(this\.deps, method, params\)/u
);
assert.match(contractSource, /export type ProviderSubagentEvent/u);
assert.match(contractSource, /type: "subagent_control"/u);
assert.match(contractSource, /type: "subagent_session"/u);
assert.match(contractSource, /type: "subagent_status"/u);

const compiledNormalizer = ts.transpileModule(normalizerSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const normalizerModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiledNormalizer).toString("base64")}`
);
const emitted = [];
const states = new Map();
const deps = {
  emit: (threadId, payload) => emitted.push({ payload, threadId }),
  ensureSessionState: (threadId) => {
    const state = states.get(threadId) ?? { workspacePath: "/default" };
    states.set(threadId, state);
    return state;
  },
};
states.set("parent-thread", { workspacePath: "/workspace" });

assert.equal(
  normalizerModule.routeCodexSubagentNotification(deps, "item/completed", {
    completedAtMs: 1_783_794_698_782,
    item: {
      agentPath: "/root/provider_event_audit",
      agentThreadId: "child-thread",
      id: "call-spawn",
      kind: "started",
      type: "subAgentActivity",
    },
    threadId: "parent-thread",
  }),
  true
);
assert.deepEqual(emitted.at(-1), {
  payload: {
    action: "spawn",
    agentStates: [{ providerSessionId: "child-thread", status: "running" }],
    callId: "call-spawn",
    lifecycleStatus: "completed",
    prompt: "Provider event audit",
    receiverProviderSessionIds: ["child-thread"],
    senderProviderSessionId: "parent-thread",
    timestamp: "2026-07-11T18:31:38.782Z",
    type: "subagent_control",
  },
  threadId: "parent-thread",
});
assert.equal(states.get("child-thread").workspacePath, "/workspace");

assert.equal(
  normalizerModule.routeCodexSubagentNotification(deps, "thread/started", {
    thread: {
      agentNickname: "Archimedes",
      createdAt: 1_783_794_698,
      id: "child-thread",
      parentThreadId: "parent-thread",
      preview: "Audit provider events",
      source: {
        subAgent: {
          thread_spawn: {
            agent_path: "/root/provider_event_audit",
            parent_thread_id: "parent-thread",
          },
        },
      },
      status: { type: "notLoaded" },
    },
  }),
  true
);
assert.deepEqual(emitted.at(-1).payload, {
  agentNickname: "Archimedes",
  parentProviderSessionId: "parent-thread",
  providerSessionId: "child-thread",
  status: "completed",
  task: "Audit provider events",
  timestamp: "2026-07-11T18:31:38.000Z",
  title: "Provider event audit",
  type: "subagent_session",
});

assert.equal(
  normalizerModule.routeCodexSubagentNotification(deps, "turn/completed", {
    threadId: "child-thread",
    turn: {
      completedAt: 1_783_794_700,
      error: null,
      status: "completed",
    },
  }),
  false
);
assert.deepEqual(emitted.at(-1).payload, {
  providerSessionId: "child-thread",
  status: "completed",
  timestamp: "2026-07-11T18:31:40.000Z",
  type: "subagent_status",
});
