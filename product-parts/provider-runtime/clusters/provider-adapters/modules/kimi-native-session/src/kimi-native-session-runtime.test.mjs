import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-native-runtime-"));

try {
  const buildDir = path.join(root, "build", "kimi-native-session", "src");
  const normalizerContractDir = path.join(
    root,
    "build",
    "provider-events-and-translation",
    "modules",
    "provider-event-normalizer",
    "src"
  );
  await mkdir(buildDir, { recursive: true });
  await mkdir(normalizerContractDir, { recursive: true });
  writeFileSync(
    path.join(normalizerContractDir, "provider-event-normalizer-facade.js"),
    "export {};\n",
    "utf8"
  );
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-acp-session-router.ts",
    "kimi-acp-session-process.ts",
    "kimi-subagent-normalizer.ts",
    "kimi-session-event-normalizer.ts",
    "kimi-session-usage-reader.ts",
    "kimi-swarm-progress-reader.ts",
    "kimi-native-session-runtime.ts",
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
      compiled.replaceAll(
        "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js",
        "../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js"
      ),
      "utf8"
    );
  }
  const { KimiSessionEventNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "kimi-session-event-normalizer.js")).href
  );
  const { KimiNativeSessionRuntime } = await import(
    pathToFileURL(path.join(buildDir, "kimi-native-session-runtime.js")).href
  );

  // Normalizer: chunk buffering, tool flushing, usage mapping.
  const normalizer = new KimiSessionEventNormalizer();
  const asUpdate = (update) => ({
    method: "session/update",
    params: { sessionId: "kimi-s-1", update },
  });
  assert.deepEqual(
    normalizer.normalizeNotification(
      asUpdate({
        content: { text: "short thought" },
        sessionUpdate: "agent_thought_chunk",
      })
    ),
    []
  );
  const toolFlush = normalizer.normalizeNotification(
    asUpdate({
      sessionUpdate: "tool_call",
      status: "in_progress",
      title: "Read",
      toolCallId: "call-1",
    })
  );
  assert.equal(toolFlush[0].type, "dialog_message");
  assert.equal(toolFlush[0].role, "thinking");
  assert.equal(toolFlush[0].content, "short thought");
  assert.equal(toolFlush[1].type, "stream_event");
  assert.equal(toolFlush[1].data.kind, "kimi_tool_call");
  assert.equal(toolFlush[1].data.toolName, "Read");

  const longText = `${"word ".repeat(200)}end.`;
  const bigFlush = normalizer.normalizeNotification(
    asUpdate({
      content: { text: longText },
      sessionUpdate: "agent_message_chunk",
    })
  );
  assert.equal(bigFlush.length, 1);
  assert.equal(bigFlush[0].role, "assistant");

  const usage = normalizer.normalizeNotification(
    asUpdate({ sessionUpdate: "usage_update", size: 262_144, used: 2048 })
  );
  assert.deepEqual(usage[0].data, {
    kind: "token_usage",
    tokenUsage: { limit: 262_144, used: 2048 },
  });

  normalizer.normalizeNotification(
    asUpdate({
      content: { text: "tail answer" },
      sessionUpdate: "agent_message_chunk",
    })
  );
  const turnEnd = normalizer.flushTurnEnd();
  assert.equal(turnEnd[0].content, "tail answer");

  // Runtime against a scripted fake `kimi acp` server: full native turn.
  const fakeCli = path.join(root, "fake-kimi-acp-session.mjs");
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
      '    params: { sessionId: "kimi-s-1", update: { sessionUpdate, ...extra } },',
      "  });",
      "};",
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { protocolVersion: 1 } });',
      "  }",
      '  if (message.method === "session/new") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { sessionId: "kimi-s-1" } });',
      "  }",
      '  if (message.method === "session/set_config_option") {',
      '    if (message.params.configId === "thinking") {',
      "      write({",
      '        error: { code: -32603, message: "Internal error" },',
      "        id: message.id,",
      '        jsonrpc: "2.0",',
      "      });",
      "    } else {",
      "      globalThis.selectedModel = message.params.value;",
      '      write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "    }",
      "  }",
      '  if (message.method === "session/prompt") {',
      '    update("agent_thought_chunk", { content: { text: "thinking about it" } });',
      '    update("agent_message_chunk", { content: { text: "Hello from" } });',
      '    update("agent_message_chunk", { content: { text: " native Kimi." } });',
      '    update("tool_call", { status: "in_progress", title: "Read", toolCallId: "c1" });',
      '    update("tool_call_update", { status: "completed", toolCallId: "c1" });',
      '    update("usage_update", { size: 262144, used: 4096 });',
      "    write({",
      "      id: message.id,",
      '      jsonrpc: "2.0",',
      '      result: { model: globalThis.selectedModel ?? null, stopReason: "end_turn" },',
      "    });",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );

  const events = [];
  const usageReads = [];
  const runtime = new KimiNativeSessionRuntime({
    model: "k3",
    onEvent: (event) => events.push(event),
    processOverrides: { command: process.execPath, commandArgs: [fakeCli] },
    usageReader: (acpSessionId) => {
      usageReads.push(acpSessionId);
      return { cached: 20_094, limit: 262_144, used: 20_235 };
    },
    workspacePath: root,
  });
  const acpSessionId = await runtime.open();
  assert.equal(acpSessionId, "kimi-s-1");
  assert.equal(runtime.isOpen, true);
  await runtime.prompt("hello");
  await runtime.cancelTurn();
  await runtime.close();
  assert.equal(runtime.isOpen, false);

  const types = events.map((event) =>
    event.type === "stream_event" ? `stream:${event.data.kind}` : event.type
  );
  assert.deepEqual(types, [
    "stream:kimi_thinking_unavailable",
    "turn_started",
    "dialog_message",
    "dialog_message",
    "stream:kimi_tool_call",
    "stream:kimi_tool_result",
    "stream:token_usage",
    "stream:token_usage",
    "turn_completed",
  ]);
  const thinkingDiagnostic = events.find(
    (event) =>
      event.type === "stream_event" &&
      event.data.kind === "kimi_thinking_unavailable"
  );
  assert.match(thinkingDiagnostic.data.message, /Internal error/u);
  assert.deepEqual(usageReads, ["kimi-s-1"]);
  const storeUsage = events.filter(
    (event) =>
      event.type === "stream_event" && event.data.kind === "token_usage"
  );
  assert.deepEqual(storeUsage.at(-1).data.tokenUsage, {
    cached: 20_094,
    limit: 262_144,
    used: 20_235,
  });
  const thinkingMessage = events.find(
    (event) => event.type === "dialog_message" && event.role === "thinking"
  );
  assert.equal(thinkingMessage.content, "thinking about it");
  const assistantMessage = events.find(
    (event) => event.type === "dialog_message" && event.role === "assistant"
  );
  assert.equal(assistantMessage.content, "Hello from native Kimi.");
  const completion = events.at(-1);
  assert.equal(completion.message, "end_turn");

  // Unexpected CLI death during a turn surfaces turn_failed + stream_error.
  const dyingCli = path.join(root, "fake-kimi-dying.mjs");
  await writeFile(
    dyingCli,
    [
      'import { createInterface } from "node:readline";',
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") {',
      "    process.stdout.write(",
      '      JSON.stringify({ id: message.id, jsonrpc: "2.0", result: {} }) + "\\n"',
      "    );",
      "  }",
      '  if (message.method === "session/new") {',
      "    process.stdout.write(",
      '      JSON.stringify({ id: message.id, jsonrpc: "2.0", result: { sessionId: "s-2" } }) + "\\n"',
      "    );",
      "  }",
      '  if (message.method === "session/prompt") {',
      "    process.exit(5);",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );
  const failureEvents = [];
  const failingRuntime = new KimiNativeSessionRuntime({
    onEvent: (event) => failureEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [dyingCli] },
    workspacePath: root,
  });
  await failingRuntime.prompt("boom");
  const failureTypes = failureEvents.map((event) => event.type);
  assert.ok(failureTypes.includes("turn_failed"));
  assert.ok(failureTypes.includes("stream_error"));
  await failingRuntime.close();

  // Live swarm polling: the swarm executes silently between the streamed
  // input and the terminal result; store-observed agents spawn as running
  // children before the swarm result closes them.
  const swarmCli = path.join(root, "fake-kimi-swarm.mjs");
  const swarmResultText =
    '<agent_swarm_result>\n<summary>completed: 1</summary>\n<subagent agent_id="agent-0" item="a.md" outcome="completed">done</subagent>\n</agent_swarm_result>';
  await writeFile(
    swarmCli,
    [
      'import { createInterface } from "node:readline";',
      "const write = (payload) => {",
      '  process.stdout.write(JSON.stringify(payload) + "\\n");',
      "};",
      "const update = (sessionUpdate, extra) => {",
      "  write({",
      '    jsonrpc: "2.0",',
      '    method: "session/update",',
      '    params: { sessionId: "kimi-s-3", update: { sessionUpdate, ...extra } },',
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
      '    write({ id: message.id, jsonrpc: "2.0", result: { sessionId: "kimi-s-3" } });',
      "  }",
      '  if (message.method === "session/set_config_option") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "  }",
      '  if (message.method === "session/prompt") {',
      '    update("tool_call", { status: "pending", title: "AgentSwarm", toolCallId: "sw1" });',
      '    update("tool_call_update", {',
      "      content: text(",
      "        JSON.stringify({",
      '          description: "Scan files",',
      '          items: ["a.md"],',
      '          subagent_type: "explore",',
      "        })",
      "      ),",
      '      status: "in_progress",',
      '      toolCallId: "sw1",',
      "    });",
      "    setTimeout(() => {",
      '      update("tool_call_update", {',
      `        content: text(${JSON.stringify(swarmResultText)}),`,
      '        status: "completed",',
      '        toolCallId: "sw1",',
      "      });",
      "      write({",
      "        id: message.id,",
      '        jsonrpc: "2.0",',
      '        result: { stopReason: "end_turn" },',
      "      });",
      "    }, 150);",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );
  const swarmEvents = [];
  const swarmRuntime = new KimiNativeSessionRuntime({
    onEvent: (event) => swarmEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [swarmCli] },
    providerSessionId: "kimi-native-parent-sw",
    swarmAgentReader: () => [{ agentId: "agent-0", prompt: "Scan a.md" }],
    swarmPollIntervalMs: 20,
    usageReader: () => null,
    workspacePath: root,
  });
  await swarmRuntime.prompt("run the swarm");
  await swarmRuntime.close();
  const liveSpawnIndex = swarmEvents.findIndex(
    (event) =>
      event.type === "subagent_control" &&
      event.receiverProviderSessionIds[0] === "kimi-agent-sw1:agent-0"
  );
  assert.ok(liveSpawnIndex >= 0);
  const rootTerminalIndex = swarmEvents.findIndex(
    (event) =>
      event.type === "subagent_status" &&
      event.providerSessionId === "kimi-agent-sw1"
  );
  assert.ok(liveSpawnIndex < rootTerminalIndex);
  const agentZeroStatuses = swarmEvents.filter(
    (event) =>
      event.type === "subagent_status" &&
      event.providerSessionId === "kimi-agent-sw1:agent-0"
  );
  assert.equal(agentZeroStatuses.at(-1).status, "completed");

  console.log("kimi native session runtime tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
