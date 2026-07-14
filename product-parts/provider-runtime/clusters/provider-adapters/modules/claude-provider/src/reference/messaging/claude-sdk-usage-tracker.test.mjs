import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-sdk-usage-tracker.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ClaudeSdkUsageTracker } = await import(moduleUrl);

const assistantMessage = (id, usage) => ({
  type: "assistant",
  message: { id, usage },
});

const resultMessage = (modelUsage) => ({
  type: "result",
  modelUsage,
});

// First assistant message of a session populates the last-call snapshot;
// contextWindow stays null until a result message reports it.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", {
      input_tokens: 100,
      cache_read_input_tokens: 19_013,
      cache_creation_input_tokens: 8267,
      output_tokens: 42,
    })
  );
  assert.deepEqual(session.sdkUsage, {
    inputTokens: 100,
    cacheReadInputTokens: 19_013,
    cacheCreationInputTokens: 8267,
    contextWindow: null,
    outputTokens: 42,
  });
}

// A later assistant message with a new message id replaces the snapshot
// with the latest API call's usage (not a running sum).
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", {
      input_tokens: 100,
      cache_read_input_tokens: 19_013,
      cache_creation_input_tokens: 8267,
      output_tokens: 42,
    })
  );
  tracker.recordMessage(
    session,
    assistantMessage("msg_2", {
      input_tokens: 113,
      cache_read_input_tokens: 27_280,
      cache_creation_input_tokens: 0,
      output_tokens: 58,
    })
  );
  assert.equal(session.sdkUsage.inputTokens, 113);
  assert.equal(session.sdkUsage.cacheReadInputTokens, 27_280);
  assert.equal(session.sdkUsage.cacheCreationInputTokens, 0);
  assert.equal(session.sdkUsage.outputTokens, 58);
}

// Duplicate assistant messages sharing one message id (parallel tool_use
// content blocks) do not reprocess past the first occurrence.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", {
      input_tokens: 100,
      cache_read_input_tokens: 500,
      cache_creation_input_tokens: 0,
      output_tokens: 10,
    })
  );
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", {
      input_tokens: 999,
      cache_read_input_tokens: 999,
      cache_creation_input_tokens: 999,
      output_tokens: 999,
    })
  );
  assert.equal(session.sdkUsage.inputTokens, 100);
  assert.equal(session.sdkUsage.cacheReadInputTokens, 500);
}

// A result message's modelUsage.contextWindow merges into the existing
// snapshot without disturbing the token counts from the last assistant call.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", {
      input_tokens: 100,
      cache_read_input_tokens: 500,
      cache_creation_input_tokens: 0,
      output_tokens: 10,
    })
  );
  tracker.recordMessage(
    session,
    resultMessage({
      "claude-sonnet-5": { contextWindow: 200_000, costUSD: 0.12 },
    })
  );
  assert.equal(session.sdkUsage.contextWindow, 200_000);
  assert.equal(session.sdkUsage.inputTokens, 100);
}

// A result message arriving without any prior assistant usage this session
// does not fabricate a snapshot.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    resultMessage({ "claude-sonnet-5": { contextWindow: 200_000 } })
  );
  assert.equal(session.sdkUsage, undefined);
}

// Message types other than assistant/result are ignored.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(session, { type: "stream_event", event: {} });
  assert.equal(session.sdkUsage, undefined);
}

// Missing or malformed usage payloads leave the snapshot untouched instead
// of throwing.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(session, { type: "assistant", message: {} });
  tracker.recordMessage(session, {
    type: "assistant",
    message: { id: "msg_1", usage: "not-a-record" },
  });
  assert.equal(session.sdkUsage, undefined);
}

// Missing individual token fields default to zero rather than NaN/undefined.
{
  const tracker = new ClaudeSdkUsageTracker();
  const session = {};
  tracker.recordMessage(
    session,
    assistantMessage("msg_1", { input_tokens: 5 })
  );
  assert.deepEqual(session.sdkUsage, {
    inputTokens: 5,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    contextWindow: null,
    outputTokens: 0,
  });
}

// Two sessions are tracked independently by object identity.
{
  const tracker = new ClaudeSdkUsageTracker();
  const sessionA = {};
  const sessionB = {};
  tracker.recordMessage(
    sessionA,
    assistantMessage("msg_a", { input_tokens: 1 })
  );
  tracker.recordMessage(
    sessionB,
    assistantMessage("msg_b", { input_tokens: 2 })
  );
  assert.equal(sessionA.sdkUsage.inputTokens, 1);
  assert.equal(sessionB.sdkUsage.inputTokens, 2);
}

console.log("claude-sdk-usage-tracker tests passed");
