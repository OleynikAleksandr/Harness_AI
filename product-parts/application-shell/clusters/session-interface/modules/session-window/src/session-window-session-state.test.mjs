import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./session-window-session-state.ts", import.meta.url),
  "utf8"
);
const facadeSource = readFileSync(
  new URL("./session-window-facade.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /useSessionWindowSessionState/u);
assert.match(source, /window\.harnessCore\?\.getSessionEvents/u);
assert.match(source, /window\.harnessCore\?\.listSessions/u);
assert.match(source, /applyCoreEvent\(\{/u);
assert.match(source, /appendAssistantNotice/u);
assert.match(source, /setActiveSessionId/u);
assert.match(source, /setMessagesBySession/u);
assert.match(source, /setTelemetryBySession/u);
assert.match(source, /setRunningSessionId/u);
assert.match(source, /setRollbackSessionId/u);
assert.match(facadeSource, /useSessionWindowSessionState\(\{/u);
