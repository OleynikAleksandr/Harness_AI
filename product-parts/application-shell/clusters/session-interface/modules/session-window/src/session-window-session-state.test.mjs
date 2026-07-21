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
const surfaceSource = readFileSync(
  new URL(
    "../../session-surface/src/session-surface-facade.tsx",
    import.meta.url
  ),
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
assert.match(source, /setRunningSessionIds/u);
assert.match(source, /runningSessionIds\.has\(activeSessionDataId\)/u);
assert.match(source, /setRollbackSessionId/u);
assert.match(source, /refreshSessionList/u);
assert.match(source, /sessionListWorkspaceIdRef/u);
assert.match(source, /sessionListWorkspaceIdRef\.current !== workspaceId/u);
assert.match(source, /candidate\.id !== session\.id/u);
assert.match(source, /window\.harnessCore\?\.renameSession/u);
assert.match(source, /window\.harnessCore\?\.regenerateSessionTitle/u);
assert.match(facadeSource, /useSessionWindowSessionState\(\{/u);
assert.match(facadeSource, /event\.type === "session:created"/u);
assert.match(facadeSource, /event\.type === "session:updated"/u);
assert.match(facadeSource, /applicationModeRef\.current === "studio"/u);
assert.match(
  facadeSource,
  /applicationModeRef\.current = "studio";\s+await refreshSessions\("profile-studio"\)/u
);
assert.match(surfaceSource, /<SubagentSessionHeader/u);
assert.match(surfaceSource, /isSubagentSession \? null/u);
// The dialog card is informational only; open/detach controls live in the
// sidebar tree (docs/architecture/ClaudeSubagentSessions.md, section 5).
assert.doesNotMatch(facadeSource, /onOpenSubagent/u);
assert.doesNotMatch(facadeSource, /onDetachSubagent/u);
assert.match(facadeSource, /onDetachSession=\{detachSession\}/u);
assert.match(facadeSource, /onSelectSession=\{selectSession\}/u);
assert.match(facadeSource, /onRenameSession=\{renameSession\}/u);
assert.match(
  facadeSource,
  /onRegenerateSessionTitle=\{regenerateSessionTitle\}/u
);
assert.equal(facadeSource.split("\n").length <= 500, true);

const coreEventsSource = readFileSync(
  new URL("./session-window-core-events.ts", import.meta.url),
  "utf8"
);
assert.match(coreEventsSource, /const next = new Set\(current\)/u);
assert.match(coreEventsSource, /next\.add\(event\.payload\.sessionId\)/u);
assert.match(coreEventsSource, /next\.delete\(event\.payload\.sessionId\)/u);
assert.doesNotMatch(coreEventsSource, /return event\.payload\.sessionId/u);
