import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-semantic-buffer-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-semantic-stream-buffer.ts",
  ]) {
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
  const { GrokSemanticStreamBuffer, isGrokReplayNotification } = await import(
    pathToFileURL(path.join(buildDir, "grok-semantic-stream-buffer.js")).href
  );

  const buffer = new GrokSemanticStreamBuffer();
  buffer.startTurn("s1");
  const chunks = ["The", " user", " requested", " one", " word", "."];
  const emitted = chunks.flatMap((text) =>
    buffer.append({ promptId: "p1", sessionId: "s1", text })
  );
  assert.deepEqual(emitted, [
    {
      id: "grok:s1:p1:thinking:0",
      text: "The user requested one word.",
    },
  ]);

  assert.deepEqual(
    buffer.append({ promptId: "p1", sessionId: "s1", text: "Partial block" }),
    []
  );
  assert.deepEqual(buffer.flush("s1"), [
    {
      id: "grok:s1:p1:thinking:1",
      text: "Partial block",
    },
  ]);

  buffer.startTurn("s2");
  buffer.append({ promptId: "first", sessionId: "s2", text: "First phase" });
  const promptBoundary = buffer.append({
    promptId: "second",
    sessionId: "s2",
    text: "Second phase.",
  });
  assert.deepEqual(
    promptBoundary.map((block) => block.text),
    ["First phase", "Second phase."]
  );

  assert.equal(
    isGrokReplayNotification({
      method: "session/update",
      params: {
        _meta: { isReplay: true },
        sessionId: "s1",
        update: { sessionUpdate: "agent_message_chunk" },
      },
    }),
    true
  );
  assert.equal(
    isGrokReplayNotification({
      method: "_x.ai/session_notification",
      params: {
        method: "x.ai/session_notification",
        params: { _meta: { isReplay: true }, sessionId: "s1" },
      },
    }),
    true
  );

  console.log("grok-semantic-stream-buffer tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
