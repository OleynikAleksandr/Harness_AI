import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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

const secondStream = new SessionEventStreamFacade();
secondStream.configureSessionHistory([session]);

assert.equal(secondStream.listEvents(session.id).length, 3);
assert.equal(secondStream.listEvents(session.id)[0].type, "session:message");
assert.equal(
  secondStream.latestTelemetryBySession().get(session.id)?.tokenUsage?.used,
  40
);

rmSync(workspacePath, { force: true, recursive: true });
