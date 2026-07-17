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
    'const createBuiltinToolSource = () => ({ execute: () => Promise.resolve({ output: "" }), list: () => ["read_file", "web_fetch", "echo"].map((name) => ({ description: name, name, parametersSchema: {}, qualifiedName: name, source: "builtin" })), source: "builtin" });\n'
  )
  .replace(
    /import \{\n\s*isKimiNativeSessionId,\n\s*isKimiNativeSubagentSessionId,\n\s*kimiNativeSessionDriver,\n\} from[^\n]*\n/u,
    [
      "const isKimiNativeSessionId = (sessionId) =>",
      '  sessionId.startsWith("kimi-native-");',
      "const isKimiNativeSubagentSessionId = (sessionId) =>",
      '  sessionId.startsWith("kimi-agent-");',
      "const kimiNativeSessionDriver = {",
      "  createSession: (options) => {",
      '    globalThis.__kimiNativeCalls.push(["create", options.workspacePath]);',
      '    return Promise.resolve("kimi-native-test-1");',
      "  },",
      "  deleteSession: (sessionId) => {",
      '    globalThis.__kimiNativeCalls.push(["delete", sessionId]);',
      "    return Promise.resolve();",
      "  },",
      "  respondToInteraction: (sessionId, decision) => {",
      '    globalThis.__kimiNativeCalls.push(["respond", sessionId, decision.outcome]);',
      "  },",
      "  resumeSession: (sessionId, options) => {",
      '    globalThis.__kimiNativeCalls.push(["resume", sessionId, options.workspacePath]);',
      "    return Promise.resolve(sessionId);",
      "  },",
      "  sendMessage: (sessionId, content, model) => {",
      '    globalThis.__kimiNativeCalls.push(["send", sessionId, content, model ?? null]);',
      "    return Promise.resolve();",
      "  },",
      "  stopSession: (sessionId) => {",
      '    globalThis.__kimiNativeCalls.push(["stop", sessionId]);',
      "    return Promise.resolve();",
      "  },",
      "  subscribe: (sessionId) => {",
      '    globalThis.__kimiNativeCalls.push(["subscribe", sessionId]);',
      "    return () => undefined;",
      "  },",
      "};",
      "",
    ].join("\n")
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
      "  globalThis.__kimiClientTestTools.push(params.request.tools.map((t) => t.name));",
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
  )
  .replace(
    /import \{ readKimiUsageLimitsEvent \}[^\n]*\n/u,
    "const readKimiUsageLimitsEvent = () => Promise.resolve(globalThis.__kimiLimitsTestEvent ?? null);\n"
  );

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const managedApplicationCompiled = ts.transpileModule(
  readFileSync(
    new URL("./kimi-managed-profile-application.ts", import.meta.url),
    "utf8"
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const buildDir = await mkdtemp(path.join(tmpdir(), "kimi-client-provider-"));

try {
  writeFileSync(
    path.join(buildDir, "kimi-client-provider-facade.js"),
    compiled,
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "kimi-managed-profile-application.js"),
    managedApplicationCompiled,
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
  globalThis.__kimiClientTestTools = [];
  globalThis.__kimiClientTestFail = false;
  globalThis.__kimiNativeCalls = [];

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

  // --- Profile-selective routing ---
  globalThis.__kimiClientTestFail = false;

  // Native profile sessions delegate every adapter surface to the ACP driver.
  const nativeSessionId = await adapter.createSession("/ws", {
    profileKind: "native",
  });
  assert.equal(nativeSessionId, "kimi-native-test-1");
  adapter.subscribe(nativeSessionId, () => undefined);
  await adapter.sendMessage(nativeSessionId, "go native", { model: "k3" });
  await adapter.closeSession(nativeSessionId);
  await adapter.respondToInteraction(nativeSessionId, {
    interactionId: "kimi-interaction:1",
    optionId: "allow",
    outcome: "selected",
  });
  await adapter.resumeSession(nativeSessionId, "/ws");
  await adapter.deleteSessionArtifacts(nativeSessionId);
  assert.deepEqual(globalThis.__kimiNativeCalls, [
    ["create", "/ws"],
    ["subscribe", "kimi-native-test-1"],
    ["send", "kimi-native-test-1", "go native", "k3"],
    ["stop", "kimi-native-test-1"],
    ["respond", "kimi-native-test-1", "selected"],
    ["resume", "kimi-native-test-1", "/ws"],
    ["delete", "kimi-native-test-1"],
  ]);

  // Managed profile sessions stay on the universal client and really apply
  // the materialized profile: leading system message + tool whitelist.
  const managedSession = await adapter.createSession("/ws", {
    profile: {
      contentHash: "hash-1",
      profileId: "custom-1",
      profileName: "Custom",
      prompt: "Act as the workspace butler.",
      toolingCategories: { "file-read": true, unknown: true, web: false },
    },
    profileKind: "managed",
  });
  assert.ok(managedSession.startsWith("kimi-client-"));
  await adapter.sendMessage(managedSession, "hello there");
  assert.deepEqual(globalThis.__kimiClientTestTurns.at(-1), ["system", "user"]);
  assert.deepEqual(globalThis.__kimiClientTestTools.at(-1), ["read_file"]);

  // The system message persists in history exactly once across turns.
  await adapter.sendMessage(managedSession, "and again");
  assert.deepEqual(globalThis.__kimiClientTestTurns.at(-1), [
    "system",
    "user",
    "assistant",
    "user",
  ]);

  // Sessions without a managed profile keep the full builtin inventory.
  assert.deepEqual(globalThis.__kimiClientTestTools[0], [
    "read_file",
    "web_fetch",
    "echo",
  ]);

  // Core adopts synthesized subagent children onto the parent's adapter:
  // every surface serves the synthetic `kimi-agent-*` id inertly instead of
  // throwing (the old unknown-session error killed the subagent-call
  // publication and the rest of the event batch).
  const childId = "kimi-agent-0:tool_x1";
  const inertUnsubscribe = adapter.subscribe(childId, () => undefined);
  assert.equal(typeof inertUnsubscribe, "function");
  inertUnsubscribe();
  assert.equal(await adapter.resumeSession(childId, "/ws"), childId);
  await adapter.closeSession(childId);
  await adapter.deleteSessionArtifacts(childId);
  await assert.rejects(() => adapter.sendMessage(childId, "hi"), /read-only/u);
  assert.ok(
    !globalThis.__kimiNativeCalls.some((call) =>
      String(call[1] ?? "").startsWith("kimi-agent-")
    )
  );

  // Usage limits broadcast to the top panel with the provider session id.
  globalThis.__kimiLimitsTestEvent = {
    providerScopeKey: "kimi:global",
    type: "usage_limits",
    usageLimits: { currentSession: { percentUsed: 24, resetsAt: null } },
  };
  const broadcasts = [];
  await adapter.refreshUsageLimits({
    broadcast: (event) => broadcasts.push(event),
    providerSessionId: "kimi-native-test-1",
    runtimeSessionId: "core-1",
    workspacePath: "/ws",
  });
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].type, "usage_limits");
  assert.equal(broadcasts[0].providerSessionId, "kimi-native-test-1");
  globalThis.__kimiLimitsTestEvent = null;
  await adapter.refreshUsageLimits({
    broadcast: (event) => broadcasts.push(event),
    providerSessionId: "kimi-native-test-1",
    runtimeSessionId: "core-1",
    workspacePath: "/ws",
  });
  assert.equal(broadcasts.length, 1);

  console.log("kimi-client-provider tests passed");
} finally {
  globalThis.__kimiClientTestApiKey = undefined;
  globalThis.__kimiClientTestModels = undefined;
  globalThis.__kimiClientTestTurns = undefined;
  globalThis.__kimiClientTestTools = undefined;
  globalThis.__kimiClientTestFail = undefined;
  globalThis.__kimiNativeCalls = undefined;
  globalThis.__kimiLimitsTestEvent = undefined;
  await rm(buildDir, { recursive: true, force: true });
}
