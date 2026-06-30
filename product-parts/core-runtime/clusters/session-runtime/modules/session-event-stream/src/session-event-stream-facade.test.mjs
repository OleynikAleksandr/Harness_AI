import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-event-stream-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { SessionEventStreamFacade } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-session-history-"));
const session = { id: "session-test", workspacePath };
const firstStream = new SessionEventStreamFacade();
firstStream.rememberSession(session);
firstStream.publish({
  payload: {
    id: "message-test",
    role: "user",
    sessionId: session.id,
    text: "hello",
    timestamp: "2026-06-27T00:00:00.000Z",
  },
  timestamp: "2026-06-27T00:00:00.000Z",
  type: "session:message",
});
firstStream.publish({
  payload: {
    sessionId: session.id,
    telemetry: {
      model: "test-model",
      provider: "Test",
      providerId: "codex",
      status: "idle",
      tokenUsage: {
        contextWindow: 100,
        remaining: 75,
        used: 25,
      },
      updatedAt: "2026-06-27T00:00:01.000Z",
    },
  },
  timestamp: "2026-06-27T00:00:01.000Z",
  type: "session:telemetry",
});
firstStream.publish({
  payload: {
    sessionId: session.id,
    telemetry: {
      model: "test-model",
      provider: "Test",
      providerId: "codex",
      status: "idle",
      tokenUsage: {
        contextWindow: 100,
        remaining: 60,
        used: 40,
      },
      updatedAt: "2026-06-27T00:00:02.000Z",
    },
  },
  timestamp: "2026-06-27T00:00:02.000Z",
  type: "session:telemetry",
});
firstStream.publish({
  payload: {
    id: "live-1",
    localizedContent: "Привет",
    role: "assistant",
    sessionId: session.id,
    tag: "live",
    text: "Привет",
    timestamp: "2026-06-27T00:00:03.000Z",
    translationState: "pending",
  },
  timestamp: "2026-06-27T00:00:03.000Z",
  type: "session:message",
});
firstStream.publish({
  payload: {
    id: "live-2",
    localizedContent: ", мир.",
    role: "assistant",
    sessionId: session.id,
    tag: "live",
    text: ", мир.",
    timestamp: "2026-06-27T00:00:04.000Z",
  },
  timestamp: "2026-06-27T00:00:04.000Z",
  type: "session:message",
});
firstStream.publish({
  payload: {
    localizedContent: "Проверяю план.",
    messageId: "thinking-1",
    sessionId: session.id,
    sourceHash: "source-hash-1",
    targetLanguage: "ru",
  },
  timestamp: "2026-06-27T00:00:05.000Z",
  type: "session:message_translation",
});

const secondStream = new SessionEventStreamFacade();
secondStream.configureSessionHistory([session]);

assert.equal(secondStream.listEvents(session.id).length, 5);
assert.equal(secondStream.listEvents(session.id)[0].type, "session:message");
const liveMessage = secondStream
  .listEvents(session.id)
  .find(
    (event) => event.type === "session:message" && event.payload.tag === "live"
  );
assert.equal(liveMessage?.payload.text, "Привет, мир.");
assert.equal(liveMessage?.payload.localizedContent, "Привет, мир.");
assert.equal(liveMessage?.payload.translationState, "pending");
const translationPatch = secondStream
  .listEvents(session.id)
  .find((event) => event.type === "session:message_translation");
assert.equal(translationPatch?.payload.localizedContent, "Проверяю план.");
assert.equal(
  secondStream.latestTelemetryBySession().get(session.id)?.tokenUsage?.used,
  40
);

// deleteSessionEvents removes the file, clears in-memory events, and is idempotent.
const eventFile = join(
  workspacePath,
  ".harness",
  "sessions",
  "events",
  `${encodeURIComponent(session.id)}.jsonl`
);
assert.equal(existsSync(eventFile), true);
firstStream.deleteSessionEvents(session.id);
assert.equal(existsSync(eventFile), false);
assert.equal(firstStream.listEvents(session.id).length, 0);
firstStream.deleteSessionEvents(session.id);
firstStream.deleteSessionEvents("session-never-existed");

rmSync(workspacePath, { force: true, recursive: true });
