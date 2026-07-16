import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

class FakeTransport {
  calls = [];
  notifications = [];
  startCount = 0;
  stopCount = 0;

  constructor(ProtocolError, rejectSnakeCase = true) {
    this.ProtocolError = ProtocolError;
    this.rejectSnakeCase = rejectSnakeCase;
  }

  start() {
    this.startCount += 1;
    return Promise.resolve();
  }

  stop() {
    this.stopCount += 1;
    return Promise.resolve();
  }

  notify(method, params) {
    this.notifications.push({ method, params });
    return Promise.resolve();
  }

  request(method, params) {
    this.calls.push({ method, params });
    if (method === "initialize") {
      return Promise.resolve({
        authMethods: [
          { id: "grok.com", name: "Grok.com" },
          { id: "cached_token", name: "Cached token" },
        ],
        protocolVersion: 1,
      });
    }
    if (method === "session/new") {
      return Promise.resolve({ sessionId: "provider-session-1" });
    }
    if (method === "session/set_model" && this.rejectSnakeCase) {
      return Promise.reject(
        new this.ProtocolError({ code: -32_601, message: "not found" })
      );
    }
    return Promise.resolve({});
  }
}

const root = await mkdtemp(path.join(tmpdir(), "grok-session-runtime-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of ["grok-acp-contracts.ts", "grok-session-runtime.ts"]) {
    const source = readFileSync(new URL(filename, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    writeFileSync(
      path.join(buildDir, filename.replace(/\.ts$/u, ".js")),
      compiled,
      "utf8"
    );
  }
  const { GrokAcpProtocolError } = await import(
    pathToFileURL(path.join(buildDir, "grok-acp-contracts.js")).href
  );
  const { GrokSessionRuntime } = await import(
    pathToFileURL(path.join(buildDir, "grok-session-runtime.js")).href
  );

  const transport = new FakeTransport(GrokAcpProtocolError);
  const runtime = new GrokSessionRuntime({
    clientVersion: "1.2.3",
    selection: { modelId: "grok-4.5", reasoningEffort: "low" },
    sessionMeta: { systemPromptOverride: "Harness system" },
    transport,
    workspacePath: "/workspace",
  });
  const created = await runtime.create();
  assert.equal(created.providerSessionId, "provider-session-1");
  assert.deepEqual(created.selection, {
    modelId: "grok-4.5",
    reasoningEffort: "low",
  });
  assert.equal(transport.calls[0].method, "initialize");
  assert.equal(transport.calls[1].method, "authenticate");
  assert.equal(transport.calls[1].params.methodId, "cached_token");
  assert.equal(transport.calls[2].method, "session/new");
  assert.equal(
    transport.calls[2].params._meta.systemPromptOverride,
    "Harness system"
  );
  assert.equal(transport.calls[3].method, "session/set_model");
  assert.equal(transport.calls[4].method, "session/setModel");
  assert.equal(transport.calls[4].params._meta.reasoningEffort, "low");

  await runtime.prompt("  hello Grok  ", {
    modelId: "grok-4.5",
    reasoningEffort: "high",
  });
  assert.equal(transport.calls.at(-3).method, "session/set_model");
  assert.equal(transport.calls.at(-2).method, "session/setModel");
  assert.deepEqual(transport.calls.at(-1).params.prompt, [
    { text: "hello Grok", type: "text" },
  ]);
  await runtime.cancel();
  assert.deepEqual(transport.notifications.at(-1), {
    method: "session/cancel",
    params: { sessionId: "provider-session-1" },
  });
  await assert.rejects(runtime.create(), /already has/u);
  await runtime.close();
  await runtime.close();
  assert.equal(transport.stopCount, 1);

  const loadTransport = new FakeTransport(GrokAcpProtocolError, false);
  const loadedRuntime = new GrokSessionRuntime({
    transport: loadTransport,
    workspacePath: "/workspace",
  });
  const loaded = await loadedRuntime.load("grok:existing-session");
  assert.equal(loaded.providerSessionId, "existing-session");
  assert.equal(
    loadTransport.calls.find((call) => call.method === "session/load").params
      .sessionId,
    "existing-session"
  );
  await loadedRuntime.close();

  const invalidRuntime = new GrokSessionRuntime({
    selection: { reasoningEffort: "high" },
    transport: new FakeTransport(GrokAcpProtocolError, false),
    workspacePath: "/workspace",
  });
  await assert.rejects(invalidRuntime.create(), /without a selected model/u);
  await invalidRuntime.close();

  console.log("grok-session-runtime tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
