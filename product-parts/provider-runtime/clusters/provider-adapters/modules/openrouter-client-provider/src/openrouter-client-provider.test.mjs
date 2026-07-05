import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = readFileSync(
  new URL("./openrouter-client-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerAuthStoreFacade \}[^\n]*\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => globalThis.__orClientTestApiKey ?? null, getBaseUrl: () => globalThis.__orClientTestBaseUrl ?? null };\n"
  )
  .replace(
    /import \{ settingsStoreFacade \}[^\n]*\n/u,
    "const settingsStoreFacade = { getSettings: () => ({ providers: { openRouter: { apiKey: '', baseUrl: globalThis.__orClientTestSettingsBaseUrl ?? 'https://openrouter.ai/api/v1', defaultModel: globalThis.__orClientTestModel ?? 'openai/gpt-x', endpointTag: globalThis.__orClientTestEndpointTag ?? 'default' } } }) };\n"
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
      "  globalThis.__orClientTestTurns.push(params.request);",
      '  params.onEvent({ kind: "turn_started" });',
      "  if (globalThis.__orClientTestFail) {",
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

const buildDir = await mkdtemp(
  path.join(tmpdir(), "openrouter-client-provider-")
);

try {
  writeFileSync(
    path.join(buildDir, "openrouter-client-provider-facade.js"),
    compiled,
    "utf8"
  );
  const {
    OPENROUTER_DEFAULT_BASE_URL,
    OpenRouterClientProviderFacade,
    buildOpenRouterDialect,
    buildOpenRouterTurnRequest,
    resolveOpenRouterBaseUrl,
  } = await import(
    pathToFileURL(path.join(buildDir, "openrouter-client-provider-facade.js"))
      .href
  );

  // The Base URL field stays honest: stored values win, blanks fall back.
  assert.equal(resolveOpenRouterBaseUrl("   "), OPENROUTER_DEFAULT_BASE_URL);
  assert.equal(
    resolveOpenRouterBaseUrl("https://proxy.example/api/v1/"),
    "https://proxy.example/api/v1"
  );

  const dialect = buildOpenRouterDialect("");
  assert.equal(dialect.baseUrl, "https://openrouter.ai/api/v1");
  assert.equal(dialect.providerId, "openrouter-client");
  assert.equal(dialect.thinkingForm, "reasoning_details");
  assert.equal(dialect.toolChoiceSupport, "full");
  assert.equal(dialect.usageFromAnyChunk, true);
  assert.deepEqual(dialect.extraHeaders, {
    "HTTP-Referer": "https://harness-ai.app",
    "X-Title": "Harness AI",
  });

  // "default" keeps OpenRouter automatic routing (no extraBody); a concrete
  // endpoint tag routes via the reference wire form. No reasoning parameter.
  const autoRequest = buildOpenRouterTurnRequest({
    apiKey: "sk-or",
    baseUrl: "",
    endpointTag: "default",
    messages: [{ content: "hi", role: "user" }],
    model: "openai/gpt-x",
    tools: [],
  });
  assert.equal(autoRequest.extraBody, undefined);
  assert.equal("reasoning" in autoRequest, false);
  const routedRequest = buildOpenRouterTurnRequest({
    apiKey: "sk-or",
    baseUrl: "",
    endpointTag: "deepinfra/fp8",
    messages: [{ content: "hi", role: "user" }],
    model: "openai/gpt-x",
    tools: [],
  });
  assert.deepEqual(routedRequest.extraBody, {
    provider: { allow_fallbacks: false, order: ["deepinfra/fp8"] },
  });

  globalThis.__orClientTestApiKey = "sk-or-live";
  globalThis.__orClientTestBaseUrl = null;
  globalThis.__orClientTestSettingsBaseUrl = "https://openrouter.ai/api/v1";
  globalThis.__orClientTestModel = "anthropic/claude-x";
  globalThis.__orClientTestEndpointTag = "default";
  globalThis.__orClientTestTurns = [];
  globalThis.__orClientTestFail = false;

  const adapter = new OpenRouterClientProviderFacade("/ws");
  const sessionId = await adapter.createSession();
  assert.ok(sessionId.startsWith("openrouter-client-"));

  const received = [];
  adapter.subscribe(sessionId, (event) => received.push(event));
  await adapter.sendMessage(sessionId, "hi");
  assert.deepEqual(
    received.map((event) => event.type),
    ["turn_started", "dialog_message", "turn_completed"]
  );
  const firstTurn = globalThis.__orClientTestTurns[0];
  assert.equal(firstTurn.apiKey, "sk-or-live");
  assert.equal(firstTurn.model, "anthropic/claude-x");
  assert.equal(firstTurn.extraBody, undefined);

  // The Settings endpoint picker routes the NEXT turn through the selected
  // endpoint tag, and history keeps accumulating.
  globalThis.__orClientTestEndpointTag = "deepinfra/fp8";
  await adapter.sendMessage(sessionId, "again");
  const routedTurn = globalThis.__orClientTestTurns.at(-1);
  assert.deepEqual(routedTurn.extraBody, {
    provider: { allow_fallbacks: false, order: ["deepinfra/fp8"] },
  });
  assert.deepEqual(
    routedTurn.messages.map((message) => message.role),
    ["user", "assistant", "user"]
  );

  adapter.deleteSessionArtifacts(sessionId);
  await assert.rejects(
    () => adapter.sendMessage(sessionId, "x"),
    /Unknown openrouter-client session/u
  );

  // A missing key fails the turn with the adapter literal, firing no request.
  globalThis.__orClientTestApiKey = null;
  const noKeySession = await adapter.createSession();
  const noKeyEvents = [];
  adapter.subscribe(noKeySession, (event) => noKeyEvents.push(event));
  const turnsBefore = globalThis.__orClientTestTurns.length;
  await adapter.sendMessage(noKeySession, "hello");
  assert.equal(globalThis.__orClientTestTurns.length, turnsBefore);
  assert.deepEqual(
    noKeyEvents.map((event) => event.type),
    ["turn_failed", "stream_error"]
  );
  assert.match(noKeyEvents[1].message, /OpenRouter API key/u);

  globalThis.__orClientTestApiKey = "sk-or-live";
  globalThis.__orClientTestFail = true;
  const failSession = await adapter.createSession();
  const failEvents = [];
  adapter.subscribe(failSession, (event) => failEvents.push(event));
  await adapter.sendMessage(failSession, "boom?");
  assert.deepEqual(
    failEvents.map((event) => event.type),
    ["turn_started", "turn_failed", "stream_error"]
  );
  assert.equal(failEvents[2].message, "boom");

  console.log("openrouter-client-provider tests passed");
} finally {
  globalThis.__orClientTestApiKey = undefined;
  globalThis.__orClientTestBaseUrl = undefined;
  globalThis.__orClientTestEndpointTag = undefined;
  globalThis.__orClientTestFail = undefined;
  globalThis.__orClientTestModel = undefined;
  globalThis.__orClientTestSettingsBaseUrl = undefined;
  globalThis.__orClientTestTurns = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
