import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file, url) {
  return ts.transpileModule(readFileSync(new URL(file, url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "client-core-"));
const realFetch = globalThis.fetch;

function sseResponse(frames) {
  return {
    body: (function* () {
      const encoder = new TextEncoder();
      for (const frame of frames) {
        yield encoder.encode(frame);
      }
    })(),
    headers: { get: () => null },
    ok: true,
    status: 200,
  };
}

try {
  await mkdir(path.join(buildDir, "client-core/src"), { recursive: true });
  await mkdir(path.join(buildDir, "dialect-streaming/src"), {
    recursive: true,
  });
  writeFileSync(
    path.join(buildDir, "dialect-streaming/src/dialect-streaming-facade.js"),
    compile(
      "../../dialect-streaming/src/dialect-streaming-facade.ts",
      import.meta.url
    ),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "client-core/src/client-core-http.js"),
    compile("./client-core-http.ts", import.meta.url),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "client-core/src/client-core-events.js"),
    compile("./client-core-events.ts", import.meta.url),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "client-core/src/client-core-facade.js"),
    compile("./client-core-facade.ts", import.meta.url),
    "utf8"
  );
  const { runClientTurn } = await import(
    pathToFileURL(path.join(buildDir, "client-core/src/client-core-facade.js"))
      .href
  );

  // Turn 1: the model asks for a tool. Turn 2: it answers with content.
  let modelCall = 0;
  const requestBodies = [];
  globalThis.fetch = (_url, init) => {
    modelCall += 1;
    requestBodies.push(JSON.parse(init.body));
    const frames =
      modelCall === 1
        ? [
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"echo","arguments":"{}"}}]}}]}\n\n',
            "data: [DONE]\n\n",
          ]
        : [
            'data: {"choices":[{"delta":{"content":"done"}}]}\n\n',
            "data: [DONE]\n\n",
          ];
    return Promise.resolve(sseResponse(frames));
  };

  let executed = 0;
  const registry = {
    execute(name, args) {
      executed += 1;
      return Promise.resolve({ output: `echoed ${name}(${args})` });
    },
    listDescriptors: () => [],
    registerSource: () => undefined,
  };

  const events = [];
  const finalHistory = await runClientTurn({
    onEvent: (event) => events.push(event),
    registry,
    request: {
      dialect: {
        baseUrl: "https://api.example.com",
        providerId: "test",
        thinkingForm: "reasoning_content",
        toolChoiceSupport: "auto_only",
        usageFromAnyChunk: false,
      },
      extraBody: {
        messages: [{ content: "malicious override", role: "system" }],
        model: "malicious-model",
        parallel_tool_calls: false,
        reasoning_effort: "high",
        stream: false,
        stream_options: { include_usage: false },
        thinking: { type: "enabled" },
        tool_choice: "none",
        tool_stream: true,
        tools: [],
      },
      messages: [{ content: "hi", role: "user" }],
      model: "test-model",
      tools: [
        {
          description: "echo",
          name: "echo",
          parametersSchema: {},
          qualifiedName: "echo",
          source: "builtin",
        },
      ],
    },
    workspacePath: "/ws",
  });

  const kinds = events.map((e) => e.kind);
  // The loop ran two model calls (tool then answer) and executed the tool once.
  assert.equal(modelCall, 2);
  assert.equal(executed, 1);
  assert.equal(requestBodies[0].model, "test-model");
  assert.equal(requestBodies[0].messages[0].content, "hi");
  assert.equal(requestBodies[0].stream, true);
  assert.deepEqual(requestBodies[0].stream_options, { include_usage: true });
  assert.equal(requestBodies[0].tool_choice, "auto");
  assert.equal(requestBodies[0].tools.length, 1);
  assert.equal(requestBodies[0].reasoning_effort, "high");
  assert.deepEqual(requestBodies[0].thinking, { type: "enabled" });
  assert.equal(requestBodies[0].tool_stream, true);
  assert.equal("parallel_tool_calls" in requestBodies[0], false);
  assert.equal(kinds[0], "turn_started");
  assert.ok(kinds.includes("assistant_delta"));
  assert.equal(kinds.at(-1), "turn_completed");
  assert.equal(events.find((e) => e.kind === "assistant_delta").text, "done");

  // The loop resolves with the full in-turn history: user, assistant tool
  // call, tool result, final assistant answer.
  assert.deepEqual(
    finalHistory.map((message) => message.role),
    ["user", "assistant", "tool", "assistant"]
  );
  assert.equal(finalHistory[1].toolCalls.length, 1);
  assert.equal(finalHistory[2].toolCallId, "c1");
  assert.equal(finalHistory.at(-1).content, "done");

  // reasoning_details dialect: blocks accumulate onto the assistant message
  // and return UNCHANGED in the follow-up request history; reasoning_content
  // dialects never write the wire field.
  let orCall = 0;
  const orBodies = [];
  globalThis.fetch = (_url, init) => {
    orCall += 1;
    orBodies.push(JSON.parse(init.body));
    const frames =
      orCall === 1
        ? [
            'data: {"choices":[{"delta":{"reasoning":"th","reasoning_details":[{"type":"reasoning.text","text":"th","index":0}]}}]}\n\n',
            'data: {"choices":[{"delta":{"reasoning_details":[{"type":"reasoning.text","text":"ink","index":0}],"tool_calls":[{"index":0,"id":"r1","function":{"name":"echo","arguments":"{}"}}]}}]}\n\n',
            "data: [DONE]\n\n",
          ]
        : [
            'data: {"choices":[{"delta":{"content":"or done"}}]}\n\n',
            "data: [DONE]\n\n",
          ];
    return Promise.resolve(sseResponse(frames));
  };
  const orHistory = await runClientTurn({
    onEvent: () => undefined,
    registry,
    request: {
      dialect: {
        baseUrl: "https://openrouter.ai/api/v1",
        providerId: "openrouter-client",
        thinkingForm: "reasoning_details",
        toolChoiceSupport: "full",
        usageFromAnyChunk: true,
      },
      messages: [{ content: "hi", role: "user" }],
      model: "openai/gpt-x",
      tools: [
        {
          description: "echo",
          name: "echo",
          parametersSchema: {},
          qualifiedName: "echo",
          source: "builtin",
        },
      ],
    },
    workspacePath: "/ws",
  });
  assert.deepEqual(orHistory[1].reasoningDetails, [
    { index: 0, text: "think", type: "reasoning.text" },
  ]);
  const followUpAssistant = orBodies[1].messages.find(
    (message) => message.role === "assistant"
  );
  assert.deepEqual(followUpAssistant.reasoning_details, [
    { index: 0, text: "think", type: "reasoning.text" },
  ]);
  assert.equal(
    requestBodies[1].messages.some((message) => "reasoning_details" in message),
    false
  );
  assert.equal(orHistory.at(-1).content, "or done");

  console.log("client-core tests passed");
} finally {
  globalThis.fetch = realFetch;
  await rm(buildDir, { recursive: true, force: true });
}
