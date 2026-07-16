import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

class FakeTransport {
  calls = [];
  lastSetModel = null;
  loadedSessionId = null;
  stopCount = 0;

  constructor(callbacks, sessionId) {
    this.callbacks = callbacks;
    this.sessionId = sessionId;
  }

  start() {
    return Promise.resolve();
  }

  stop() {
    this.stopCount += 1;
    this.callbacks.onExit({
      code: 0,
      expected: true,
      signal: null,
      stderr: "",
    });
    return Promise.resolve();
  }

  notify(method, params) {
    this.calls.push({ method, params });
    return Promise.resolve();
  }

  request(method, params) {
    this.calls.push({ method, params });
    if (method === "initialize") {
      return Promise.resolve({ authMethods: [{ id: "cached_token" }] });
    }
    if (method === "session/new") {
      this.sessionMeta = params._meta;
      return Promise.resolve({ sessionId: this.sessionId });
    }
    if (method === "session/load") {
      this.loadedSessionId = params.sessionId;
      this.sessionMeta = params._meta;
      return Promise.resolve({});
    }
    if (method === "session/set_model" || method === "session/setModel") {
      this.lastSetModel = params;
      return Promise.resolve({});
    }
    if (method === "_x.ai/session/info") {
      const profile = this.sessionMeta.agentProfile;
      return Promise.resolve({
        result: {
          agentName: profile.name,
          context: { toolDefinitionsCount: profile.tools.length + 2 },
        },
      });
    }
    if (method === "_x.ai/billing") {
      return Promise.resolve({
        result: {
          config: {
            currentPeriod: {
              end: "2026-07-20T00:00:00.000Z",
              start: "2026-07-13T00:00:00.000Z",
              type: "WEEKLY",
            },
          },
          subscriptionTier: "SuperGrok",
        },
      });
    }
    if (method === "_x.ai/rewind/points") {
      return Promise.resolve({
        result: {
          rewind_points: [0, 1, 2, 3].map((prompt_index) => ({ prompt_index })),
        },
      });
    }
    if (method === "_x.ai/rewind/execute") {
      return Promise.resolve({ result: { success: true } });
    }
    if (method === "session/prompt") {
      this.callbacks.onNotification({
        method: "session/update",
        params: {
          sessionId: params.sessionId,
          update: {
            content: { text: `reply:${params.sessionId}`, type: "text" },
            sessionUpdate: "agent_message_chunk",
          },
        },
      });
      return Promise.resolve({
        _meta: { cachedReadTokens: 10, totalTokens: 100 },
      });
    }
    return Promise.resolve({});
  }
}

