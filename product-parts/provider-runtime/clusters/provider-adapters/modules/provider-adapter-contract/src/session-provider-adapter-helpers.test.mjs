import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-provider-adapter-helpers.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { CliSessionProviderAdapter, OpenAiCompatibleSessionProviderAdapter } =
  await import(moduleUrl);

const adapter = new CliSessionProviderAdapter({
  args: () => ["-e", "console.log('assistant output')"],
  commands: [process.execPath],
});
const sessionId = await adapter.createSession();
const events = [];
adapter.subscribe(sessionId, (event) => events.push(event));
await adapter.sendMessage(sessionId, "user input");

assert.equal(
  events.some(
    (event) =>
      event?.type === "stream_event" &&
      event?.data?.kind === "token_usage" &&
      event?.data?.tokenUsage?.used > 0
  ),
  true
);

const tempCwd = mkdtempSync(join(tmpdir(), "harness-cli-cwd-"));
try {
  const cwdAdapter = new CliSessionProviderAdapter({
    args: () => ["-e", "console.log(process.cwd())"],
    commands: [process.execPath],
    cwd: () => tempCwd,
  });
  const cwdSessionId = await cwdAdapter.createSession();
  const cwdEvents = [];
  cwdAdapter.subscribe(cwdSessionId, (event) => cwdEvents.push(event));
  await cwdAdapter.sendMessage(cwdSessionId, "where");
  assert.equal(
    cwdEvents.some(
      (event) =>
        event?.type === "dialog_message" &&
        event.content === realpathSync(tempCwd)
    ),
    true
  );
} finally {
  rmSync(tempCwd, { force: true, recursive: true });
}

const kimiStreamAdapter = new CliSessionProviderAdapter({
  args: () => [
    "-e",
    [
      "console.log(JSON.stringify({role:'thinking',content:'visible thought'}));",
      "console.log(JSON.stringify({role:'assistant',content:'visible answer'}));",
    ].join(""),
  ],
  commands: [process.execPath],
  outputParser: "kimi-stream-json",
});
const kimiStreamSessionId = await kimiStreamAdapter.createSession();
const kimiStreamEvents = [];
kimiStreamAdapter.subscribe(kimiStreamSessionId, (event) =>
  kimiStreamEvents.push(event)
);
await kimiStreamAdapter.sendMessage(kimiStreamSessionId, "think");
assert.deepEqual(
  kimiStreamEvents
    .filter((event) => event?.type === "dialog_message")
    .map(({ content, tag }) => ({ content, tag })),
  [
    { content: "visible thought", tag: "thinking" },
    { content: "visible answer", tag: undefined },
  ]
);

const originalFetch = globalThis.fetch;
try {
  const requestBodies = [];
  globalThis.fetch = (_url, init) => {
    requestBodies.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "assistant answer",
              reasoning_content: "provider reasoning",
            },
          },
        ],
      }),
      { status: 200 }
    );
  };
  const openAiAdapter = new OpenAiCompatibleSessionProviderAdapter({
    baseUrl: "http://provider.test/v1",
    model: "reasoning-model",
  });
  const openAiSessionId = await openAiAdapter.createSession();
  const openAiEvents = [];
  openAiAdapter.subscribe(openAiSessionId, (event) => openAiEvents.push(event));
  await openAiAdapter.sendMessage(openAiSessionId, "think", {
    model: "turn-model",
    reasoningEffort: "high",
  });
  assert.equal(requestBodies[0].model, "turn-model");
  assert.equal(requestBodies[0].reasoning_effort, undefined);
  assert.equal(requestBodies[0].thinking, undefined);
  assert.deepEqual(
    openAiEvents
      .filter((event) => event?.type === "dialog_message")
      .map(({ content, tag }) => ({ content, tag })),
    [
      { content: "provider reasoning", tag: "thinking" },
      { content: "assistant answer", tag: undefined },
    ]
  );

  requestBodies.length = 0;
  globalThis.fetch = (_url, init) => {
    requestBodies.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "glm answer",
            },
          },
        ],
      }),
      { status: 200 }
    );
  };
  const glmAdapter = new OpenAiCompatibleSessionProviderAdapter({
    baseUrl: "http://provider.test/v1",
    model: "glm-default",
    providerId: "glm-native",
  });
  const glmSessionId = await glmAdapter.createSession();
  await glmAdapter.sendMessage(glmSessionId, "think", {
    model: "glm-5.2",
    reasoningEffort: "max",
    thinkingEnabled: true,
  });
  assert.deepEqual(
    {
      model: requestBodies[0].model,
      reasoning_effort: requestBodies[0].reasoning_effort,
      thinking: requestBodies[0].thinking,
    },
    {
      model: "glm-5.2",
      reasoning_effort: "max",
      thinking: { clear_thinking: false, type: "enabled" },
    }
  );
} finally {
  globalThis.fetch = originalFetch;
}
