import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./glm-client-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ workspaceContextSystemMessages \}[^\n]*\n/u,
    'const workspaceContextSystemMessages = (options) => { const context = options?.workspaceContext?.trim(); return context ? [{ content: context, role: "system" }] : []; };\n'
  )
  .replace(
    /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => globalThis.__glmClientTestApiKey ?? null };\n"
  )
  .replace(
    /import \{ settingsStoreFacade \}[^\n]*\n/u,
    "const settingsStoreFacade = { getSettings: () => ({ providers: { glmClient: { defaultModel: globalThis.__glmClientTestModel ?? 'glm-5.2', reasoningEffort: globalThis.__glmClientTestReasoning ?? 'max' } } }) };\n"
  )
  .replace(
    /import \{ createBuiltinToolSource \}[^\n]*\n/u,
    'const createBuiltinToolSource = () => ({ execute: () => Promise.resolve({ output: "" }), list: () => [{ description: "echo", name: "echo", parametersSchema: {}, qualifiedName: "echo", source: "builtin" }], source: "builtin" });\n'
  )
  .replace(
    /import \{\n\s*mapClientTurnEvent,\n\s*runClientTurn,\n\} from[^\n]*\n/u,
    [
      "const mapClientTurnEvent = (event) => {",
      '  if (event.kind === "turn_started") { return { timestamp: "t", type: "turn_started", uuid: "u" }; }',
      '  if (event.kind === "assistant_delta") { return { content: event.text, role: "assistant", tag: "live", timestamp: "t", type: "dialog_message", uuid: "u" }; }',
      '  if (event.kind === "turn_completed") { return { timestamp: "t", type: "turn_completed", uuid: "u" }; }',
      '  if (event.kind === "turn_failed") { return { timestamp: "t", type: "turn_failed", uuid: "u" }; }',
      "  return null;",
      "};",
      "const runClientTurn = (params) => {",
      "  globalThis.__glmClientTestTurns.push(params.request);",
      '  params.onEvent({ kind: "turn_started" });',
      "  if (globalThis.__glmClientTestFail) {",
      '    params.onEvent({ error: "provider_error", kind: "turn_failed", text: "boom" });',
      "    return Promise.resolve(params.request.messages);",
      "  }",
      '  params.onEvent({ kind: "assistant_delta", text: "ok" });',
      '  params.onEvent({ kind: "turn_completed" });',
      '  return Promise.resolve([...params.request.messages, { content: "ok", role: "assistant" }]);',
      "};",
      "",
    ].join("\n")
  )
  .replace(
    /import \{\n\s*createToolRegistry,\n\s*type ToolRegistry,\n\} from[^\n]*\n/u,
    'const createToolRegistry = () => { const sources = []; return { execute: () => Promise.resolve({ output: "" }), listDescriptors: () => sources.flatMap((s) => s.list()), registerSource: (s) => sources.push(s) }; };\n'
  )
  .replace(/import type \{ ReasoningEffort \}[^\n]*\n/u, "");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "glm-client-provider-"));

