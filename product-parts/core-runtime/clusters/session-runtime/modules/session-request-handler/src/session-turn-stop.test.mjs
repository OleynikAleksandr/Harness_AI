import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "session-turn-stop-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "session-request-handler-runtime-utils.ts",
    "session-turn-stop.ts",
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
  const { SessionTurnStop } = await import(
    pathToFileURL(path.join(buildDir, "session-turn-stop.js")).href
  );

  const sessions = [
    { id: "parent", sessionKind: "primary" },
    {
      id: "child-running",
      parentSessionId: "parent",
      providerSessionId: "kimi-agent-c1",
      sessionKind: "subagent",
      subagentStatus: "running",
    },
    {
      id: "child-done",
      parentSessionId: "parent",
      providerSessionId: "kimi-agent-c2",
      sessionKind: "subagent",
      subagentStatus: "completed",
    },
    {
      id: "grandchild-pending",
      parentSessionId: "child-running",
      providerSessionId: "kimi-agent-c1:agent-0",
      sessionKind: "subagent",
      subagentStatus: "pending",
    },
    {
      id: "unrelated",
      parentSessionId: "other-parent",
      providerSessionId: "kimi-agent-x",
      sessionKind: "subagent",
      subagentStatus: "running",
    },
  ];
  const calls = { closed: [], deleted: [], idle: [], interrupted: [] };
  let unsubscribed = 0;
  const binding = {
    adapter: {
      closeSession: (providerSessionId) => {
        calls.closed.push(providerSessionId);
        return Promise.resolve();
      },
    },
    providerSessionId: "kimi-native-p1",
    unsubscribe: () => {
      unsubscribed += 1;
    },
  };
  const turnStop = new SessionTurnStop({
    deleteBinding: (sessionId) => calls.deleted.push(sessionId),
    getBinding: (sessionId) => (sessionId === "parent" ? binding : undefined),
    getSession: (sessionId) =>
      sessions.find((session) => session.id === sessionId),
    interruptSubagentChild: (childSessionId, event) =>
      calls.interrupted.push({ childSessionId, event }),
    listSessions: () => sessions,
    publishIdle: (sessionId) => calls.idle.push(sessionId),
  });

  assert.equal(turnStop.stop("missing").ok, false);

  const result = turnStop.stop("parent");
  assert.equal(result.ok, true);
  assert.equal(unsubscribed, 1);
  assert.deepEqual(calls.closed, ["kimi-native-p1"]);
  assert.deepEqual(calls.deleted, ["parent"]);
  assert.deepEqual(calls.idle, ["parent"]);

  // Only the still-running descendants of the stopped session settle as
  // interrupted; finished children and other sessions' trees stay untouched.
  assert.deepEqual(
    calls.interrupted.map((entry) => entry.childSessionId),
    ["child-running", "grandchild-pending"]
  );
  for (const entry of calls.interrupted) {
    assert.equal(entry.event.type, "subagent_status");
    assert.equal(entry.event.status, "interrupted");
  }
  assert.equal(calls.interrupted[0].event.providerSessionId, "kimi-agent-c1");
  assert.equal(
    calls.interrupted[1].event.providerSessionId,
    "kimi-agent-c1:agent-0"
  );

  console.log("session turn stop tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
