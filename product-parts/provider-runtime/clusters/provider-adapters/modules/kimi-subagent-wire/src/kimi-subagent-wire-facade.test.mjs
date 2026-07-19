import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-subagent-wire-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-subagent-wire-resolve.ts",
    "kimi-subagent-wire-facade.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
      "utf8"
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }
  const { createKimiSubagentWireReader, resolveKimiSubagentWirePath } =
    await import(
      pathToFileURL(path.join(buildDir, "kimi-subagent-wire-facade.js")).href
    );

  const row = (value) => `${JSON.stringify(value)}\n`;

  // --- Resolve: store layout mirroring the live CLI 0.26.0 session store.
  const store = path.join(root, "store");
  const agentsDir = path.join(store, "agents");
  for (const agent of ["main", "agent-0", "agent-1"]) {
    await mkdir(path.join(agentsDir, agent), { recursive: true });
  }
  writeFileSync(
    path.join(agentsDir, "main", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }) +
      row({
        type: "context.append_loop_event",
        event: {
          type: "tool.call",
          toolCallId: "tool_aaa",
          name: "Agent",
          args: { prompt: "Investigate the timer module deeply." },
        },
        time: 1_784_385_060_000,
      }) +
      row({
        type: "context.append_loop_event",
        event: {
          type: "tool.call",
          toolCallId: "tool_bbb",
          name: "Agent",
          args: { prompt: "Create the wire reader." },
        },
        time: 1_784_386_700_000,
      }),
    "utf8"
  );
  writeFileSync(
    path.join(agentsDir, "agent-0", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }) +
      row({
        type: "turn.prompt",
        input: [{ type: "text", text: "Investigate the timer module deeply." }],
        time: 1_784_385_060_100,
      }),
    "utf8"
  );
  writeFileSync(
    path.join(agentsDir, "agent-1", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }) +
      row({
        type: "turn.prompt",
        input: [
          {
            type: "text",
            text: "<git-context>\nWorking directory: /repo\nBranch: main\n</git-context>\n\nCreate the wire reader.",
          },
        ],
        time: 1_784_386_700_100,
      }),
    "utf8"
  );
  writeFileSync(
    path.join(store, "state.json"),
    JSON.stringify({
      agents: {
        main: { type: "main", parentAgentId: null },
        "agent-0": { type: "sub", parentAgentId: "main" },
        "agent-1": { type: "sub", parentAgentId: "main" },
      },
    }),
    "utf8"
  );

  // The ACP counter prefix is NOT the store agent index: `3:tool_bbb`
  // resolves through the spawn prompt to agent-1, `1:tool_aaa` to agent-0.
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-3:tool_bbb", store),
    path.join(agentsDir, "agent-1", "wire.jsonl")
  );
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-1:tool_aaa", store),
    path.join(agentsDir, "agent-0", "wire.jsonl")
  );
  // A swarm member id carries the store agent id as its trailing segment.
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-7:tool_aaa:agent-1", store),
    path.join(agentsDir, "agent-1", "wire.jsonl")
  );
  // Missing member wire, unknown spawn with an ambiguous store, and foreign
  // ids all resolve to null.
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-7:tool_zzz:agent-9", store),
    null
  );
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-9:tool_zzz", store),
    null
  );
  assert.equal(resolveKimiSubagentWirePath("kimi-native-abc", store), null);

  // --- Resolve fallback: exactly one sub agent in state.json decides.
  const singleStore = path.join(root, "store-single");
  await mkdir(path.join(singleStore, "agents", "agent-0"), {
    recursive: true,
  });
  writeFileSync(
    path.join(singleStore, "agents", "agent-0", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }),
    "utf8"
  );
  writeFileSync(
    path.join(singleStore, "state.json"),
    JSON.stringify({
      agents: {
        main: { type: "main", parentAgentId: null },
        "agent-0": { type: "sub", parentAgentId: "main" },
      },
    }),
    "utf8"
  );
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-2:tool_qqq", singleStore),
    path.join(singleStore, "agents", "agent-0", "wire.jsonl")
  );
  // Without state.json the directory scan supplies the same single-sub
  // fallback.
  const bareStore = path.join(root, "store-bare");
  await mkdir(path.join(bareStore, "agents", "agent-0"), { recursive: true });
  writeFileSync(
    path.join(bareStore, "agents", "agent-0", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }),
    "utf8"
  );
  assert.equal(
    resolveKimiSubagentWirePath("kimi-agent-2:tool_qqq", bareStore),
    path.join(bareStore, "agents", "agent-0", "wire.jsonl")
  );

  // --- Incremental reader: delta reads, partial-line buffering, normalization.
  const childId = "kimi-agent-3:tool_bbb";
  const wirePath = path.join(agentsDir, "agent-1", "wire.jsonl");
  const reader = createKimiSubagentWireReader({
    childProviderSessionId: childId,
    wirePath,
  });

  // The fixture already holds metadata + turn.prompt: only turn_started.
  const firstBatch = reader.readNewEvents();
  assert.deepEqual(
    firstBatch.map((event) => event.type),
    ["turn_started"]
  );
  assert.equal(firstBatch[0].uuid, `${childId}:wire:2:turn_started`);
  assert.equal(
    firstBatch[0].timestamp,
    new Date(1_784_386_700_100).toISOString()
  );
  // A no-change poll returns nothing.
  assert.deepEqual(reader.readNewEvents(), []);

  // Append a partial think line: it stays buffered until the newline lands.
  const thinkRow = JSON.stringify({
    type: "context.append_loop_event",
    event: {
      type: "content.part",
      uuid: "p1",
      turnId: "0",
      step: 1,
      part: { type: "think", think: "Plan first." },
    },
    time: 1_784_386_701_000,
  });
  appendFileSync(wirePath, thinkRow.slice(0, 40), "utf8");
  assert.deepEqual(reader.readNewEvents(), []);
  appendFileSync(
    wirePath,
    `${thinkRow.slice(40)}\n${row({
      type: "context.append_loop_event",
      event: {
        type: "tool.call",
        uuid: "t1",
        toolCallId: "tool_x",
        name: "Read",
        args: {},
      },
      time: 1_784_386_702_000,
    })}${row({
      type: "context.append_loop_event",
      event: {
        type: "content.part",
        uuid: "p2",
        turnId: "0",
        step: 1,
        part: { type: "text", text: "Done reading." },
      },
      time: 1_784_386_703_000,
    })}${row({
      type: "usage.record",
      model: "k3",
      usage: {
        inputOther: 100,
        output: 20,
        inputCacheRead: 30,
        inputCacheCreation: 5,
      },
      usageScope: "turn",
      time: 1_784_386_704_000,
    })}`,
    "utf8"
  );
  const secondBatch = reader.readNewEvents();
  assert.deepEqual(
    secondBatch.map((event) => event.type),
    ["dialog_message", "dialog_message", "stream_event", "turn_completed"]
  );
  const [thinking, assistant, tokenUsage, turnCompleted] = secondBatch;
  assert.deepEqual(
    {
      content: thinking.content,
      role: thinking.role,
      tag: thinking.tag,
      uuid: thinking.uuid,
    },
    {
      content: "Plan first.",
      role: "thinking",
      tag: "thinking",
      uuid: `${childId}:wire:3`,
    }
  );
  assert.deepEqual(
    {
      content: assistant.content,
      role: assistant.role,
      tag: assistant.tag,
      uuid: assistant.uuid,
    },
    {
      content: "Done reading.",
      role: "assistant",
      tag: undefined,
      uuid: `${childId}:wire:5`,
    }
  );
  // used = inputOther + output + inputCacheCreation + inputCacheRead.
  assert.deepEqual(tokenUsage.data, {
    kind: "token_usage",
    tokenUsage: { cached: 30, used: 155 },
    turnCount: 1,
  });
  assert.equal(tokenUsage.uuid, `${childId}:wire:6:token_usage`);
  assert.equal(turnCompleted.turnCount, 1);
  assert.equal(turnCompleted.uuid, `${childId}:wire:6:turn_completed`);

  // A second turn-scoped usage record advances the native turnCount.
  appendFileSync(
    wirePath,
    row({
      type: "usage.record",
      model: "k3",
      usage: {
        inputOther: 10,
        output: 5,
        inputCacheRead: 0,
        inputCacheCreation: 0,
      },
      usageScope: "turn",
      time: 1_784_386_705_000,
    }) +
      row({
        type: "usage.record",
        model: "k3",
        usage: { inputOther: 999, output: 0 },
        usageScope: "step",
        time: 1_784_386_706_000,
      }),
    "utf8"
  );
  const thirdBatch = reader.readNewEvents();
  assert.deepEqual(
    thirdBatch.map((event) => event.type),
    ["stream_event", "turn_completed"]
  );
  assert.equal(thirdBatch[0].data.turnCount, 2);
  assert.deepEqual(thirdBatch[0].data.tokenUsage, { cached: 0, used: 15 });
  assert.equal(thirdBatch[1].turnCount, 2);

  // --- Deterministic replay: a fresh reader from offset 0 re-emits the same
  // event ids, which is what makes Core-side idempotent append possible.
  const replayReader = createKimiSubagentWireReader({
    childProviderSessionId: childId,
    wirePath,
  });
  const replayed = replayReader.readNewEvents();
  assert.deepEqual(
    replayed.map((event) => event.uuid),
    [
      `${childId}:wire:2:turn_started`,
      `${childId}:wire:3`,
      `${childId}:wire:5`,
      `${childId}:wire:6:token_usage`,
      `${childId}:wire:6:turn_completed`,
      `${childId}:wire:7:token_usage`,
      `${childId}:wire:7:turn_completed`,
    ]
  );
  assert.equal(replayReader.readNewEvents().length, 0);

  // A missing wire reads as an empty delta instead of throwing.
  const missingReader = createKimiSubagentWireReader({
    childProviderSessionId: childId,
    wirePath: path.join(root, "nowhere", "wire.jsonl"),
  });
  assert.deepEqual(missingReader.readNewEvents(), []);

  console.log("kimi-subagent-wire-facade.test.mjs: OK");
} finally {
  await rm(root, { force: true, recursive: true });
}