const root = await mkdtemp(path.join(tmpdir(), "grok-provider-adapter-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  const filenames = [
    "grok-acp-contracts.ts",
    "grok-acp-router.ts",
    "grok-acp-process.ts",
    "grok-billing-client.ts",
    "grok-cli-locator.ts",
    "grok-event-normalizer.ts",
    "grok-interaction-bridge.ts",
    "grok-tool-inventory.ts",
    "grok-profile-application.ts",
    "grok-session-runtime.ts",
    "grok-session-event-router.ts",
    "grok-rewind-client.ts",
    "grok-subagent-normalizer.ts",
    "grok-provider-adapter.ts",
  ];
  for (const filename of filenames) {
    const source = readFileSync(
      new URL(filename, import.meta.url),
      "utf8"
    ).replace(
      'from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js"',
      'from "./provider-adapter-contract-facade.js"'
    );
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
  writeFileSync(
    path.join(buildDir, "provider-adapter-contract-facade.js"),
    "export {};\n",
    "utf8"
  );
  const { GrokProviderAdapter } = await import(
    pathToFileURL(path.join(buildDir, "grok-provider-adapter.js")).href
  );

  const transports = [];
  let nextSession = 0;
  const adapter = new GrokProviderAdapter({
    defaultModel: "grok-4.5",
    defaultReasoningEffort: "low",
    mcpServers: [{ name: "workspace-tools", transport: "stdio" }],
    processFactory: (callbacks) => {
      const transport = new FakeTransport(
        callbacks,
        `session-${++nextSession}`
      );
      transports.push(transport);
      return transport;
    },
    readinessProbe: () =>
      Promise.resolve({
        authStatus: "ready",
        binaryPath: "/fake/grok",
        message: "ready",
        status: "ready",
        version: "test",
      }),
  });
  await adapter.initialize();

  const native = await adapter.createSession("/workspace-a", {
    profileKind: "native",
  });
  const managed = await adapter.createSession("/workspace-b", {
    profile: {
      contentHash: "sha256:review",
      profileId: "review",
      profileName: "Review",
      prompt: "Review only",
      toolingCategories: { "file-read": true },
    },
    profileKind: "managed",
  });
  assert.equal(native.providerSessionId, "session-1");
  assert.equal(native.appliedProfileApplication.mode, "native");
  assert.equal(managed.providerSessionId, "session-2");
  assert.equal(managed.appliedProfileApplication.profileBindingVerified, true);
  assert.equal(transports.length, 2);
  assert.notEqual(transports[0], transports[1]);

  const nativeEvents = [];
  const managedEvents = [];
  adapter.subscribe("session-1", (event) => nativeEvents.push(event));
  adapter.subscribe("session-2", (event) => managedEvents.push(event));
  await Promise.all([
    adapter.sendMessage("session-1", "native prompt"),
    adapter.sendMessage("session-2", "managed prompt", {
      model: "grok-4.5",
      reasoningEffort: "high",
    }),
  ]);
  assert.deepEqual(
    nativeEvents.map((event) => event.type),
    ["turn_started", "assistant", "turn_completed"]
  );
  assert.deepEqual(
    managedEvents.map((event) => event.type),
    ["turn_started", "assistant", "turn_completed"]
  );
  assert.equal(nativeEvents[1].content, "reply:session-1");
  assert.equal(managedEvents[1].content, "reply:session-2");
  assert.equal(transports[1].lastSetModel._meta.reasoningEffort, "high");
  assert.deepEqual(
    transports[0].calls.find((call) => call.method === "session/new").params
      .mcpServers,
    [{ name: "workspace-tools", transport: "stdio" }]
  );
  const usageEvents = [];
  await adapter.refreshUsageLimits({
    broadcast: (event) => usageEvents.push(event),
    providerSessionId: "session-2",
    runtimeSessionId: "runtime-2",
    workspacePath: "/workspace-b",
  });
  assert.equal(usageEvents[0].usageLimitLabels.currentSession, "SuperGrok");
  assert.equal(
    usageEvents[0].usageLimits.currentWeekAllModels.percentUsed,
    null
  );
  assert.equal(
    usageEvents[0].usageLimits.currentWeekAllModels.resetsAt,
    "2026-07-20T00:00:00.000Z"
  );
  assert.deepEqual(await adapter.rollbackSessionTurns("session-2", 2), {
    providerSessionId: "session-2",
    turns: 2,
  });
  assert.equal(
    transports[1].calls.find((call) => call.method === "_x.ai/rewind/execute")
      .params.mode,
    "conversation_only"
  );

  transports[1].callbacks.onNotification({
    method: "x.ai/session_notification",
    params: {
      sessionId: "session-2",
      update: {
        child_session_id: "child-2",
        description: "Inspect the workspace",
        parent_session_id: "session-2",
        sessionUpdate: "subagent_spawned",
        subagent_id: "child-2",
        subagent_type: "explore",
      },
    },
  });
  assert.equal(
    await adapter.resumeSession("child-2", "/workspace-b"),
    "child-2"
  );
  assert.equal(transports.length, 2);
  const childEvents = [];
  adapter.subscribe("child-2", (event) => childEvents.push(event));
  transports[1].callbacks.onNotification({
    method: "session/update",
    params: {
      sessionId: "child-2",
      update: {
        content: { text: "child reply", type: "text" },
        sessionUpdate: "agent_message_chunk",
      },
    },
  });
  transports[1].callbacks.onNotification({
    method: "x.ai/session_notification",
    params: {
      sessionId: "session-2",
      update: {
        child_session_id: "child-2",
        sessionUpdate: "subagent_finished",
        status: "completed",
        subagent_id: "child-2",
      },
    },
  });
  assert.deepEqual(
    managedEvents.slice(-4).map((event) => event.type),
    [
      "turn_completed",
      "subagent_control",
      "subagent_session",
      "subagent_control",
    ]
  );
  assert.deepEqual(
    childEvents.map((event) => event.type),
    ["assistant", "subagent_status"]
  );
  assert.equal(childEvents[0].content, "child reply");

  const permission = transports[1].callbacks.onReverseRequest({
    id: "permission-1",
    method: "session/request_permission",
    params: {
      options: [{ name: "Allow", optionId: "allow-once" }],
      toolCall: { title: "Read file", toolCallId: "tool-1" },
    },
  });
  const permissionEvent = managedEvents.at(-1);
  assert.equal(permissionEvent.type, "provider_interaction_requested");
  await adapter.respondToInteraction("session-2", {
    interactionId: permissionEvent.interactionId,
    optionId: "allow-once",
    outcome: "selected",
  });
  assert.deepEqual(await permission, {
    outcome: { optionId: "allow-once", outcome: "selected" },
  });

  await adapter.closeSession("session-1");
  assert.equal(transports[0].stopCount, 1);
  assert.equal(transports[1].stopCount, 0);
  await assert.rejects(
    adapter.sendMessage("session-1", "after close"),
    /not bound/u
  );

  const resumed = await adapter.resumeSession(
    "grok:resumed-session",
    "/workspace-c",
    {
      profileKind: "native",
    }
  );
  assert.equal(resumed.providerSessionId, "resumed-session");
  assert.equal(transports[2].loadedSessionId, "resumed-session");

  await adapter.closeSession("session-2");
  await adapter.closeSession("resumed-session");
  assert.equal(
    transports.every((transport) => transport.stopCount === 1),
    true
  );

  console.log("grok-provider-adapter tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