try {
  writeFileSync(
    path.join(buildDir, "glm-client-provider-facade.js"),
    compiled,
    "utf8"
  );
  const {
    GLM_DEFAULT_MODEL,
    GLM_DIALECT,
    GlmClientProviderFacade,
    buildGlmTurnRequest,
  } = await import(
    pathToFileURL(path.join(buildDir, "glm-client-provider-facade.js")).href
  );

  assert.equal(GLM_DIALECT.baseUrl, "https://api.z.ai/api/coding/paas/v4");
  assert.deepEqual(GLM_DIALECT.extraHeaders, { "Accept-Language": "en-US,en" });
  assert.equal(GLM_DIALECT.thinkingForm, "reasoning_content");
  assert.equal(GLM_DEFAULT_MODEL, "glm-5.2");

  const request = buildGlmTurnRequest({
    apiKey: "sk-test",
    messages: [{ content: "hi", role: "user" }],
    model: "glm-5.1",
    reasoningEffort: "high",
    tools: [],
  });
  assert.equal(request.model, "glm-5.1");
  assert.equal(request.apiKey, "sk-test");
  assert.equal(request.dialect.providerId, "glm-client");
  assert.deepEqual(request.extraBody, {
    reasoning_effort: "high",
    thinking: { type: "enabled" },
    tool_stream: true,
  });

  globalThis.__glmClientTestApiKey = "sk-live";
  globalThis.__glmClientTestModel = "glm-4.7";
  globalThis.__glmClientTestReasoning = "max";
  globalThis.__glmClientTestTurns = [];
  globalThis.__glmClientTestFail = false;

  const adapter = new GlmClientProviderFacade("/ws");

  // Workflow Kit context opens a new history as its system message.
  const contextSession = await adapter.createSession("/ws", {
    workspaceContext: "# Workflow\nT1",
  });
  await adapter.sendMessage(contextSession, "go");
  const contextTurn = globalThis.__glmClientTestTurns.at(-1);
  assert.deepEqual(contextTurn.messages[0], {
    content: "# Workflow\nT1",
    role: "system",
  });
  assert.equal(contextTurn.messages[1].role, "user");
  globalThis.__glmClientTestTurns.length = 0;
  const sessionId = await adapter.createSession();
  assert.ok(sessionId.startsWith("glm-client-"));

  const received = [];
  adapter.subscribe(sessionId, (event) => received.push(event));
  await adapter.sendMessage(sessionId, "hi");
  assert.deepEqual(
    received.map((event) => event.type),
    ["turn_started", "dialog_message", "turn_completed"]
  );
  assert.equal(received[1].content, "ok");
  assert.equal(globalThis.__glmClientTestTurns[0].model, "glm-4.7");
  assert.equal(
    globalThis.__glmClientTestTurns[0].extraBody.reasoning_effort,
    "max"
  );

  await adapter.sendMessage(sessionId, "again");
  assert.deepEqual(
    globalThis.__glmClientTestTurns.map((turn) =>
      turn.messages.map((message) => message.role)
    ),
    [["user"], ["user", "assistant", "user"]]
  );

  await adapter.closeSession(sessionId);
  await adapter.resumeSession(sessionId);
  await adapter.sendMessage(sessionId, "more");
  assert.deepEqual(
    globalThis.__glmClientTestTurns
      .at(-1)
      .messages.map((message) => message.role),
    ["user", "assistant", "user", "assistant", "user"]
  );

  adapter.deleteSessionArtifacts(sessionId);
  await assert.rejects(
    () => adapter.sendMessage(sessionId, "x"),
    /Unknown glm-client session/u
  );

  globalThis.__glmClientTestApiKey = null;
  const noKeySession = await adapter.createSession();
  const noKeyEvents = [];
  adapter.subscribe(noKeySession, (event) => noKeyEvents.push(event));
  await adapter.sendMessage(noKeySession, "hello");
  assert.deepEqual(
    noKeyEvents.map((event) => event.type),
    ["turn_failed", "stream_error"]
  );
  assert.match(noKeyEvents[1].message, /Z\.ai Coding Plan API key/u);

  globalThis.__glmClientTestApiKey = "sk-live";
  globalThis.__glmClientTestFail = true;
  const failSession = await adapter.createSession();
  const failEvents = [];
  adapter.subscribe(failSession, (event) => failEvents.push(event));
  await adapter.sendMessage(failSession, "boom?");
  assert.deepEqual(
    failEvents.map((event) => event.type),
    ["turn_started", "turn_failed", "stream_error"]
  );
  assert.equal(failEvents[2].message, "boom");

  console.log("glm-client-provider tests passed");
} finally {
  globalThis.__glmClientTestApiKey = undefined;
  globalThis.__glmClientTestFail = undefined;
  globalThis.__glmClientTestModel = undefined;
  globalThis.__glmClientTestReasoning = undefined;
  globalThis.__glmClientTestTurns = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
