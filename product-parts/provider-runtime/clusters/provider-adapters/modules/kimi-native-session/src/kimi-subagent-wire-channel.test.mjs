import assert from "node:assert/strict";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-wire-channel-"));

try {
  // Flat build: the channel hub, the sibling wire module it reads through,
  // and the full native-session driver stack for the end-to-end flow.
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  const homeManagerSource = readFileSync(
    new URL(
      "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts",
      import.meta.url
    ),
    "utf8"
  );
  const transpile = (source) =>
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
  writeFileSync(
    path.join(buildDir, "provider-home-manager-facade.js"),
    transpile(homeManagerSource),
    "utf8"
  );
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-acp-session-router.ts",
    "kimi-acp-session-process.ts",
    "kimi-subagent-normalizer.ts",
    "kimi-session-event-normalizer.ts",
    "kimi-session-usage-reader.ts",
    "kimi-subagent-wire-channel.ts",
    "kimi-swarm-progress-reader.ts",
    "kimi-workspace-home.ts",
    "kimi-native-session-runtime.ts",
    "kimi-interaction-bridge.ts",
    "kimi-native-session-facade.ts",
  ]) {
    const source = readFileSync(
      new URL(`./${filename}`, import.meta.url),
      "utf8"
    );
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      transpile(source)
        .replaceAll(
          "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js",
          "./provider-home-manager-facade.js"
        )
        .replaceAll(
          "../../kimi-subagent-wire/src/kimi-subagent-wire-facade.js",
          "./kimi-subagent-wire-facade.js"
        ),
      "utf8"
    );
  }
  for (const filename of [
    "kimi-subagent-wire-facade.ts",
    "kimi-subagent-wire-resolve.ts",
  ]) {
    const source = readFileSync(
      new URL(`../../kimi-subagent-wire/src/${filename}`, import.meta.url),
      "utf8"
    );
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      transpile(source),
      "utf8"
    );
  }
  const { KimiSubagentWireChannelHub } = await import(
    pathToFileURL(path.join(buildDir, "kimi-subagent-wire-channel.js")).href
  );
  const { KimiNativeSessionDriver } = await import(
    pathToFileURL(path.join(buildDir, "kimi-native-session-facade.js")).href
  );

  const row = (value) => `${JSON.stringify(value)}\n`;
  const spawnCall = (toolCallId, prompt, time) =>
    row({
      type: "context.append_loop_event",
      event: {
        type: "tool.call",
        toolCallId,
        name: "Agent",
        args: { prompt },
      },
      time,
    });
  const promptRow = (prompt, time) =>
    row({
      type: "turn.prompt",
      input: [{ type: "text", text: prompt }],
      time,
    });
  const thinkRow = (think, time) =>
    row({
      type: "context.append_loop_event",
      event: { type: "content.part", part: { type: "think", think } },
      time,
    });
  const textRow = (text, time) =>
    row({
      type: "context.append_loop_event",
      event: { type: "content.part", part: { type: "text", text } },
      time,
    });

  // --- Hub against a fixture store with two sub-agents: agent-0 closes its
  // turn with a usage record, agent-1 leaves its turn open.
  const sessionsRoot = path.join(root, "hub-sessions");
  const store = path.join(sessionsRoot, "wd_hub", "kimi-s-hub");
  const agentsDir = path.join(store, "agents");
  for (const agent of ["main", "agent-0", "agent-1"]) {
    await mkdir(path.join(agentsDir, agent), { recursive: true });
  }
  writeFileSync(
    path.join(agentsDir, "main", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }) +
      spawnCall("tool_aaa", "Research the channel.", 1_784_385_060_000) +
      spawnCall("tool_bbb", "Second research.", 1_784_385_060_500),
    "utf8"
  );
  const wireZero = path.join(agentsDir, "agent-0", "wire.jsonl");
  writeFileSync(
    wireZero,
    row({ type: "metadata", protocol_version: "1.4" }) +
      promptRow("Research the channel.", 1_784_385_060_100) +
      thinkRow("Channel thinking.", 1_784_385_061_000) +
      textRow("Channel answer.", 1_784_385_062_000),
    "utf8"
  );
  const wireOne = path.join(agentsDir, "agent-1", "wire.jsonl");
  writeFileSync(
    wireOne,
    row({ type: "metadata", protocol_version: "1.4" }) +
      promptRow("Second research.", 1_784_385_060_600) +
      thinkRow("Second thinking.", 1_784_385_061_500),
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

  const childOne = "kimi-agent-1:tool_aaa";
  const childTwo = "kimi-agent-2:tool_bbb";
  const hub = new KimiSubagentWireChannelHub({
    readAcpSessionId: () => "kimi-s-hub",
    sessionsRoot,
  });

  // Subscribe replays the wire from offset 0 straight into the listener.
  const eventsOne = [];
  const stopOne = hub.subscribe(childOne, (event) => eventsOne.push(event));
  assert.deepEqual(
    eventsOne.map((event) => event.type),
    ["turn_started", "dialog_message", "dialog_message"]
  );
  assert.equal(eventsOne[0].uuid, `${childOne}:wire:2:turn_started`);
  assert.equal(eventsOne[1].role, "thinking");
  assert.equal(eventsOne[1].content, "Channel thinking.");
  assert.equal(eventsOne[2].role, "assistant");
  hub.pump();
  assert.equal(eventsOne.length, 3);

  // The next pump delivers the appended turn-scoped usage record and closes
  // the turn natively (no synthesized completion needed later).
  appendFileSync(
    wireZero,
    row({
      type: "usage.record",
      usage: {
        inputOther: 100,
        output: 20,
        inputCacheRead: 30,
        inputCacheCreation: 5,
      },
      usageScope: "turn",
      time: 1_784_385_063_000,
    }),
    "utf8"
  );
  hub.pump();
  assert.deepEqual(
    eventsOne.slice(3).map((event) => event.type),
    ["stream_event", "turn_completed"]
  );
  assert.deepEqual(eventsOne[3].data, {
    kind: "token_usage",
    tokenUsage: { cached: 30, used: 155 },
    turnCount: 1,
  });

  // Terminal drain: the second child's turn stays open in the wire, so the
  // finish synthesizes the closing turn_completed and stops the channel.
  const eventsTwo = [];
  hub.subscribe(childTwo, (event) => eventsTwo.push(event));
  assert.deepEqual(
    eventsTwo.map((event) => event.type),
    ["turn_started", "dialog_message"]
  );
  // A non-terminal status changes nothing.
  hub.observeEvent({
    type: "subagent_status",
    providerSessionId: childTwo,
    status: "running",
  });
  hub.pump();
  assert.equal(eventsTwo.length, 2);
  hub.observeEvent({
    type: "subagent_status",
    providerSessionId: childTwo,
    status: "completed",
  });
  hub.pump();
  assert.deepEqual(
    eventsTwo.map((event) => event.type),
    ["turn_started", "dialog_message", "turn_completed"]
  );
  const drained = eventsTwo.at(-1);
  assert.equal(drained.uuid, `${childTwo}:wire:drain:turn_completed`);
  // No native turnCount: Core counts exactly one turn for the open one.
  assert.equal(drained.turnCount, undefined);
  // The finished channel is gone: late wire rows deliver nothing.
  appendFileSync(wireOne, textRow("Late row.", 1_784_385_064_000), "utf8");
  hub.pump();
  assert.equal(eventsTwo.length, 3);

  // finishTurn leaves non-terminal channels untouched.
  hub.finishTurn();
  assert.equal(eventsOne.length, 5);

  // unsubscribe stops the tailer: appended rows no longer arrive.
  stopOne();
  appendFileSync(wireZero, textRow("After stop.", 1_784_385_065_000), "utf8");
  hub.pump();
  assert.equal(eventsOne.length, 5);

  // No live runtime (restart-resume without the parent): subscribe and the
  // poll cycle degrade to a safe no-op instead of throwing.
  const deadHub = new KimiSubagentWireChannelHub({
    readAcpSessionId: () => null,
    sessionsRoot,
  });
  const deadEvents = [];
  const deadStop = deadHub.subscribe(childOne, (event) =>
    deadEvents.push(event)
  );
  deadHub.pump();
  deadHub.finishTurn();
  assert.deepEqual(deadEvents, []);
  deadStop();
  const missingHub = new KimiSubagentWireChannelHub({
    readAcpSessionId: () => "kimi-s-missing",
    sessionsRoot,
  });
  missingHub.subscribe(childOne, (event) => deadEvents.push(event));
  missingHub.pump();
  assert.deepEqual(deadEvents, []);

  // A child the store cannot attribute yet stays pending; the next poll
  // after the wire lands attributes and replays it.
  const pendingRoot = path.join(root, "pending-sessions");
  const pendingStore = path.join(pendingRoot, "wd_p", "kimi-s-p");
  await mkdir(path.join(pendingStore, "agents"), { recursive: true });
  const pendingHub = new KimiSubagentWireChannelHub({
    readAcpSessionId: () => "kimi-s-p",
    sessionsRoot: pendingRoot,
  });
  const pendingEvents = [];
  pendingHub.subscribe(childOne, (event) => pendingEvents.push(event));
  assert.deepEqual(pendingEvents, []);
  await mkdir(path.join(pendingStore, "agents", "main"), { recursive: true });
  await mkdir(path.join(pendingStore, "agents", "agent-0"), {
    recursive: true,
  });
  writeFileSync(
    path.join(pendingStore, "agents", "main", "wire.jsonl"),
    spawnCall("tool_aaa", "Research the channel.", 1_784_385_060_000),
    "utf8"
  );
  writeFileSync(
    path.join(pendingStore, "agents", "agent-0", "wire.jsonl"),
    promptRow("Research the channel.", 1_784_385_060_100) +
      textRow("Pending answer.", 1_784_385_062_000),
    "utf8"
  );
  pendingHub.pump();
  assert.deepEqual(
    pendingEvents.map((event) => event.type),
    ["turn_started", "dialog_message"]
  );

  // --- End to end through the driver: a single-Agent turn spawns the
  // child, the mid-turn subscribe attaches the real wire channel, and the
  // terminal tool update drains it to idle.
  const workspace = path.join(root, "driver-workspace");
  const fakeCli = path.join(root, "fake-kimi-agent.mjs");
  await writeFile(
    fakeCli,
    [
      'import { createInterface } from "node:readline";',
      "const write = (payload) => {",
      '  process.stdout.write(JSON.stringify(payload) + "\\n");',
      "};",
      "const update = (sessionUpdate, extra) => {",
      "  write({",
      '    jsonrpc: "2.0",',
      '    method: "session/update",',
      '    params: { sessionId: "kimi-s-ch", update: { sessionUpdate, ...extra } },',
      "  });",
      "};",
      "const text = (value) => [",
      '  { content: { text: value, type: "text" }, type: "content" },',
      "];",
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { protocolVersion: 1 } });',
      "  }",
      '  if (message.method === "session/new") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { sessionId: "kimi-s-ch" } });',
      "  }",
      '  if (message.method === "session/set_config_option") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "  }",
      '  if (message.method === "session/prompt") {',
      '    update("tool_call", { status: "pending", title: "Agent", toolCallId: "1:tool_aaa" });',
      "    setTimeout(() => {",
      '      update("tool_call_update", {',
      "        content: text(",
      '          "agent_id: agent-0\\nactual_subagent_type: explore\\nstatus: completed\\n[summary]\\nChannel done.",',
      "        ),",
      '        status: "completed",',
      '        toolCallId: "1:tool_aaa",',
      "      });",
      "      write({",
      "        id: message.id,",
      '        jsonrpc: "2.0",',
      '        result: { stopReason: "end_turn" },',
      "      });",
      "    }, 250);",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );
  const driver = new KimiNativeSessionDriver({
    processOverrides: { command: process.execPath, commandArgs: [fakeCli] },
  });
  const parentId = await driver.createSession({ workspacePath: workspace });
  // The fake CLI session id is fixed; its fixture store mirrors the hub one.
  const driverStore = path.join(
    workspace,
    ".harness",
    "runtime",
    "providers",
    "kimi",
    "home",
    ".kimi-code",
    "sessions",
    "wd_drv",
    "kimi-s-ch"
  );
  await mkdir(path.join(driverStore, "agents", "main"), { recursive: true });
  await mkdir(path.join(driverStore, "agents", "agent-0"), {
    recursive: true,
  });
  writeFileSync(
    path.join(driverStore, "agents", "main", "wire.jsonl"),
    spawnCall("tool_aaa", "Research the channel.", 1_784_385_060_000),
    "utf8"
  );
  writeFileSync(
    path.join(driverStore, "agents", "agent-0", "wire.jsonl"),
    row({ type: "metadata", protocol_version: "1.4" }) +
      promptRow("Research the channel.", 1_784_385_060_100) +
      thinkRow("Channel thinking.", 1_784_385_061_000) +
      textRow("Channel answer.", 1_784_385_062_000),
    "utf8"
  );
  writeFileSync(
    path.join(driverStore, "state.json"),
    JSON.stringify({
      agents: {
        main: { type: "main", parentAgentId: null },
        "agent-0": { type: "sub", parentAgentId: "main" },
      },
    }),
    "utf8"
  );

  const parentEvents = [];
  driver.subscribe(parentId, (event) => parentEvents.push(event));
  const sending = driver.sendMessage(parentId, "run the agent");
  const spawnDeadline = Date.now() + 5000;
  while (
    !parentEvents.some(
      (event) =>
        event.type === "subagent_session" &&
        event.providerSessionId === "kimi-agent-1:tool_aaa" &&
        event.status === "running"
    )
  ) {
    if (Date.now() > spawnDeadline) {
      throw new Error("child spawn was not observed on the parent stream");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const childEvents = [];
  driver.subscribe("kimi-agent-1:tool_aaa", (event) => childEvents.push(event));
  await sending;

  assert.deepEqual(
    childEvents.map((event) => event.type),
    ["turn_started", "dialog_message", "dialog_message", "turn_completed"]
  );
  assert.equal(
    childEvents[0].uuid,
    "kimi-agent-1:tool_aaa:wire:2:turn_started"
  );
  assert.equal(childEvents[1].role, "thinking");
  assert.equal(childEvents[1].content, "Channel thinking.");
  assert.equal(childEvents[2].role, "assistant");
  assert.equal(childEvents[2].content, "Channel answer.");
  assert.equal(
    childEvents[3].uuid,
    "kimi-agent-1:tool_aaa:wire:drain:turn_completed"
  );
  // The parent stream kept its own synthesized lifecycle (spawn + terminal).
  assert.ok(
    parentEvents.some(
      (event) =>
        event.type === "subagent_control" &&
        event.receiverProviderSessionIds?.[0] === "kimi-agent-1:tool_aaa"
    )
  );
  const terminalStatus = parentEvents
    .filter(
      (event) =>
        event.type === "subagent_status" &&
        event.providerSessionId === "kimi-agent-1:tool_aaa"
    )
    .at(-1);
  assert.equal(terminalStatus.status, "completed");

  // A child no live runtime claims degrades to an inert subscription and a
  // no-op resume instead of an unknown-session error.
  const orphan = "kimi-agent-9:tool_zzz";
  const orphanEvents = [];
  const orphanStop = driver.subscribe(orphan, (event) =>
    orphanEvents.push(event)
  );
  assert.equal(typeof orphanStop, "function");
  orphanStop();
  assert.equal(
    await driver.resumeSession(orphan, { workspacePath: workspace }),
    orphan
  );
  assert.deepEqual(orphanEvents, []);

  await driver.deleteSession(parentId);

  console.log("kimi subagent wire channel tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
