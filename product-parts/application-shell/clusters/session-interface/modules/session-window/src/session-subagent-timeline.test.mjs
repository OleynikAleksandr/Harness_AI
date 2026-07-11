import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const timelineSource = readFileSync(
  new URL("./session-subagent-timeline.tsx", import.meta.url),
  "utf8"
);
const dialogSource = readFileSync(
  new URL("./session-dialog-panel.tsx", import.meta.url),
  "utf8"
);
const coreEventsSource = readFileSync(
  new URL("./session-window-core-events.ts", import.meta.url),
  "utf8"
);
const stylesSource = readFileSync(
  new URL("./session-window.css", import.meta.url),
  "utf8"
);

assert.match(timelineSource, /buildSessionTimeline/u);
assert.match(timelineSource, /timestamp: call\.createdAt/u);
assert.match(
  timelineSource,
  /left\.timestamp\.localeCompare\(right\.timestamp\)/u
);
assert.match(timelineSource, /call\.childSessionIds/u);
assert.match(timelineSource, /session\?\.delegatedTask/u);
assert.match(timelineSource, /session\?\.agentNickname/u);
assert.match(timelineSource, /session\?\.agentRole/u);
assert.match(timelineSource, /session\?\.model \?\? call\.model/u);
assert.match(
  timelineSource,
  /session\?\.reasoningEffort \?\? call\.reasoningEffort/u
);
assert.match(timelineSource, /onOpenSubagent\(sessionId\)/u);
assert.match(timelineSource, /onDetachSubagent\(sessionId\)/u);
assert.match(timelineSource, /<ExternalLink/u);
assert.doesNotMatch(timelineSource, /message\.text\.includes/u);
assert.doesNotMatch(timelineSource, /rollout/u);

assert.match(
  dialogSource,
  /buildSessionTimeline\(displayMessages, subagentCalls\)/u
);
assert.match(dialogSource, /<SubagentCallTimelineItem/u);
assert.match(dialogSource, /item\.kind === "message"/u);
assert.match(coreEventsSource, /event\.type === "session:subagent-call"/u);
assert.match(coreEventsSource, /upsertSubagentCallToState/u);
assert.match(coreEventsSource, /candidate\.id === call\.id/u);
assert.equal(timelineSource.split("\n").length <= 500, true);
assert.equal(dialogSource.split("\n").length <= 500, true);
assert.match(stylesSource, /\.session-sidebar \{[\s\S]*resize: horizontal/u);
assert.match(stylesSource, /\.session-tree-children/u);
assert.match(stylesSource, /\.session-subagent-call__list/u);
assert.match(stylesSource, /\.session-reference-shell--subagent/u);
assert.match(stylesSource, /\.session-rename-dialog/u);
