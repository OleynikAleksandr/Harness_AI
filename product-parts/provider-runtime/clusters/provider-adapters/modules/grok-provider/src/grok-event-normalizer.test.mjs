import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = await mkdtemp(path.join(tmpdir(), "grok-event-normalizer-"));

try {
  const buildDir = path.join(root, "build");
  await mkdir(buildDir, { recursive: true });
  for (const filename of [
    "grok-acp-contracts.ts",
    "grok-event-normalizer.ts",
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
  const { GrokEventNormalizer } = await import(
    pathToFileURL(path.join(buildDir, "grok-event-normalizer.js")).href
  );
  const normalizer = new GrokEventNormalizer();
  const notification = (update, method = "session/update") => ({
    method,
    params: { sessionId: "s1", update },
  });

  const assistant = normalizer.normalizeNotification(
    notification({
      content: { text: "Hello", type: "text" },
      sessionUpdate: "agent_message_chunk",
    })
  );
  assert.equal(assistant[0].type, "assistant");
  assert.equal(assistant[0].content, "Hello");
  assert.equal(assistant[0].tag, "live");

  const thinking = normalizer.normalizeNotification(
    notification({
      content: { text: "Reason", type: "text" },
      sessionUpdate: "agent_thought_chunk",
    })
  );
  assert.equal(thinking[0].type, "thinking");
  assert.equal(thinking[0].tag, "thinking");

  const tool = normalizer.normalizeNotification(
    notification({
      sessionUpdate: "tool_call",
      status: "in_progress",
      title: "Read file",
      toolCallId: "tool-1",
    })
  );
  assert.equal(tool[0].data.kind, "tool_call");
  assert.equal(tool[0].data.toolCallId, "tool-1");

  const plan = normalizer.normalizeNotification(
    notification({
      entries: [{ content: "Test", status: "pending" }],
      sessionUpdate: "plan",
    })
  );
  assert.equal(plan[0].data.kind, "plan");
  assert.equal(plan[0].data.entries.length, 1);

  const usage = normalizer.normalizeNotification(
    notification({
      cachedReadTokens: 128,
      sessionUpdate: "usage_update",
      size: 500_000,
      used: 25_000,
    })
  );
  assert.deepEqual(usage[0].data.tokenUsage, {
    cached: 128,
    limit: 500_000,
    used: 25_000,
  });
  assert.equal(usage[0].data.contextUsage, 0.05);

  const nested = normalizer.normalizeNotification({
    method: "_x.ai/session_notification",
    params: {
      method: "x.ai/session_notification",
      params: {
        sessionId: "s1",
        update: {
          message: "bad token",
          sessionUpdate: "retry_state",
          type: "failed",
        },
      },
    },
  });
  assert.equal(nested[0].type, "turn_failed");
  assert.equal(nested[0].message, "bad token");

  const completed = normalizer.normalizePromptResult("s1", {
    _meta: { cachedReadTokens: 64, modelId: "grok-4.5", totalTokens: 1234 },
  });
  assert.equal(completed.type, "turn_completed");
  assert.deepEqual(completed.tokenUsage, {
    cached: 64,
    limit: 0,
    used: 1234,
  });
  assert.equal(normalizer.turnStarted("s1").type, "turn_started");
  assert.equal(
    normalizer.normalizePromptFailure("s1", new Error("network failed"))
      .message,
    "network failed"
  );

  const unknown = normalizer.normalizeNotification({
    method: "custom/event",
    params: { text: "<thinking>not classified</thinking>" },
  });
  assert.equal(unknown[0].type, "grok_acp_event");

  console.log("grok-event-normalizer tests passed");
} finally {
  await rm(root, { force: true, recursive: true });
}
