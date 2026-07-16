import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// The facade's runtime dependencies (auth store, client core, tool registry,
// built-in tools) are replaced with in-test mocks before transpilation; type
// imports erase on their own. Mock behavior is steered via globalThis knobs.
const source = readFileSync(
  new URL("./kimi-client-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => globalThis.__kimiClientTestApiKey ?? null };\n"
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
      "  globalThis.__kimiClientTestTurns.push(params.request.messages.map((m) => m.role));",
      "  globalThis.__kimiClientTestModels.push(params.request.model);",
      '  params.onEvent({ kind: "turn_started" });',
      "  if (globalThis.__kimiClientTestFail) {",
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
  );

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "kimi-client-provider-"));

try {
  writeFileSync(
    path.join(buildDir, "kimi-client-provider-facade.js"),
    compiled,
    "utf8"
  );
  const {
    KIMI_DIALECT,
    KIMI_MODEL,
    KimiClientProviderFacade,
    buildKimiTurnRequest,
  } = await import(
    pathToFileURL(path.join(buildDir, "kimi-client-provider-facade.js")).href
  );

  // Kimi dialect points at the subscription coding endpoint with reasoning_content.
  assert.equal(KIMI_DIALECT.baseUrl, "https://api.kimi.com/coding/v1");
  assert.equal(KIMI_DIALECT.thinkingForm, "reasoning_content");
  assert.equal(KIMI_MODEL, "kimi-for-coding");

  // The request builder defaults the model and carries the dialect + key.
  const request = buildKimiTurnRequest({
    apiKey: "sk-test",
    messages: [{ content: "hi", role: "user" }],
    tools: [],
  });
  assert.equal(request.model, "kimi-for-coding");
  assert.equal(request.apiKey, "sk-test");
  assert.equal(request.dialect.providerId, "kimi");
  assert.equal(request.signal, undefined);

  // An explicit model overrides the default.
  assert.equal(
    buildKimiTurnRequest({
      apiKey: "k",
      messages: [],
      model: "kimi-custom",
      tools: [],
    }).model,
    "kimi-custom"
  );

  // --- ProviderAdapter behavior on the mocked loop ---
  globalThis.__kimiClientTestApiKey = "sk-live";
  globalThis.__kimiClientTestModels = [];
  globalThis.__kimiClientTestTurns = [];
  globalThis.__kimiClientTestFail = false;

  const adapter = new KimiClientProviderFacade("/ws");
  const sessionId = await adapter.createSession();
  assert.ok(sessionId.startsWith("kimi-client-"));

  const received = [];
  adapter.subscribe(sessionId, (event) => received.push(event));
  await adapter.sendMessage(sessionId, "hi", { model: "k3" });
  assert.deepEqual(
    received.map((event) => event.type),
    ["turn_started", "dialog_message", "turn_completed"]
  );
  assert.equal(received[1].content, "ok");
  assert.equal(globalThis.__kimiClientTestModels.at(-1), "k3");

  // The next turn carries the full session history (user, assistant, user).
  await adapter.sendMessage(sessionId, "again", {
    model: "kimi-for-coding-highspeed",
  });
  assert.deepEqual(globalThis.__kimiClientTestTurns, [
    ["user"],
    ["user", "assistant", "user"],
  ]);
  assert.equal(
    globalThis.__kimiClientTestModels.at(-1),
    "kimi-for-coding-highspeed"
  );

  // Stop keeps the history; resume-on-send continues the same session id.
  await adapter.closeSession(sessionId);
  await adapter.resumeSession(sessionId);
  await adapter.sendMessage(sessionId, "more");
  assert.equal(globalThis.__kimiClientTestModels.at(-1), "kimi-for-coding");
  assert.deepEqual(globalThis.__kimiClientTestTurns.at(-1), [
    "user",
    "assistant",
    "user",
    "assistant",
    "user",
  ]);

  // Removing the session drops the in-memory state entirely.
  adapter.deleteSessionArtifacts(sessionId);
  await assert.rejects(
    () => adapter.sendMessage(sessionId, "x"),
    /Unknown kimi-client session/u
  );

  // A missing subscription key fails the turn and surfaces a stream_error.
  globalThis.__kimiClientTestApiKey = null;
  const noKeySession = await adapter.createSession();
  const noKeyEvents = [];
  adapter.subscribe(noKeySession, (event) => noKeyEvents.push(event));
  await adapter.sendMessage(noKeySession, "hello");
  assert.deepEqual(
    noKeyEvents.map((event) => event.type),
    ["turn_failed", "stream_error"]
  );
  assert.match(noKeyEvents[1].message, /Kimi For Coding API key/u);

  // A failed loop turn also surfaces its message as a stream_error.
  globalThis.__kimiClientTestApiKey = "sk-live";
  globalThis.__kimiClientTestFail = true;
  const failSession = await adapter.createSession();
  const failEvents = [];
  adapter.subscribe(failSession, (event) => failEvents.push(event));
  await adapter.sendMessage(failSession, "boom?");
  assert.deepEqual(
    failEvents.map((event) => event.type),
    ["turn_started", "turn_failed", "stream_error"]
  );
  assert.equal(failEvents[2].message, "boom");

  console.log("kimi-client-provider tests passed");
} finally {
  globalThis.__kimiClientTestApiKey = undefined;
  globalThis.__kimiClientTestModels = undefined;
  globalThis.__kimiClientTestTurns = undefined;
  globalThis.__kimiClientTestFail = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
