import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compile = (specifier) => {
  const source = readFileSync(new URL(specifier, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
};

const toDataUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

const snapshotUrl = toDataUrl(compile("./claude-token-usage-snapshot.ts"));
const emitterSource = compile("./claude-live-usage-emitter.ts").replaceAll(
  "./claude-token-usage-snapshot.js",
  snapshotUrl
);
const { ClaudeLiveUsageEmitter } = await import(toDataUrl(emitterSource));

const events = [];
const session = {
  sessionId: "core-session",
  sdkUsage: undefined,
  eventEmitter: {
    emit: (_name, payload) => {
      events.push(payload);
    },
  },
};
const emitter = new ClaudeLiveUsageEmitter({ providerId: "claude" });

// No SDK usage yet (before the first assistant message) -> nothing to emit.
emitter.emitIfChanged(session, { session_id: "prov-1", type: "assistant" });
assert.equal(events.length, 0);

// First API call of the turn: emit the full live snapshot mid-turn.
session.sdkUsage = {
  cacheCreationInputTokens: 300,
  cacheReadInputTokens: 27_000,
  contextWindow: 200_000,
  inputTokens: 10,
  outputTokens: 40,
};
emitter.emitIfChanged(session, { session_id: "prov-1", type: "assistant" });
assert.equal(events.length, 1);
assert.equal(events[0].type, "stream_event");
assert.equal(events[0].claudeSessionId, "prov-1");
assert.deepEqual(events[0].data, {
  kind: "token_usage",
  used: 27_310,
  limit: 200_000,
  cached: 27_000,
});
assert.deepEqual(events[0].tokenUsage, {
  cached: 27_000,
  limit: 200_000,
  used: 27_310,
});

// Same snapshot again (duplicate assistant message) -> deduped, no event.
emitter.emitIfChanged(session, { session_id: "prov-1", type: "assistant" });
assert.equal(events.length, 1);

// Next API call in the same turn -> a fresh event with the new figures.
session.sdkUsage = {
  ...session.sdkUsage,
  cacheCreationInputTokens: 150,
  cacheReadInputTokens: 27_300,
};
emitter.emitIfChanged(session, { session_id: "prov-1", type: "assistant" });
assert.equal(events.length, 2);
assert.equal(events[1].data.cached, 27_300);
assert.equal(events[1].data.used, 27_460);

// Temp provider sessions never emit (no real session id yet).
emitter.emitIfChanged(
  { ...session, sessionId: "temp_123" },
  { type: "assistant" }
);
assert.equal(events.length, 2);

// Fallback to session.sessionId when the message carries no session_id.
session.sdkUsage = { ...session.sdkUsage, inputTokens: 25 };
emitter.emitIfChanged(session, { type: "assistant" });
assert.equal(events.length, 3);
assert.equal(events[2].claudeSessionId, "core-session");

console.log("claude-live-usage-emitter tests passed");
