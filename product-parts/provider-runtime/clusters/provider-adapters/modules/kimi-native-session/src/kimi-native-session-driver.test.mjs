import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-native-driver-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  // Core-served Kimi catalog stub (provider-descriptor): the models the
  // workspace home declares in the CLI config.
  writeFileSync(
    path.join(buildDir, "provider-descriptor-stub.js"),
    'export const providerDescriptorFacade = { getKimiClientModels: () => globalThis.__kimiTestCatalog ?? ["kimi-for-coding", "kimi-for-coding-highspeed", "k3"].map((id) => ({ defaultReasoningEffort: "high", id, label: id, reasoningEfforts: ["low", "high", "max"] })) };\n',
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
    "kimi-interaction-bridge.ts",
    "kimi-native-session-facade.ts",
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
  const { KimiAcpProtocolError } = await import(
    pathToFileURL(path.join(buildDir, "kimi-acp-session-contracts.js")).href
  );
  const { KimiInteractionBridge } = await import(
    pathToFileURL(path.join(buildDir, "kimi-interaction-bridge.js")).href
  );
  const { isKimiNativeSessionId, KimiNativeSessionDriver } = await import(
    pathToFileURL(path.join(buildDir, "kimi-native-session-facade.js")).href
  );

  // Bridge: permission mapping, decisions, refusal of unknown methods,
  // timeout fallback.
  const emitted = [];
  const bridge = new KimiInteractionBridge({
    emit: (event) => emitted.push(event),
    timeoutMs: 120,
  });
  await assert.rejects(
    bridge.handle({ id: 1, method: "kimi/unknown" }),
    KimiAcpProtocolError
  );
  const pendingPermission = bridge.handle({
    id: 2,
    method: "session/request_permission",
    params: {
      options: [
        { kind: "allow_once", name: "Allow", optionId: "allow" },
        { kind: "reject_once", name: "Reject", optionId: "reject" },
      ],
      toolCall: { title: "Write file", toolCallId: "call-9" },
    },
  });
  const requested = emitted[0];
  assert.equal(requested.type, "provider_interaction_requested");
  assert.equal(requested.kind, "permission");
  assert.equal(requested.provider, "kimi");
  assert.equal(requested.message, "Write file");
  assert.equal(requested.toolCallId, "call-9");
  assert.deepEqual(
    requested.options.map((option) => option.id),
    ["allow", "reject"]
  );
  bridge.respond({
    interactionId: requested.interactionId,
    optionId: "allow",
    outcome: "selected",
  });
  assert.deepEqual(await pendingPermission, {
    outcome: { optionId: "allow", outcome: "selected" },
  });
  assert.equal(emitted[1].type, "provider_interaction_resolved");
  assert.equal(emitted[1].reason, "submitted");

  const timingOut = bridge.handle({
    id: 3,
    method: "session/request_permission",
    params: {},
  });
  assert.deepEqual(await timingOut, { outcome: { outcome: "cancelled" } });
  assert.equal(emitted.at(-1).reason, "timed_out");
  assert.equal(bridge.pendingCount, 0);

  // Driver: full native turn with a CLI-initiated permission round-trip.
  const fakeCli = path.join(root, "fake-kimi-permission.mjs");
  await writeFile(
    fakeCli,
    [
      'import { createInterface } from "node:readline";',
      "const write = (payload) => {",
      '  process.stdout.write(JSON.stringify(payload) + "\\n");',
      "};",
      "let promptId = null;",
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      "  if (message.id === 900 && message.method === undefined) {",
      "    const outcome = message.result?.outcome;",
      '    const text = outcome?.outcome === "selected" ? "permission honored." : "permission denied.";',
      "    write({",
      '      jsonrpc: "2.0",',
      '      method: "session/update",',
      "      params: {",
      '        sessionId: "kimi-s-perm",',
      '        update: { content: { text }, sessionUpdate: "agent_message_chunk" },',
      "      },",
      "    });",
      '    write({ id: promptId, jsonrpc: "2.0", result: { stopReason: "end_turn" } });',
      "    return;",
      "  }",
      '  if (message.method === "initialize") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { protocolVersion: 1 } });',
      "  }",
      '  if (message.method === "session/new") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: { sessionId: "kimi-s-perm" } });',
      "  }",
      '  if (message.method === "session/set_config_option") {',
      '    write({ id: message.id, jsonrpc: "2.0", result: {} });',
      "  }",
      '  if (message.method === "session/prompt") {',
      "    promptId = message.id;",
      "    write({",
      "      id: 900,",
      '      jsonrpc: "2.0",',
      '      method: "session/request_permission",',
      "      params: {",
      '        options: [{ kind: "allow_once", name: "Allow", optionId: "allow" }],',
      '        sessionId: "kimi-s-perm",',
      '        toolCall: { title: "Write file", toolCallId: "call-1" },',
      "      },",
      "    });",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );

  const driver = new KimiNativeSessionDriver({
    processOverrides: { command: process.execPath, commandArgs: [fakeCli] },
  });
  const sessionId = await driver.createSession({
    model: "k3",
    workspacePath: root,
  });
  assert.ok(isKimiNativeSessionId(sessionId));
  const events = [];
  // A throwing listener must not break delivery to the others (listener
  // isolation: one Core-side consumer failure used to silence the session).
  driver.subscribe(sessionId, () => {
    throw new Error("listener boom");
  });
  driver.subscribe(sessionId, (event) => {
    events.push(event);
    if (event.type === "provider_interaction_requested") {
      driver.respondToInteraction(sessionId, {
        interactionId: event.interactionId,
        optionId: "allow",
        outcome: "selected",
      });
    }
  });
  await driver.sendMessage(sessionId, "write the file");
  const types = events.map((event) => event.type);
  assert.deepEqual(types, [
    "turn_started",
    "provider_interaction_requested",
    "provider_interaction_resolved",
    "dialog_message",
    "turn_completed",
  ]);
  const answer = events.find((event) => event.type === "dialog_message");
  assert.equal(answer.content, "permission honored.");

  const resumedId = await driver.resumeSession(sessionId, {
    workspacePath: root,
  });
  assert.equal(resumedId, sessionId);
  await driver.stopSession(sessionId);
  await driver.deleteSession(sessionId);
  await assert.rejects(
    driver.sendMessage(sessionId, "again"),
    /Unknown Kimi native session/u
  );

  console.log("kimi native session driver tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
