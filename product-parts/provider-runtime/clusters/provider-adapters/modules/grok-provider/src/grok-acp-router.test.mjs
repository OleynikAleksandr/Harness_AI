import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-acp-router-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of ["grok-acp-contracts.ts", "grok-acp-router.ts"]) {
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
  const {
    GrokAcpProtocolError,
    GrokAcpRequestCancelledError,
    GrokAcpRequestTimeoutError,
  } = await import(
    pathToFileURL(path.join(buildDir, "grok-acp-contracts.js")).href
  );
  const { GrokAcpRouter } = await import(
    pathToFileURL(path.join(buildDir, "grok-acp-router.js")).href
  );

  const sent = [];
  const notifications = [];
  const protocolErrors = [];
  const router = new GrokAcpRouter({
    onNotification: (notification) => notifications.push(notification),
    onProtocolError: (error) => protocolErrors.push(error),
    onReverseRequest: ({ method, params }) => ({ method, params }),
    requestTimeoutMs: 100,
    sendLine: (line) => sent.push(JSON.parse(line)),
  });

  const request = router.request("session/new", { cwd: "/workspace" });
  assert.equal(router.pendingRequestCount, 1);
  const requestId = sent.at(-1).id;
  router.handleLine(
    JSON.stringify({
      id: requestId,
      jsonrpc: "2.0",
      result: { sessionId: "s1" },
    })
  );
  assert.deepEqual(await request, { sessionId: "s1" });
  assert.equal(router.pendingRequestCount, 0);

  const failed = router.request("session/prompt", {});
  const failedId = sent.at(-1).id;
  router.handleLine(
    JSON.stringify({
      error: {
        code: -32_000,
        data: { detail: true },
        message: "prompt failed",
      },
      id: failedId,
      jsonrpc: "2.0",
    })
  );
  await assert.rejects(failed, (error) => {
    assert.ok(error instanceof GrokAcpProtocolError);
    assert.equal(error.code, -32_000);
    assert.deepEqual(error.data, { detail: true });
    return true;
  });

  router.handleLine(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId: "s1" },
    })
  );
  assert.deepEqual(notifications, [
    { method: "session/update", params: { sessionId: "s1" } },
  ]);

  router.handleLine(
    JSON.stringify({
      id: 42,
      jsonrpc: "2.0",
      method: "session/request_permission",
      params: { options: [] },
    })
  );
  await waitFor(() => sent.some((message) => message.id === 42));
  assert.deepEqual(sent.find((message) => message.id === 42).result, {
    method: "session/request_permission",
    params: { options: [] },
  });

  const abortController = new AbortController();
  const cancelled = router.request(
    "session/prompt",
    {},
    {
      signal: abortController.signal,
    }
  );
  const cancelledId = sent.at(-1).id;
  abortController.abort();
  await assert.rejects(cancelled, GrokAcpRequestCancelledError);
  await waitFor(() =>
    sent.some(
      (message) =>
        message.method === "$/cancelRequest" &&
        message.params.id === cancelledId
    )
  );

  await assert.rejects(
    router.request("slow", undefined, { timeoutMs: 5 }),
    GrokAcpRequestTimeoutError
  );

  const orphan = router.request("session/load", {});
  router.rejectAll(new Error("process exited"));
  await assert.rejects(orphan, /process exited/u);
  assert.equal(router.pendingRequestCount, 0);

  router.handleLine("not-json");
  router.handleLine(JSON.stringify({ unknown: true }));
  assert.equal(protocolErrors.length, 2);

  const unhandledSent = [];
  const unhandled = new GrokAcpRouter({
    sendLine: (line) => unhandledSent.push(JSON.parse(line)),
  });
  unhandled.handleLine(
    JSON.stringify({ id: "reverse-1", method: "unsupported", params: {} })
  );
  await waitFor(() => unhandledSent.length === 1);
  assert.equal(unhandledSent[0].error.code, -32_601);

  console.log("grok-acp-router tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("Timed out waiting for Grok ACP router state.");
}
