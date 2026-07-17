import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "kimi-acp-transport-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "kimi-acp-session-contracts.ts",
    "kimi-acp-session-router.ts",
    "kimi-acp-session-process.ts",
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
      compiled,
      "utf8"
    );
  }
  const contracts = await import(
    pathToFileURL(path.join(buildDir, "kimi-acp-session-contracts.js")).href
  );
  const { KimiAcpSessionRouter } = await import(
    pathToFileURL(path.join(buildDir, "kimi-acp-session-router.js")).href
  );
  const { KimiAcpSessionProcess, resolveKimiSessionCommand } = await import(
    pathToFileURL(path.join(buildDir, "kimi-acp-session-process.js")).href
  );

  assert.match(resolveKimiSessionCommand(), /kimi$/u);

  // Router: correlation with numeric ids, wire errors, notifications,
  // reverse requests, timeout, abort and reject-all.
  const sent = [];
  const notifications = [];
  const protocolErrors = [];
  const router = new KimiAcpSessionRouter({
    onNotification: (notification) => notifications.push(notification),
    onProtocolError: (error) => protocolErrors.push(error.message),
    onReverseRequest: (request) => {
      if (request.method === "session/request_permission") {
        return { outcome: { optionId: "allow", outcome: "selected" } };
      }
      throw new Error("unexpected reverse request");
    },
    requestTimeoutMs: 200,
    sendLine: (line) => {
      sent.push(JSON.parse(line));
    },
  });

  const creating = router.request("session/new", { cwd: "/workspace" });
  assert.equal(sent[0].method, "session/new");
  assert.equal(typeof sent[0].id, "number");
  router.handleLine(
    JSON.stringify({
      id: sent[0].id,
      jsonrpc: "2.0",
      result: { sessionId: "s-1" },
    })
  );
  assert.deepEqual(await creating, { sessionId: "s-1" });

  const failing = router.request("session/prompt", {});
  router.handleLine(
    JSON.stringify({
      error: { code: -32_000, message: "boom" },
      id: sent[1].id,
      jsonrpc: "2.0",
    })
  );
  await assert.rejects(failing, contracts.KimiAcpProtocolError);

  router.handleLine(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionUpdate: "agent_message_chunk" },
    })
  );
  assert.equal(notifications[0].method, "session/update");

  router.handleLine(
    JSON.stringify({
      id: "reverse-1",
      jsonrpc: "2.0",
      method: "session/request_permission",
      params: { options: [] },
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  const reverseReply = sent.find((message) => message.id === "reverse-1");
  assert.deepEqual(reverseReply.result, {
    outcome: { optionId: "allow", outcome: "selected" },
  });

  router.handleLine(
    JSON.stringify({
      id: "reverse-2",
      jsonrpc: "2.0",
      method: "kimi/unknown_reverse",
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  const rejectedReverse = sent.find((message) => message.id === "reverse-2");
  assert.equal(rejectedReverse.error.code, -32_603);

  await assert.rejects(
    router.request("session/prompt", {}, { timeoutMs: 30 }),
    contracts.KimiAcpRequestTimeoutError
  );

  const abortController = new AbortController();
  const aborting = router.request(
    "session/prompt",
    {},
    { signal: abortController.signal }
  );
  abortController.abort();
  await assert.rejects(aborting, /aborted/u);

  const hanging = router.request("session/prompt", {});
  router.rejectAll(new contracts.KimiAcpChannelClosedError("test close"));
  await assert.rejects(hanging, contracts.KimiAcpChannelClosedError);
  assert.equal(router.pendingRequestCount, 0);

  router.handleLine(JSON.stringify({ id: 9999, jsonrpc: "2.0", result: {} }));
  assert.ok(protocolErrors.some((message) => message.includes("9999")));

  // Process: a real child over stdio, expected stop and unexpected death.
  const fakeCli = path.join(root, "fake-kimi-acp.mjs");
  await writeFile(
    fakeCli,
    [
      'import { createInterface } from "node:readline";',
      'process.stderr.write("fake kimi stderr");',
      "const rl = createInterface({ input: process.stdin });",
      'rl.on("line", (line) => {',
      "  const message = JSON.parse(line);",
      '  if (message.method === "initialize") {',
      "    process.stdout.write(",
      '      JSON.stringify({ id: message.id, jsonrpc: "2.0", result: { protocolVersion: 1 } }) + "\\n"',
      "    );",
      "  }",
      '  if (message.method === "harness/exit") {',
      "    process.exit(7);",
      "  }",
      "});",
    ].join("\n"),
    "utf8"
  );

  const exits = [];
  const channel = new KimiAcpSessionProcess({
    command: process.execPath,
    commandArgs: [fakeCli],
    cwd: root,
    onExit: (exit) => exits.push(exit),
    requestTimeoutMs: 5000,
  });
  assert.deepEqual(
    await channel.request("initialize", { protocolVersion: 1 }),
    {
      protocolVersion: 1,
    }
  );
  assert.equal(channel.isRunning, true);
  await channel.stop();
  assert.equal(channel.isRunning, false);
  assert.equal(exits[0].expected, true);

  const dying = new KimiAcpSessionProcess({
    command: process.execPath,
    commandArgs: [fakeCli],
    cwd: root,
    onExit: (exit) => exits.push(exit),
  });
  await assert.rejects(
    dying.request("harness/exit"),
    contracts.KimiAcpChannelClosedError
  );
  assert.equal(exits[1].expected, false);
  assert.equal(exits[1].code, 7);
  assert.match(exits[1].stderr, /fake kimi stderr/u);

  console.log("kimi acp session transport tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
