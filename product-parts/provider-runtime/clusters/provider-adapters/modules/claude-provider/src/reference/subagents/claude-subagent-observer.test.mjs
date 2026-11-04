import assert from "node:assert/strict";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const compile = (specifier) => {
  const source = readFileSync(new URL(specifier, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
};

// The observer imports its sibling modules; rewrite the relative specifiers
// to data: URLs so the whole trio loads without a build step.
const filesUrl = `data:text/javascript;base64,${Buffer.from(
  compile("./claude-subagent-files.ts")
).toString("base64")}`;
const normalizerUrl = `data:text/javascript;base64,${Buffer.from(
  compile("./claude-subagent-event-normalizer.ts")
).toString("base64")}`;
const observerSource = compile("./claude-subagent-observer.ts")
  .replace("./claude-subagent-files.js", filesUrl)
  .replace("./claude-subagent-event-normalizer.js", normalizerUrl);
const observerUrl = `data:text/javascript;base64,${Buffer.from(observerSource).toString("base64")}`;
const { ClaudeSubagentObserver } = await import(observerUrl);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const projectsDir = mkdtempSync(join(tmpdir(), "harness-claude-subagent-obs-"));
// The slug directory name deliberately differs from anything configured: the
// observer must locate it by scanning the projects root.
const projectDir = join(projectsDir, "-Users-x-Test-md");
const parentId = "d47f61c9-64fa-4174-9b43-7fd4042f9ffc";
const parentPath = join(projectDir, `${parentId}.jsonl`);
const subagentsDir = join(projectDir, parentId, "subagents");
mkdirSync(subagentsDir, { recursive: true });

const makeEmitter = () => {
  const parentEvents = [];
  const childEvents = [];
  return {
    childEvents,
    emitToChild: (childId, payload) => childEvents.push({ childId, payload }),
    emitToParent: (event) => parentEvents.push(event),
    parentEvents,
  };
};

const writeAgentFiles = (agentId, description) => {
  writeFileSync(
    join(subagentsDir, `agent-${agentId}.meta.json`),
    JSON.stringify({
      agentType: "Explore",
      description,
      toolUseId: `toolu_${agentId}`,
      spawnDepth: 1,
    })
  );
  appendFileSync(
    join(subagentsDir, `agent-${agentId}.jsonl`),
    `${JSON.stringify({
      type: "assistant",
      uuid: `${agentId}-r1`,
      timestamp: "2026-07-12T18:38:50.000Z",
      isSidechain: true,
      agentId,
      message: {
        model: "claude-opus-4-8",
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Reading." },
          { type: "text", text: "Summary ready." },
        ],
      },
    })}\n`
  );
};

const writeParentTerminal = (agentId, status = "completed") => {
  appendFileSync(
    parentPath,
    `${JSON.stringify({
      type: "user",
      uuid: `${agentId}-result`,
      timestamp: "2026-07-12T18:39:34.000Z",
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: `toolu_${agentId}` }],
      },
      toolUseResult: {
        status,
        agentId,
        resolvedModel: "claude-opus-4-8",
      },
    })}\n`
  );
};

// --- Hydration of a finished subagent: spawn -> session -> transcript -> terminal.
writeFileSync(parentPath, "");
writeAgentFiles("aaa111", "Summarize batch 1");
writeParentTerminal("aaa111");
const hydratedEmitter = makeEmitter();
const hydratedObserver = new ClaudeSubagentObserver({
  emitter: hydratedEmitter,
  now: () => "now-ts",
  parentProviderSessionId: parentId,
  projectsDir,
  pollIntervalMs: 20,
});
await hydratedObserver.hydrate();
assert.deepEqual(
  hydratedEmitter.parentEvents.map((event) => event.type),
  ["subagent_control", "subagent_session"],
  "hydration replays spawn and session metadata on the parent channel"
);
// Core accepts subagent_status only on the child channel; the parent channel
// silently drops it (acceptance finding 2026-07-13).
const terminalEntry = hydratedEmitter.childEvents.find(
  (entry) => entry.payload.type === "subagent_status"
);
const terminal = terminalEntry.payload;
assert.equal(terminalEntry.childId, "agent-aaa111");
const [control, sessionEvent] = hydratedEmitter.parentEvents;
assert.equal(control.callId, "toolu_aaa111");
assert.equal(control.model, "claude-opus-4-8");
assert.equal(control.timestamp, "2026-07-12T18:38:50.000Z");
assert.deepEqual(control.receiverProviderSessionIds, ["agent-aaa111"]);
assert.equal(sessionEvent.task, "Summarize batch 1");
assert.equal(sessionEvent.agentRole, "Explore");
assert.equal(terminal.status, "completed");
assert.equal(terminal.providerSessionId, "agent-aaa111");
assert.deepEqual(
  hydratedEmitter.childEvents
    .filter((entry) => entry.payload.type !== "subagent_status")
    .map((entry) => [entry.childId, entry.payload.type, entry.payload.content]),
  [
    ["agent-aaa111", "thinking", "Reading."],
    ["agent-aaa111", "assistant", "Summary ready."],
  ],
  "transcript replays into the child channel"
);

// Re-hydration replays nothing new (replay-once inside the process).
await hydratedObserver.hydrate();
assert.equal(hydratedEmitter.parentEvents.length, 2);
assert.equal(hydratedEmitter.childEvents.length, 3);

// --- Hydration of an unfinished subagent marks it interrupted.
writeAgentFiles("bbb222", "Never finished");
const interruptedEmitter = makeEmitter();
const interruptedObserver = new ClaudeSubagentObserver({
  emitter: interruptedEmitter,
  now: () => "now-ts",
  parentProviderSessionId: parentId,
  projectsDir,
});
await interruptedObserver.hydrate();
const interruptedSession = interruptedEmitter.parentEvents.find(
  (event) =>
    event.type === "subagent_session" &&
    event.providerSessionId === "agent-bbb222"
);
assert.equal(interruptedSession.status, "interrupted");
const finishedSession = interruptedEmitter.parentEvents.find(
  (event) =>
    event.type === "subagent_session" &&
    event.providerSessionId === "agent-aaa111"
);
assert.equal(
  finishedSession.status,
  "running",
  "a terminal-backed agent spawns as running before its terminal event"
);

// --- Live polling: files written mid-turn surface without hydrate calls.
rmSync(join(projectDir, parentId), { force: true, recursive: true });
writeFileSync(parentPath, "");
mkdirSync(subagentsDir, { recursive: true });
const liveEmitter = makeEmitter();
const liveObserver = new ClaudeSubagentObserver({
  emitter: liveEmitter,
  now: () => "live-ts",
  parentProviderSessionId: parentId,
  projectsDir,
  pollIntervalMs: 15,
});
liveObserver.startTurnPolling();
await wait(25);
assert.equal(liveEmitter.parentEvents.length, 0, "empty dir emits nothing");
writeAgentFiles("ccc333", "Live task");
await wait(40);
assert.deepEqual(
  liveEmitter.parentEvents.map((event) => event.type),
  ["subagent_control", "subagent_session"],
  "live spawn shows up while the turn is polling"
);
assert.equal(liveEmitter.childEvents.length, 2);

// Terminal lands right before the turn ends; the final scan catches it.
appendFileSync(
  join(subagentsDir, "agent-ccc333.jsonl"),
  `${JSON.stringify({
    type: "assistant",
    uuid: "ccc333-r2",
    timestamp: "2026-07-12T18:39:30.000Z",
    message: {
      model: "claude-opus-4-8",
      role: "assistant",
      content: [{ type: "text", text: "Done." }],
    },
  })}\n`
);
writeParentTerminal("ccc333");
await liveObserver.stopTurnPolling();
const liveTerminal = liveEmitter.childEvents.at(-1);
assert.equal(
  liveTerminal.payload.type,
  "subagent_status",
  "final scan emits the terminal status into the child channel"
);
assert.equal(liveTerminal.payload.status, "completed");
assert.equal(liveTerminal.childId, "agent-ccc333");

// A throwing listener must not lose an already-read terminal: the parent
// cursor has advanced past it, so it stays pended and re-emits next scan.
rmSync(join(projectDir, parentId), { force: true, recursive: true });
writeFileSync(parentPath, "");
mkdirSync(subagentsDir, { recursive: true });
writeAgentFiles("ddd444", "Flaky listener");
writeParentTerminal("ddd444");
let failuresLeft = 1;
const flakyEvents = [];
const flakyObserver = new ClaudeSubagentObserver({
  emitter: {
    emitToChild: (childId, payload) => {
      if (payload.type === "subagent_status" && failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error("listener exploded");
      }
      flakyEvents.push(`${childId}:${payload.type}`);
    },
    emitToParent: () => undefined,
  },
  now: () => "flaky-ts",
  parentProviderSessionId: parentId,
  projectsDir,
});
await flakyObserver.hydrate();
assert.equal(
  flakyEvents.some((entry) => entry.includes("subagent_status")),
  false,
  "first emit failed"
);
await flakyObserver.hydrate();
assert.equal(
  flakyEvents.filter((entry) => entry === "agent-ddd444:subagent_status")
    .length,
  1,
  "pended terminal re-emits on the next scan"
);

// --- Token usage streaming (Codex subagent parity): each new last-call
// usage read from the agent JSONL reaches the child channel once.
rmSync(join(projectDir, parentId), { force: true, recursive: true });
writeFileSync(parentPath, "");
mkdirSync(subagentsDir, { recursive: true });
writeFileSync(
  join(subagentsDir, "agent-eee555.meta.json"),
  JSON.stringify({
    agentType: "Explore",
    description: "Token usage agent",
    toolUseId: "toolu_eee555",
    spawnDepth: 1,
  })
);
const usageRecord = (uuid, usage) =>
  `${JSON.stringify({
    type: "assistant",
    uuid,
    timestamp: "2026-07-14T12:00:00.000Z",
    isSidechain: true,
    agentId: "eee555",
    message: {
      model: "claude-opus-4-8",
      role: "assistant",
      content: [{ type: "text", text: `step ${uuid}` }],
      usage,
    },
  })}\n`;
appendFileSync(
  join(subagentsDir, "agent-eee555.jsonl"),
  usageRecord("eee555-r1", {
    input_tokens: 5,
    cache_read_input_tokens: 1000,
    cache_creation_input_tokens: 200,
  })
);
const usageEmitter = makeEmitter();
const usageObserver = new ClaudeSubagentObserver({
  emitter: usageEmitter,
  now: () => "usage-ts",
  parentProviderSessionId: parentId,
  projectsDir,
});
await usageObserver.hydrate();
const usageEvents = () =>
  usageEmitter.childEvents.filter(
    (entry) => entry.payload?.data?.kind === "token_usage"
  );
assert.equal(usageEvents().length, 1);
assert.equal(usageEvents()[0].childId, "agent-eee555");
assert.deepEqual(usageEvents()[0].payload.tokenUsage, {
  cached: 1000,
  limit: 0,
  used: 1205,
});
assert.deepEqual(usageEvents()[0].payload.data, {
  kind: "token_usage",
  used: 1205,
  limit: 0,
  cached: 1000,
});

// A rescan without new records must not re-emit the same figures.
await usageObserver.stopTurnPolling();
assert.equal(usageEvents().length, 1);

// A new API call appended to the JSONL emits the fresh figures once.
appendFileSync(
  join(subagentsDir, "agent-eee555.jsonl"),
  usageRecord("eee555-r2", {
    input_tokens: 6,
    cache_read_input_tokens: 1400,
    cache_creation_input_tokens: 0,
  })
);
await usageObserver.stopTurnPolling();
assert.equal(usageEvents().length, 2);
assert.deepEqual(usageEvents()[1].payload.tokenUsage, {
  cached: 1400,
  limit: 0,
  used: 1406,
});

// --- Background (async) agents: async_launched is not terminal, the text
// keeps streaming after the parent turn, and the task-notification ends it.
rmSync(join(projectDir, parentId), { force: true, recursive: true });
writeFileSync(parentPath, "");
mkdirSync(subagentsDir, { recursive: true });
const writeAsyncLaunch = (agentId) =>
  appendFileSync(
    parentPath,
    `${JSON.stringify({
      type: "user",
      timestamp: "2026-11-03T17:41:00.893Z",
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: `toolu_${agentId}` }],
      },
      toolUseResult: { agentId, status: "async_launched" },
    })}\n`
  );
const writeTaskNotification = (agentId, status = "completed") =>
  appendFileSync(
    parentPath,
    `${JSON.stringify({
      type: "queue-operation",
      operation: "enqueue",
      timestamp: "2026-11-03T17:41:38.210Z",
      content: `<task-notification>\n<task-id>${agentId}</task-id>\n<status>${status}</status>\n</task-notification>`,
    })}\n`
  );
const asyncEmitter = makeEmitter();
const asyncObserver = new ClaudeSubagentObserver({
  emitter: asyncEmitter,
  now: () => "async-ts",
  parentProviderSessionId: parentId,
  projectsDir,
  pollIntervalMs: 15,
});
asyncObserver.startTurnPolling();
writeAgentFiles("fff666", "Background task");
writeAsyncLaunch("fff666");
await asyncObserver.stopTurnPolling();
const asyncStatuses = () =>
  asyncEmitter.childEvents.filter(
    (entry) => entry.payload.type === "subagent_status"
  );
assert.equal(asyncStatuses().length, 0, "async_launched is not terminal");
assert.equal(
  asyncEmitter.parentEvents.find((event) => event.type === "subagent_session")
    .status,
  "running"
);
// The parent turn is over; the agent keeps writing and the poll keeps going.
appendFileSync(
  join(subagentsDir, "agent-fff666.jsonl"),
  `${JSON.stringify({
    type: "assistant",
    uuid: "fff666-r2",
    timestamp: "2026-11-03T17:41:30.000Z",
    message: {
      model: "claude-opus-4-8",
      role: "assistant",
      content: [{ type: "text", text: "Background progress." }],
    },
  })}\n`
);
await wait(60);
assert.ok(
  asyncEmitter.childEvents.some(
    (entry) => entry.payload.content === "Background progress."
  ),
  "text written after the parent turn streams into the child channel"
);
writeTaskNotification("fff666");
writeTaskNotification("bash-task-1");
await wait(60);
assert.equal(asyncStatuses().length, 1);
assert.equal(asyncStatuses()[0].payload.status, "completed");
assert.equal(asyncStatuses()[0].childId, "agent-fff666");
await wait(40);
assert.equal(asyncObserver.pollTimer, null, "polling stops once agents end");

// Hydration after a restart: the notification gives the real status; a
// launch without one is interrupted, never failed, and does not poll.
writeAgentFiles("ggg777", "Lost background task");
writeAsyncLaunch("ggg777");
const restartEmitter = makeEmitter();
const restartObserver = new ClaudeSubagentObserver({
  emitter: restartEmitter,
  now: () => "restart-ts",
  parentProviderSessionId: parentId,
  projectsDir,
  pollIntervalMs: 15,
});
await restartObserver.hydrate();
const restartStatus = (agentId) =>
  restartEmitter.childEvents.find(
    (entry) =>
      entry.childId === `agent-${agentId}` &&
      entry.payload.type === "subagent_status"
  )?.payload.status;
assert.equal(restartStatus("fff666"), "completed");
assert.equal(restartStatus("ggg777"), undefined);
assert.equal(
  restartEmitter.parentEvents.find(
    (event) =>
      event.type === "subagent_session" &&
      event.providerSessionId === "agent-ggg777"
  ).status,
  "interrupted"
);
await restartObserver.stopTurnPolling();
assert.equal(restartObserver.pollTimer, null, "historic launches never poll");

// closeSession stops a background poll for good.
asyncObserver.startTurnPolling();
await asyncObserver.close();
assert.equal(asyncObserver.pollTimer, null);
asyncObserver.startTurnPolling();
await asyncObserver.stopTurnPolling();
assert.equal(asyncObserver.pollTimer, null, "a closed observer never polls");

rmSync(projectsDir, { force: true, recursive: true });
console.log("claude-subagent-observer tests passed");
