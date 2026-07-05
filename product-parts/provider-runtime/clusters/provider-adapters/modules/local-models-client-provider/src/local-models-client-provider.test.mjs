import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./local-models-client-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => globalThis.__localClientTestApiKey ?? null, getBaseUrl: () => globalThis.__localClientTestBaseUrl ?? null };\n"
  )
  .replace(
    /import \{ settingsStoreFacade \}[^\n]*\n/u,
    "const settingsStoreFacade = { getSettings: () => ({ providers: { localModels: { baseUrl: globalThis.__localClientTestSettingsBaseUrl ?? 'http://127.0.0.1:1234', contextLengthByModel: globalThis.__localClientTestContextByModel ?? {}, defaultModel: globalThis.__localClientTestModel ?? 'qwen-coder' } } }) };\n"
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
      "  globalThis.__localClientTestTurns.push(params.request);",
      '  params.onEvent({ kind: "turn_started" });',
      "  if (globalThis.__localClientTestFail) {",
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
  .replace(
    /import \{ detectLocalModelsContextLength \}[^\n]*\n/u,
    "const detectLocalModelsContextLength = () => Promise.resolve(globalThis.__localClientTestWindow ?? null);\n"
  )
  .replace(
    /import \{\n\s*ensureLocalModelContext,\n\s*listLocalModelEntries,\n\} from[^\n]*\n/u,
    [
      "const ensureLocalModelContext = (input) => { globalThis.__localClientTestEnsures.push(input); return Promise.resolve(globalThis.__localClientTestApplied ?? null); };",
      "const listLocalModelEntries = () => Promise.resolve(globalThis.__localClientTestEntries ?? []);",
      "",
    ].join("\n")
  );

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const buildDir = await mkdtemp(
  path.join(tmpdir(), "local-models-client-provider-")
);

try {
  writeFileSync(
    path.join(buildDir, "local-models-client-provider-facade.js"),
    compiled,
    "utf8"
  );
  const {
    LocalModelsClientProviderFacade,
    buildLocalModelsDialect,
    buildLocalModelsTurnRequest,
    resolveLocalModelsV1BaseUrl,
  } = await import(
    pathToFileURL(path.join(buildDir, "local-models-client-provider-facade.js"))
      .href
  );

  // Base URL resolution: server root gains /v1, an existing /v1 stays, and
  // trailing slashes never double the path.
  assert.equal(
    resolveLocalModelsV1BaseUrl("http://127.0.0.1:1234"),
    "http://127.0.0.1:1234/v1"
  );
  assert.equal(
    resolveLocalModelsV1BaseUrl("http://127.0.0.1:11434/v1/"),
    "http://127.0.0.1:11434/v1"
  );
  assert.equal(resolveLocalModelsV1BaseUrl("   "), "");

  const dialect = buildLocalModelsDialect("http://127.0.0.1:1234/");
  assert.equal(dialect.baseUrl, "http://127.0.0.1:1234/v1");
  assert.equal(dialect.providerId, "local-models-client");
  assert.equal(dialect.thinkingForm, "reasoning_content");
  assert.equal(dialect.toolChoiceSupport, "unsupported");
  assert.equal(dialect.usageFromAnyChunk, false);
  assert.equal(dialect.extraHeaders, undefined);

  // The key is optional: absent means no apiKey field at all.
  const noKeyRequest = buildLocalModelsTurnRequest({
    baseUrl: "http://127.0.0.1:1234",
    messages: [{ content: "hi", role: "user" }],
    model: "qwen-coder",
    tools: [],
  });
  assert.equal(noKeyRequest.apiKey, undefined);
  const keyedRequest = buildLocalModelsTurnRequest({
    apiKey: "sk-local",
    baseUrl: "http://127.0.0.1:1234",
    messages: [{ content: "hi", role: "user" }],
    model: "qwen-coder",
    tools: [],
  });
  assert.equal(keyedRequest.apiKey, "sk-local");

  globalThis.__localClientTestApiKey = null;
  globalThis.__localClientTestApplied = null;
  globalThis.__localClientTestBaseUrl = null;
  globalThis.__localClientTestContextByModel = {};
  globalThis.__localClientTestEnsures = [];
  globalThis.__localClientTestEntries = [];
  globalThis.__localClientTestSettingsBaseUrl = "http://127.0.0.1:1234";
  globalThis.__localClientTestModel = "qwen-coder";
  globalThis.__localClientTestTurns = [];
  globalThis.__localClientTestFail = false;

  const adapter = new LocalModelsClientProviderFacade("/ws");
  const sessionId = await adapter.createSession();
  assert.ok(sessionId.startsWith("local-models-client-"));

  const received = [];
  adapter.subscribe(sessionId, (event) => received.push(event));
  await adapter.sendMessage(sessionId, "hi");
  assert.deepEqual(
    received.map((event) => event.type),
    ["turn_started", "dialog_message", "turn_completed"]
  );
  assert.equal(received[1].content, "ok");
  const firstTurn = globalThis.__localClientTestTurns[0];
  assert.equal(firstTurn.model, "qwen-coder");
  assert.equal(firstTurn.apiKey, undefined);
  assert.equal(firstTurn.dialect.baseUrl, "http://127.0.0.1:1234/v1");

  await adapter.sendMessage(sessionId, "again");
  assert.deepEqual(
    globalThis.__localClientTestTurns.map((turn) =>
      turn.messages.map((message) => message.role)
    ),
    [["user"], ["user", "assistant", "user"]]
  );

  // The auth-store base URL (settings file or env fallback) wins over the
  // merged snapshot; the optional key rides along when present.
  globalThis.__localClientTestBaseUrl = "http://192.168.0.5:8080";
  globalThis.__localClientTestApiKey = "sk-local";
  await adapter.sendMessage(sessionId, "routed");
  const routedTurn = globalThis.__localClientTestTurns.at(-1);
  assert.equal(routedTurn.dialect.baseUrl, "http://192.168.0.5:8080/v1");
  assert.equal(routedTurn.apiKey, "sk-local");

  adapter.deleteSessionArtifacts(sessionId);
  await assert.rejects(
    () => adapter.sendMessage(sessionId, "x"),
    /Unknown local-models-client session/u
  );

  // Missing base URL from every source fails the turn with the adapter
  // literal instead of firing a request.
  globalThis.__localClientTestApiKey = null;
  globalThis.__localClientTestBaseUrl = null;
  globalThis.__localClientTestSettingsBaseUrl = "   ";
  const noUrlSession = await adapter.createSession();
  const noUrlEvents = [];
  adapter.subscribe(noUrlSession, (event) => noUrlEvents.push(event));
  const turnsBefore = globalThis.__localClientTestTurns.length;
  await adapter.sendMessage(noUrlSession, "hello");
  assert.equal(globalThis.__localClientTestTurns.length, turnsBefore);
  assert.deepEqual(
    noUrlEvents.map((event) => event.type),
    ["turn_failed", "stream_error"]
  );
  assert.match(noUrlEvents[1].message, /base URL is missing/u);

  // A detected context window rides one "system" telemetry event per session
  // (tokenUsage.limit) ahead of the first turn, and never repeats. With no
  // per-model wish the management API is not asked to reload anything.
  globalThis.__localClientTestSettingsBaseUrl = "http://127.0.0.1:1234";
  globalThis.__localClientTestWindow = 8192;
  const windowSession = await adapter.createSession();
  const windowEvents = [];
  adapter.subscribe(windowSession, (event) => windowEvents.push(event));
  await adapter.sendMessage(windowSession, "hi");
  assert.deepEqual(
    windowEvents.map((event) => event.type),
    ["system", "turn_started", "dialog_message", "turn_completed"]
  );
  assert.deepEqual(windowEvents[0].data, {
    tokenUsage: { limit: 8192, used: 0 },
  });
  assert.equal(globalThis.__localClientTestEnsures.length, 0);
  await adapter.sendMessage(windowSession, "again");
  assert.equal(
    windowEvents.filter((event) => event.type === "system").length,
    1
  );
  globalThis.__localClientTestWindow = undefined;

  // A per-model wish is applied through the management API (reload
  // semantics) and its applied window becomes the telemetry limit.
  globalThis.__localClientTestContextByModel = { "qwen-coder": 32_768 };
  globalThis.__localClientTestApplied = 32_768;
  const wishSession = await adapter.createSession();
  const wishEvents = [];
  adapter.subscribe(wishSession, (event) => wishEvents.push(event));
  await adapter.sendMessage(wishSession, "hi");
  assert.equal(globalThis.__localClientTestEnsures.length, 1);
  assert.equal(globalThis.__localClientTestEnsures[0].model, "qwen-coder");
  assert.equal(
    globalThis.__localClientTestEnsures[0].desiredContextLength,
    32_768
  );
  assert.deepEqual(wishEvents[0].data, {
    tokenUsage: { limit: 32_768, used: 0 },
  });
  globalThis.__localClientTestContextByModel = {};
  globalThis.__localClientTestApplied = null;
  globalThis.__localClientTestEnsures = [];

  // Without a wish the loaded v1 instance window feeds the telemetry.
  globalThis.__localClientTestEntries = [
    {
      displayName: "Qwen Coder",
      key: "qwen-coder",
      loadedContextLength: 16_384,
      loadedInstanceId: "qwen-coder",
      maxContextLength: 262_144,
      supportsTools: true,
    },
  ];
  const loadedSession = await adapter.createSession();
  const loadedEvents = [];
  adapter.subscribe(loadedSession, (event) => loadedEvents.push(event));
  await adapter.sendMessage(loadedSession, "hi");
  assert.deepEqual(loadedEvents[0].data, {
    tokenUsage: { limit: 16_384, used: 0 },
  });
  globalThis.__localClientTestEntries = [];

  globalThis.__localClientTestFail = true;
  const failSession = await adapter.createSession();
  const failEvents = [];
  adapter.subscribe(failSession, (event) => failEvents.push(event));
  await adapter.sendMessage(failSession, "boom?");
  assert.deepEqual(
    failEvents.map((event) => event.type),
    ["turn_started", "turn_failed", "stream_error"]
  );
  assert.equal(failEvents[2].message, "boom");

  console.log("local-models-client-provider tests passed");
} finally {
  globalThis.__localClientTestApiKey = undefined;
  globalThis.__localClientTestApplied = undefined;
  globalThis.__localClientTestBaseUrl = undefined;
  globalThis.__localClientTestContextByModel = undefined;
  globalThis.__localClientTestEnsures = undefined;
  globalThis.__localClientTestEntries = undefined;
  globalThis.__localClientTestFail = undefined;
  globalThis.__localClientTestModel = undefined;
  globalThis.__localClientTestSettingsBaseUrl = undefined;
  globalThis.__localClientTestTurns = undefined;
  globalThis.__localClientTestWindow = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
