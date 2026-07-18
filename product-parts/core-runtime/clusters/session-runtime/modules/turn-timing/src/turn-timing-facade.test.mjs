import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./turn-timing-facade.ts", import.meta.url),
  "utf8"
);
// The facade imports only a type from session-event-stream, which is erased
// at transpile time, so the compiled output has no runtime imports.
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { deriveTurnTiming } = await import(moduleUrl);

const SESSION = "s1";

function turnState(state, timestamp, sessionId = SESSION) {
  return {
    payload: { sessionId, state },
    timestamp,
    type: "session:turn-state",
  };
}

function messageEvent(sessionId = SESSION) {
  return {
    payload: {
      id: "m1",
      role: "assistant",
      sessionId,
      text: "hello",
      timestamp: "2026-07-18T10:00:00.000Z",
    },
    timestamp: "2026-07-18T10:00:00.000Z",
    type: "session:message",
  };
}

// Empty log: no active time, no open turn.
assert.deepEqual(deriveTurnTiming([], SESSION), {
  activeMs: 0,
  runningSince: null,
});

// One closed running->idle pair accumulates its duration.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("idle", "2026-07-18T10:00:05.000Z"),
    ],
    SESSION
  ),
  { activeMs: 5000, runningSince: null }
);

// Repeated running events extend the same turn; the FIRST running starts it
// (sendMessage publishes running, then turn_started republishes running).
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("running", "2026-07-18T10:00:02.000Z"),
      turnState("idle", "2026-07-18T10:00:09.000Z"),
    ],
    SESSION
  ),
  { activeMs: 9000, runningSince: null }
);

// Multiple closed turns sum into activeMs.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("idle", "2026-07-18T10:00:05.000Z"),
      turnState("running", "2026-07-18T10:01:00.000Z"),
      turnState("idle", "2026-07-18T10:01:30.000Z"),
    ],
    SESSION
  ),
  { activeMs: 35_000, runningSince: null }
);

// A trailing unclosed running is an open turn (live or orphaned from a
// previous app run): runningSince is reported, activeMs excludes it.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("idle", "2026-07-18T10:00:05.000Z"),
      turnState("running", "2026-07-18T10:05:00.000Z"),
    ],
    SESSION
  ),
  { activeMs: 5000, runningSince: "2026-07-18T10:05:00.000Z" }
);

// running -> idle -> running -> running: the second series stays open from
// its first running.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("idle", "2026-07-18T10:00:04.000Z"),
      turnState("running", "2026-07-18T10:02:00.000Z"),
      turnState("running", "2026-07-18T10:02:03.000Z"),
    ],
    SESSION
  ),
  { activeMs: 4000, runningSince: "2026-07-18T10:02:00.000Z" }
);

// Events of other sessions are ignored.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z", "other"),
      turnState("idle", "2026-07-18T10:00:09.000Z", "other"),
      turnState("running", "2026-07-18T10:00:00.000Z"),
      turnState("idle", "2026-07-18T10:00:02.000Z"),
    ],
    SESSION
  ),
  { activeMs: 2000, runningSince: null }
);

// Non-turn-state events are ignored, even while a turn is open.
assert.deepEqual(
  deriveTurnTiming(
    [
      turnState("running", "2026-07-18T10:00:00.000Z"),
      messageEvent(),
      turnState("idle", "2026-07-18T10:00:07.000Z"),
    ],
    SESSION
  ),
  { activeMs: 7000, runningSince: null }
);

console.log("turn-timing-facade tests passed");
