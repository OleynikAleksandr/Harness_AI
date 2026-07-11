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
assert.match(source, /setSubagentCallsBySession/u);
assert.match(source, /setRunningSessionId/u);
assert.match(source, /setRollbackSessionId/u);
assert.match(source, /refreshSessionList/u);
assert.match(source, /candidate\.id !== session\.id/u);
assert.match(source, /window\.harnessCore\?\.renameSession/u);
assert.match(source, /window\.harnessCore\?\.regenerateSessionTitle/u);
assert.match(facadeSource, /useSessionWindowSessionState\(\{/u);
assert.match(facadeSource, /event\.type === "session:created"/u);
assert.match(facadeSource, /event\.type === "session:updated"/u);
assert.match(facadeSource, /<SubagentSessionHeader/u);
assert.match(facadeSource, /isSubagentSession \? null/u);
assert.match(facadeSource, /onOpenSubagent=\{selectSession\}/u);
assert.match(facadeSource, /onDetachSubagent=\{detachSession\}/u);
assert.match(facadeSource, /onRenameSession=\{renameSession\}/u);
assert.match(
  facadeSource,
  /onRegenerateSessionTitle=\{regenerateSessionTitle\}/u
);
assert.equal(facadeSource.split("\n").length <= 500, true);
