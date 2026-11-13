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
  // Core-served Kimi catalog stub (provider-descriptor): the models the
  // workspace home declares in the CLI config.
  writeFileSync(
    path.join(buildDir, "provider-descriptor-stub.js"),
    'export const providerDescriptorFacade = { getKimiClientModels: () => globalThis.__kimiTestCatalog ?? ["kimi-for-coding", "kimi-for-coding-highspeed", "k3"].map((id) => ({ defaultReasoningEffort: "high", id, label: id, reasoningEfforts: ["low", "high", "max"] })) };\n',
    "utf8"
  );
  await mkdir(normalizerContractDir, { recursive: true });
  writeFileSync(
    path.join(normalizerContractDir, "provider-event-normalizer-facade.js"),
    "export {};\n",
    "utf8"
  );
  const homeManagerSource = readFileSync(
    new URL(
      "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts",
      import.meta.url
    ),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "provider-home-manager-facade.js"),
    ts.transpileModule(homeManagerSource, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
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
      compiled
        .replaceAll(
          "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js",
          "../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js"
        )
        .replaceAll(
          "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js",
          "./provider-home-manager-facade.js"
        )
        .replaceAll(
          "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js",
          "./provider-descriptor-stub.js"
        )
        .replaceAll(
          "../../kimi-subagent-wire/src/kimi-subagent-wire-facade.js",
          "./kimi-subagent-wire-facade.js"
        ),
      "utf8"
    );
  }
  // The child channel reads through the sibling kimi-subagent-wire module;
  // its sources join the flat build from the neighboring module directory.
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
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      "utf8"
    );
  }
  const { KimiNativeSessionRuntime } = await import(
    pathToFileURL(path.join(buildDir, "kimi-native-session-runtime.js")).href
  );

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
      '    } else if (message.params.configId === "mode") {',
      '      write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "      write({",
      '        jsonrpc: "2.0",',
      '        method: "harness_test/mode",',
      "        params: { value: message.params.value },",
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

  // A fixture `~/.kimi-code` keeps the test independent from the developer's
  // real Kimi config. It uses the migrated CLI layout (2026-09-09): the
  // `[thinking]` section carries no effort, so the bootstrap must add one.
  const fixtureKimiConfigDir = path.join(root, "fixture-kimi-code");
  await mkdir(fixtureKimiConfigDir, { recursive: true });
  await writeFile(
    path.join(fixtureKimiConfigDir, "config.toml"),
    [
      '[models."kimi-code/kimi-for-coding"]',
      'provider = "managed:kimi-code"',
      'model = "kimi-for-coding"',
      "",
      "[thinking]",
      "enabled = true",
      "",
    ].join("\n"),
    "utf8"
  );
  const { prepareKimiWorkspaceHome } = await import(
    pathToFileURL(path.join(buildDir, "kimi-workspace-home.js")).href
  );
  const fixtureHomePreparer = (workspacePath, overrides) =>
    prepareKimiWorkspaceHome(workspacePath, {
      ...overrides,
      realKimiConfigDir: fixtureKimiConfigDir,
    });

  const events = [];
  const usageReads = [];
  const runtime = new KimiNativeSessionRuntime({
    homePreparer: fixtureHomePreparer,
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

  // The setup RPC echo can arrive before or after turn_started. Its
  // payload is asserted below; only actual turn events have a fixed order.
  const types = events
    .filter(
      (event) =>
        !(
          event.type === "stream_event" &&
          event.data.kind === "kimi_acp_notification" &&
          event.data.method === "harness_test/mode"
        )
    )
    .map((event) =>
      event.type === "stream_event" ? `stream:${event.data.kind}` : event.type
    );
  // No kimi_thinking_unavailable: the workspace-home config owns thinking,
  // so the ACP thinking=on request is deliberately not sent (it would
  // override the configured level with the CLI default).
  assert.deepEqual(types, [
    "turn_started",
    "dialog_message",
    "dialog_message",
    "stream:kimi_tool_call",
    "stream:kimi_tool_result",
    "stream:token_usage",
    "stream:token_usage",
    "turn_completed",
  ]);
  // The full-access mode request reached the CLI with the yolo value and
  // produced no refusal diagnostic.
  const modeEcho = events.find(
    (event) =>
      event.type === "stream_event" &&
      event.data.kind === "kimi_acp_notification" &&
      event.data.method === "harness_test/mode"
  );
  assert.equal(modeEcho.data.raw.value, "yolo");
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
    homePreparer: fixtureHomePreparer,
    onEvent: (event) => failureEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [dyingCli] },
    workspacePath: root,
  });
  await failingRuntime.prompt("boom");
  const failureTypes = failureEvents.map((event) => event.type);
  assert.ok(failureTypes.includes("turn_failed"));
  assert.ok(failureTypes.includes("stream_error"));
  await failingRuntime.close();

  // Full-access refusal and thinking-effort scenarios live in
  // kimi-native-session-thinking.test.mjs.

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
  // A session-store wire for the fake CLI's session id: the turn-end usage
  // must carry the session model's window from the merged catalog map.
  const swarmWireDir = path.join(
    root,
    ".harness",
    "runtime",
    "providers",
    "kimi",
    "home",
    ".kimi-code",
    "sessions",
    "wd_ctx",
    "kimi-s-3",
    "agents",
    "main"
  );
  await mkdir(swarmWireDir, { recursive: true });
  writeFileSync(
    path.join(swarmWireDir, "wire.jsonl"),
    '{"type":"usage.record","usage":{"inputOther":100,"output":20,"inputCacheRead":300,"inputCacheCreation":0}}\n',
    "utf8"
  );
  const swarmEvents = [];
  const swarmRuntime = new KimiNativeSessionRuntime({
    homePreparer: fixtureHomePreparer,
    model: "k3-test",
    modelContexts: { "k3-test": 777_000 },
    onEvent: (event) => swarmEvents.push(event),
    processOverrides: { command: process.execPath, commandArgs: [swarmCli] },
    providerSessionId: "kimi-native-parent-sw",
    swarmAgentReader: () => [{ agentId: "agent-0", prompt: "Scan a.md" }],
    swarmPollIntervalMs: 20,
    workspacePath: root,
  });
  await swarmRuntime.prompt("run the swarm");
  await swarmRuntime.close();
  const swarmUsageEvents = swarmEvents.filter(
    (event) =>
      event.type === "stream_event" && event.data.kind === "token_usage"
  );
  assert.deepEqual(swarmUsageEvents.at(-1).data.tokenUsage, {
    cached: 300,
    limit: 777_000,
    used: 420,
  });
  const liveSpawnIndex = swarmEvents.findIndex(
    (event) =>
      event.type === "subagent_control" &&
      event.receiverProviderSessionIds[0] === "kimi-agent-sw1:agent-0"
  );
  assert.ok(liveSpawnIndex >= 0);
  // Live polling registers the agent before the terminal swarm batch closes
  // it, and the swarm root child never materializes (the run registers
  // exactly its real agents).
  const agentZeroTerminalIndex = swarmEvents.findIndex(
    (event) =>
      event.type === "subagent_status" &&
      event.providerSessionId === "kimi-agent-sw1:agent-0"
  );
  assert.ok(agentZeroTerminalIndex >= 0);
  assert.ok(liveSpawnIndex < agentZeroTerminalIndex);
  assert.equal(
    swarmEvents.some(
      (event) =>
        event.providerSessionId === "kimi-agent-sw1" ||
        event.receiverProviderSessionIds?.[0] === "kimi-agent-sw1"
    ),
    false
  );
  const agentZeroStatuses = swarmEvents.filter(
    (event) =>
      event.type === "subagent_status" &&
      event.providerSessionId === "kimi-agent-sw1:agent-0"
  );
  assert.equal(agentZeroStatuses.at(-1).status, "completed");

  // The workspace provider home received the session mapping the deletion
  // path resolves the CLI store id from.
  const mapPath = path.join(
    root,
    ".harness",
    "runtime",
    "providers",
    "kimi",
    "home",
    ".kimi-code",
    "harness-session-map.json"
  );
  const sessionMap = JSON.parse(readFileSync(mapPath, "utf8"));
  assert.equal(sessionMap["kimi-native-parent-sw"], "kimi-s-3");

  console.log("kimi native session runtime tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
