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

rmSync(projectsDir, { force: true, recursive: true });
console.log("claude-subagent-observer tests passed");
